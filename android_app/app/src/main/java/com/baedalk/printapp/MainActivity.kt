package com.baedalk.printapp

import android.annotation.SuppressLint
import android.os.Bundle
import android.content.Intent
import android.content.Context
import android.provider.Settings
import android.os.Build
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import android.webkit.WebChromeClient
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    companion object {
        private const val RC_GOOGLE_SIGN_IN = 9001
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Google OAuth rejects Android WebView user agents that include the WebView marker.
        // Keep the app in WebView for printer features, but present a normal mobile Chrome UA.
        webSettings.userAgentString = webSettings.userAgentString
            .replace("; wv", "")
            .replace("Version/4.0 ", "")

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

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
        // 현재는 local.properties 파일의 DEV_WEB_URL 값을 읽어옵니다. (기본값 세팅됨)
        webView.loadUrl(BuildConfig.WEB_URL)

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
        
    }

    // 웹에서 안드로이드 코드를 호출할 수 있게 해주는 인터페이스
    @Deprecated("startActivityForResult is sufficient for this WebView bridge flow.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode != RC_GOOGLE_SIGN_IN) return

        try {
            val account = GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException::class.java)
            val idToken = account.idToken
            if (idToken.isNullOrBlank()) {
                dispatchGoogleSignInResult(null, "Google ID token is empty.")
                return
            }

            dispatchGoogleSignInResult(idToken, null)
        } catch (error: ApiException) {
            dispatchGoogleSignInResult(
                null,
                "Google sign-in configuration needs attention.",
                error.statusCode.toString()
            )
        } catch (error: Exception) {
            dispatchGoogleSignInResult(null, error.message ?: "Google sign-in failed.")
        }
    }

    private fun dispatchGoogleSignInResult(idToken: String?, error: String?, errorCode: String? = null) {
        val detail = JSONObject()
        if (!idToken.isNullOrBlank()) detail.put("idToken", idToken)
        if (!error.isNullOrBlank()) detail.put("error", error)
        if (!errorCode.isNullOrBlank()) detail.put("errorCode", errorCode)

        val script = "window.dispatchEvent(new CustomEvent('android-google-sign-in', { detail: $detail }));"
        runOnUiThread {
            webView.evaluateJavascript(script, null)
        }
    }

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
                jsonObj.put("parsed_data", cursor.getString(cursor.getColumnIndexOrThrow(OrderDbHelper.COLUMN_PARSED_DATA)))
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
        fun signInWithGoogle() {
            if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isBlank()) {
                dispatchGoogleSignInResult(null, "GOOGLE_WEB_CLIENT_ID is not configured.")
                return
            }

            val googleSignInOptions = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                .requestEmail()
                .requestProfile()
                .build()

            val client = GoogleSignIn.getClient(this@MainActivity, googleSignInOptions)
            client.signOut().addOnCompleteListener {
                startActivityForResult(client.signInIntent, RC_GOOGLE_SIGN_IN)
            }
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

        @android.webkit.JavascriptInterface
        fun printTextWithStyle(text: String, fontSize: Float, bold: Boolean): Boolean {
            return printerManager.printOrderReceipt(text, fontSize, bold)
        }

        @android.webkit.JavascriptInterface
        fun printDeliveryShareOrder(text: String): Boolean {
            return printerManager.printDeliveryShareOrder(text)
        }

        @android.webkit.JavascriptInterface
        fun printDeliveryShareKitchenOrder(text: String): Boolean {
            return printerManager.printDeliveryShareKitchenOrder(text)
        }

        @android.webkit.JavascriptInterface
        fun printKitchenOrderSheet(tableName: String, orderSequence: Int, printedAt: String, itemsJson: String): Boolean {
            return printerManager.printKitchenOrderSheet(tableName, orderSequence, printedAt, itemsJson)
        }

        @android.webkit.JavascriptInterface
        fun printPaymentReceipt(
            storeName: String,
            tableName: String,
            businessRegNo: String,
            address: String,
            representativeName: String,
            contact: String,
            printedAt: String,
            paymentMethod: String,
            taxableTotal: Int,
            vat: Int,
            receiptTotal: Int,
            itemsJson: String
        ): Boolean {
            return printerManager.printPaymentReceipt(
                storeName,
                tableName,
                businessRegNo,
                address,
                representativeName,
                contact,
                printedAt,
                paymentMethod,
                taxableTotal,
                vat,
                receiptTotal,
                itemsJson
            )
        }

        @android.webkit.JavascriptInterface
        fun saveDefaultPrinter(mac: String) {
            val prefs = this@MainActivity.getSharedPreferences("PrintAppPrefs", Context.MODE_PRIVATE)
            prefs.edit().putString("default_printer", mac).apply()
        }
        
        @android.webkit.JavascriptInterface
        fun getDefaultPrinter(): String {
            val prefs = this@MainActivity.getSharedPreferences("PrintAppPrefs", Context.MODE_PRIVATE)
            return prefs.getString("default_printer", "") ?: ""
        }
    }

}
