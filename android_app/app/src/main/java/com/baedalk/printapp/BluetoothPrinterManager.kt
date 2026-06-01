package com.baedalk.printapp

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
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

    fun printOrderReceipt(receiptText: String): Boolean {
        if (outputStream == null) return false
        return try {
            // ESC/POS 초기화
            outputStream?.write(byteArrayOf(0x1B, 0x40)) 
            
            // ★ 더블바이트 언어셋을 한국어(KSC5601)로 설정: FS C 3
            // (대부분의 중국산 프린터는 기본값이 중국어(0)이므로 한자로 깨짐)
            outputStream?.write(byteArrayOf(0x1C, 0x43, 0x03))
            
            // 아시아 언어(한글/한자) 더블바이트 모드 활성화 (FS &)
            outputStream?.write(byteArrayOf(0x1C, 0x26))
            
            // 좌측 정렬
            outputStream?.write(byteArrayOf(0x1B, 0x61, 0x00)) 
            
            // 인코딩을 확장 완성형(CP949)으로 변경 (EUC-KR보다 더 많은 한글 지원)
            val textBytes = receiptText.toByteArray(java.nio.charset.Charset.forName("CP949"))
            outputStream?.write(textBytes)
            
            // 여백 및 용지 컷팅
            outputStream?.write("\n\n\n\n\n\n".toByteArray(Charsets.US_ASCII))
            outputStream?.write(byteArrayOf(0x1D, 0x56, 0x41, 0x00))
            
            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "주문서 인쇄 실패", e)
            false
        }
    }
}
