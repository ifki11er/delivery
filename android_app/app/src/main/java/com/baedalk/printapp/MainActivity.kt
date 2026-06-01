package com.baedalk.printapp

import android.annotation.SuppressLint
import android.os.Bundle
import android.content.Intent
import android.provider.Settings
import android.content.ComponentName
import android.text.TextUtils
import android.os.Build
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true

        // [옵션 A: 릴리즈 모드] 앱 내부에 탑재된 정적 파일 로드 (현재 주석 처리됨)
        /*
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
        }
        */

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        // [옵션 B: 개발 모드] 사용자 컴퓨터의 Next.js 로컬 서버 로드
        // 안드로이드 에뮬레이터에서는 10.0.2.2 가 컴퓨터의 localhost를 의미합니다.
        // 현재 사용자님의 실제 컴퓨터 Wi-Fi IP 주소(192.168.1.4)로 세팅해두었습니다.
        webView.loadUrl("http://192.168.1.4:3000")

        // Javascript Interface 등록 (웹뷰에서 DB 데이터 요청 가능하도록 브릿지 연결)
        val printerManager = BluetoothPrinterManager(this)
        webView.addJavascriptInterface(WebAppInterface(OrderDbHelper(this), printerManager), "AndroidBridge")
        
        // 블루투스 권한 요청 (Android 12 이상)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(
                    Manifest.permission.BLUETOOTH_CONNECT, 
                    Manifest.permission.BLUETOOTH_SCAN
                ), 100)
            }
        }
        
        // 알림 접근 권한이 없으면 설정 화면으로 이동시킴
        if (!isNotificationServiceEnabled()) {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            startActivity(intent)
        }
    }

    // 웹에서 안드로이드 코드를 호출할 수 있게 해주는 인터페이스
    inner class WebAppInterface(private val dbHelper: OrderDbHelper, private val printerManager: BluetoothPrinterManager) {
        @android.webkit.JavascriptInterface
        fun getOrders(): String {
            val db = dbHelper.readableDatabase
            val cursor = db.rawQuery("SELECT * FROM ${OrderDbHelper.TABLE_NAME} ORDER BY id DESC LIMIT 20", null)
            val jsonArray = org.json.JSONArray()
            
            while (cursor.moveToNext()) {
                val jsonObj = org.json.JSONObject()
                jsonObj.put("id", cursor.getInt(cursor.getColumnIndexOrThrow(OrderDbHelper.COLUMN_ID)))
                jsonObj.put("raw_text", cursor.getString(cursor.getColumnIndexOrThrow(OrderDbHelper.COLUMN_RAW_TEXT)))
                jsonObj.put("timestamp", cursor.getString(cursor.getColumnIndexOrThrow(OrderDbHelper.COLUMN_TIMESTAMP)))
                jsonObj.put("status", cursor.getString(cursor.getColumnIndexOrThrow(OrderDbHelper.COLUMN_STATUS)))
                jsonArray.put(jsonObj)
            }
            cursor.close()
            return jsonArray.toString()
        }

        @android.webkit.JavascriptInterface
        fun isBluetoothEnabled(): Boolean {
            return printerManager.isBluetoothEnabled()
        }

        @android.webkit.JavascriptInterface
        fun openBluetoothSettings() {
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        }

        @android.webkit.JavascriptInterface
        fun getPairedPrinters(): String {
            val printers = printerManager.getPairedPrinters()
            val jsonArray = org.json.JSONArray()
            for (p in printers) {
                val obj = org.json.JSONObject()
                obj.put("name", p["name"])
                obj.put("mac", p["mac"])
                jsonArray.put(obj)
            }
            return jsonArray.toString()
        }

        @android.webkit.JavascriptInterface
        fun connectPrinter(macAddress: String): Boolean {
            return printerManager.connectPrinter(macAddress)
        }

        @android.webkit.JavascriptInterface
        fun printTest(): Boolean {
            return printerManager.printTestReceipt()
        }

        @android.webkit.JavascriptInterface
        fun printText(text: String): Boolean {
            return printerManager.printOrderReceipt(text)
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        if (!TextUtils.isEmpty(flat)) {
            val names = flat.split(":")
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && TextUtils.equals(pkgName, cn.packageName)) {
                    return true
                }
            }
        }
        return false
    }
}
