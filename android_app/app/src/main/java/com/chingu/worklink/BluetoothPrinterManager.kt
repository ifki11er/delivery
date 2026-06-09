package com.chingu.worklink

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.util.Base64
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
        } finally {
            outputStream = null
            bluetoothSocket = null
        }
    }

    private fun ensureConnected(): Boolean {
        if (outputStream != null) return true
        if (!isBluetoothEnabled()) return false

        val prefs = context.getSharedPreferences("WorkLinkPrefs", Context.MODE_PRIVATE)
        val defaultPrinter = prefs.getString("default_printer", "") ?: ""
        if (defaultPrinter.isBlank()) return false

        return connectPrinter(defaultPrinter)
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

    private fun feedAndCut() {
        val stream = outputStream ?: return

        stream.write(byteArrayOf(0x1B, 0x64, 0x05))
        stream.flush()
        Thread.sleep(200)

        stream.write(byteArrayOf(0x1D, 0x56, 0x00))
        stream.flush()
        Thread.sleep(200)
    }
    fun printBitmapDataUrl(dataUrl: String): Boolean {
        if (!ensureConnected()) return false

        return try {
            val base64Part = dataUrl.substringAfter(",", dataUrl).trim()
            val bytes = Base64.decode(base64Part, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return false

            outputStream?.write(byteArrayOf(0x1B, 0x40))
            outputStream?.write(bitmapToEscPos(bitmap))
            feedAndCut()
            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "웹 렌더링 이미지 인쇄 실패", e)
            false
        }
    }
}
