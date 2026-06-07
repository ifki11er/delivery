package com.baedalk.printapp

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

class SharePrintActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var statusText: TextView
    private lateinit var retryButton: Button
    private lateinit var closeButton: Button
    private var sharedText: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sharedText = extractSharedText(intent)
        renderPrintingUi()

        if (sharedText.isBlank()) {
            showFailure("공유된 주문 텍스트가 없습니다.")
            return
        }

        if (!hasBluetoothPermission()) {
            requestBluetoothPermission()
            return
        }

        printSharedOrder()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        sharedText = extractSharedText(intent)
        printSharedOrder()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_BLUETOOTH && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            printSharedOrder()
        } else {
            showFailure("블루투스 권한이 필요합니다.")
        }
    }

    private fun renderPrintingUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
        }

        val progress = ProgressBar(this).apply {
            isIndeterminate = true
        }

        statusText = TextView(this).apply {
            text = "출력중..."
            textSize = 22f
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 24)
        }

        retryButton = Button(this).apply {
            text = "다시 시도"
            visibility = View.GONE
            setOnClickListener {
                visibility = View.GONE
                closeButton.visibility = View.GONE
                statusText.text = "출력중..."
                printSharedOrder()
            }
        }

        closeButton = Button(this).apply {
            text = "닫기"
            visibility = View.GONE
            setOnClickListener { finish() }
        }

        root.addView(progress)
        root.addView(statusText)
        root.addView(retryButton)
        root.addView(closeButton)
        setContentView(root)
    }

    private fun printSharedOrder() {
        val text = sharedText.trim()
        if (text.isBlank()) {
            showFailure("공유된 주문 텍스트가 없습니다.")
            return
        }

        executor.submit {
            val dbHelper = OrderDbHelper(this)
            val printerManager = BluetoothPrinterManager(this)
            val prefs = getSharedPreferences("PrintAppPrefs", Context.MODE_PRIVATE)
            val defaultPrinter = prefs.getString("default_printer", "") ?: ""

            if (defaultPrinter.isBlank()) {
                dbHelper.insertPrintHistory(text, "등록된 프린터가 없습니다.", "FAILED")
                runOnUiThread { showFailure("등록된 프린터가 없습니다.\n프린터를 먼저 선택해 주세요.") }
                return@submit
            }

            if (!printerManager.isBluetoothEnabled()) {
                dbHelper.insertPrintHistory(text, "블루투스가 꺼져 있습니다.", "FAILED")
                runOnUiThread { showFailure("블루투스가 꺼져 있습니다.") }
                return@submit
            }

            if (!printerManager.isDeliveryShareOrder(text)) {
                dbHelper.insertPrintHistory(text, "지원하지 않는 공유 텍스트 형식입니다.", "FAILED")
                runOnUiThread { showFailure("배달K 주문 공유 형식이 아닙니다.\n주문 텍스트를 확인해 주세요.") }
                return@submit
            }

            val success = try {
                printerManager.connectPrinter(defaultPrinter) && printerManager.printDeliveryShareOrder(text)
            } finally {
                Thread.sleep(2500)
                printerManager.disconnect()
            }

            dbHelper.insertPrintHistory(text, summarizeOrderText(text), if (success) "PRINTED" else "FAILED")
            runOnUiThread {
                if (success) {
                    Toast.makeText(this, "출력 완료!", Toast.LENGTH_SHORT).show()
                    finish()
                } else {
                    showFailure("프린터에 연결할 수 없습니다.\n전원과 블루투스 연결을 확인해 주세요.")
                }
            }
        }
    }

    private fun showFailure(message: String) {
        statusText.text = message
        retryButton.visibility = View.VISIBLE
        closeButton.visibility = View.VISIBLE
    }

    private fun extractSharedText(intent: Intent?): String {
        if (intent?.action != Intent.ACTION_SEND) return ""
        return intent.extras?.get(Intent.EXTRA_TEXT)?.toString() ?: ""
    }

    private fun summarizeOrderText(text: String): String {
        return text.lineSequence()
            .map { it.trim() }
            .firstOrNull { it.isNotBlank() }
            ?.take(80)
            ?: "공유 주문"
    }

    private fun hasBluetoothPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestBluetoothPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN),
                REQUEST_BLUETOOTH
            )
        }
    }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }

    companion object {
        private const val REQUEST_BLUETOOTH = 2001
    }
}
