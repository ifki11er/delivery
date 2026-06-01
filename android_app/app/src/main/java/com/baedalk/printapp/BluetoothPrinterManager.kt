package com.baedalk.printapp

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

@SuppressLint("MissingPermission")
class BluetoothPrinterManager(private val context: Context) {

    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    // 영수증 프린터 통신을 위한 표준 SPP (Serial Port Profile) UUID
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    fun isBluetoothEnabled(): Boolean {
        return bluetoothAdapter?.isEnabled == true
    }

    fun getPairedPrinters(): List<Map<String, String>> {
        val printers = mutableListOf<Map<String, String>>()
        try {
            val pairedDevices: Set<BluetoothDevice>? = bluetoothAdapter?.bondedDevices
            pairedDevices?.forEach { device ->
                printers.add(mapOf("name" to (device.name ?: "Unknown"), "mac" to device.address))
            }
        } catch (e: SecurityException) {
            Log.e("BluetoothPrinter", "블루투스 권한이 아직 허용되지 않았습니다.", e)
        }
        return printers
    }

    fun connectPrinter(macAddress: String): Boolean {
        return try {
            val device = bluetoothAdapter?.getRemoteDevice(macAddress)
            bluetoothSocket = device?.createRfcommSocketToServiceRecord(SPP_UUID)
            bluetoothAdapter?.cancelDiscovery()
            bluetoothSocket?.connect()
            outputStream = bluetoothSocket?.outputStream
            Log.d("BluetoothPrinter", "프린터 연결 성공: $macAddress")
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "프린터 연결 실패", e)
            disconnect()
            false
        }
    }

    fun disconnect() {
        try {
            outputStream?.close()
            bluetoothSocket?.close()
        } catch (e: IOException) {
            Log.e("BluetoothPrinter", "연결 해제 중 오류", e)
        }
    }

    fun printTestReceipt(): Boolean {
        if (outputStream == null) return false
        return try {
            // ESC/POS 초기화 (Initialize Printer)
            outputStream?.write(byteArrayOf(0x1B, 0x40)) 
            
            // 가운데 정렬 (Align Center)
            outputStream?.write(byteArrayOf(0x1B, 0x61, 0x01)) 
            
            val text = "\n\n=== Baedalk Print Test ===\n\nHPRT TP80N-M\nConnection Success!\n\n\n\n\n\n"
            // 일단 영어로 먼저 테스트 (한글은 추후 EUC-KR 설정 필요)
            outputStream?.write(text.toByteArray(Charsets.US_ASCII))
            
            // 용지 컷팅 (Cut Paper)
            outputStream?.write(byteArrayOf(0x1D, 0x56, 0x41, 0x00))
            
            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "인쇄 실패", e)
            false
        }
    }

    private fun textToBitmap(text: String): Bitmap {
        val width = 576 // 80mm 프린터 표준 픽셀 넓이
        val textPaint = TextPaint().apply {
            color = Color.BLACK
            textSize = 28f // 폰트 크기
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            isAntiAlias = true
        }

        // 텍스트를 줄바꿈 처리를 위해 StaticLayout 사용
        val staticLayout = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            StaticLayout.Builder.obtain(text, 0, text.length, textPaint, width - 20)
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setLineSpacing(0f, 1.2f)
                .setIncludePad(false)
                .build()
        } else {
            @Suppress("DEPRECATION")
            StaticLayout(text, textPaint, width - 20, Layout.Alignment.ALIGN_NORMAL, 1.2f, 0f, false)
        }

        val height = staticLayout.height + 40
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE) // 배경은 흰색
        
        canvas.translate(10f, 20f) // 좌상단 약간의 여백
        staticLayout.draw(canvas)

        return bitmap
    }

    private fun bitmapToEscPos(bitmap: Bitmap): ByteArray {
        val width = bitmap.width
        val height = bitmap.height
        
        val xL = ((width + 7) / 8) % 256
        val xH = ((width + 7) / 8) / 256
        val yL = height % 256
        val yH = height / 256
        
        val widthBytes = (width + 7) / 8
        val dataSize = widthBytes * height
        
        val command = ByteArray(8 + dataSize)
        // GS v 0 (Raster Bit Image)
        command[0] = 0x1D
        command[1] = 0x76
        command[2] = 0x30
        command[3] = 0x00 // Normal mode
        command[4] = xL.toByte()
        command[5] = xH.toByte()
        command[6] = yL.toByte()
        command[7] = yH.toByte()
        
        var index = 8
        for (y in 0 until height) {
            for (x in 0 until width step 8) {
                var b = 0
                for (k in 0..7) {
                    if (x + k < width) {
                        val pixel = bitmap.getPixel(x + k, y)
                        val r = Color.red(pixel)
                        val g = Color.green(pixel)
                        val bCol = Color.blue(pixel)
                        val luminance = (r * 0.299 + g * 0.587 + bCol * 0.114).toInt()
                        if (luminance < 128) { // 어두우면 점을 찍음
                            b = b or (1 shl (7 - k))
                        }
                    }
                }
                command[index++] = b.toByte()
            }
        }
        return command
    }

    fun printOrderReceipt(receiptText: String): Boolean {
        if (outputStream == null) return false
        return try {
            // ESC/POS 초기화
            outputStream?.write(byteArrayOf(0x1B, 0x40)) 
            
            // 텍스트를 안드로이드 캔버스로 그려서 이미지(Bitmap)로 변환
            val bitmap = textToBitmap(receiptText)
            
            // 이미지를 ESC/POS 흑백 픽셀 명령어로 변환하여 전송
            val imageCommand = bitmapToEscPos(bitmap)
            outputStream?.write(imageCommand)
            
            // 여백 및 용지 컷팅
            outputStream?.write("\n\n\n\n".toByteArray(Charsets.US_ASCII))
            outputStream?.write(byteArrayOf(0x1D, 0x56, 0x41, 0x00))
            
            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "이미지 영수증 인쇄 실패", e)
            false
        }
    }
}
