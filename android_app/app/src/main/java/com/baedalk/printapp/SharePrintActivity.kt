package com.baedalk.printapp

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import android.webkit.CookieManager
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

class SharePrintActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var progressBar: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var reasonText: TextView
    private lateinit var warningContainer: LinearLayout
    private lateinit var retryButton: Button
    private lateinit var closeButton: Button
    private lateinit var cancelButton: Button
    private lateinit var continueButton: Button
    private var sharedText: String = ""
    private var skipBlacklistCheck: Boolean = false

    private data class BlacklistCheckResult(
        val isBlacklisted: Boolean,
        val phoneNumber: String,
        val count: Int,
        val latestDate: String,
        val reports: List<BlacklistReport>
    )

    private data class BlacklistReport(
        val reason: String,
        val reporterName: String,
        val createdAt: String,
        val isMine: Boolean
    )

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
        skipBlacklistCheck = false
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
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(48, 48, 48, 48)
        }

        progressBar = ProgressBar(this).apply {
            isIndeterminate = true
        }

        statusText = TextView(this).apply {
            text = "블랙리스트 검수중..."
            textSize = 22f
            gravity = Gravity.CENTER
            setPadding(24, 22, 24, 22)
        }

        reasonText = TextView(this).apply {
            visibility = View.GONE
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        }

        warningContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            visibility = View.GONE
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        retryButton = Button(this).apply {
            text = "다시 시도"
            visibility = View.GONE
            setOnClickListener {
                visibility = View.GONE
                closeButton.visibility = View.GONE
                reasonText.visibility = View.GONE
                progressBar.visibility = View.VISIBLE
                resetStatusStyle()
                statusText.text = "블랙리스트 검수중..."
                skipBlacklistCheck = false
                printSharedOrder()
            }
        }

        closeButton = Button(this).apply {
            text = "닫기"
            visibility = View.GONE
            setOnClickListener { finish() }
        }

        cancelButton = Button(this).apply {
            text = "취소"
            visibility = View.GONE
            setTextColor(Color.rgb(185, 28, 28))
            background = roundedBackground(Color.rgb(254, 242, 242), Color.rgb(254, 202, 202), 2)
            setPadding(28, 10, 28, 10)
            setOnClickListener { finish() }
        }

        continueButton = Button(this).apply {
            text = "계속"
            visibility = View.GONE
            setTextColor(Color.WHITE)
            background = roundedBackground(Color.rgb(37, 99, 235), Color.rgb(29, 78, 216), 2)
            setPadding(28, 10, 28, 10)
            setOnClickListener {
                skipBlacklistCheck = true
                cancelButton.visibility = View.GONE
                continueButton.visibility = View.GONE
                reasonText.visibility = View.GONE
                progressBar.visibility = View.VISIBLE
                resetStatusStyle()
                statusText.text = "출력중..."
                printSharedOrder()
            }
        }

        val blacklistActions = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 26)
            addView(cancelButton, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 12, 0) })
            addView(continueButton, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(12, 0, 0, 0) })
        }

        root.addView(progressBar)
        root.addView(statusText)
        root.addView(blacklistActions)
        root.addView(reasonText)
        root.addView(warningContainer)
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

            if (!skipBlacklistCheck) {
                val phone = printerManager.getDeliverySharePhone(text)
                val blacklistResult = checkBlacklist(phone)
                if (blacklistResult.isBlacklisted) {
                    runOnUiThread { showBlacklistWarning(blacklistResult) }
                    return@submit
                }
            }

            runOnUiThread {
                resetStatusStyle()
                progressBar.visibility = View.VISIBLE
                reasonText.visibility = View.GONE
                cancelButton.visibility = View.GONE
                continueButton.visibility = View.GONE
                statusText.text = "출력중..."
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

    private fun checkBlacklist(phone: String): BlacklistCheckResult {
        if (phone.isBlank()) return BlacklistCheckResult(false, "", 0, "", emptyList())

        return try {
            val encodedPhone = URLEncoder.encode(phone, "UTF-8")
            val baseUrl = BuildConfig.WEB_URL.trimEnd('/')
            val connection = (URL("$baseUrl/api/blacklist/check?phone=$encodedPhone").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 2500
                readTimeout = 2500
                CookieManager.getInstance().getCookie(BuildConfig.WEB_URL)?.takeIf { it.isNotBlank() }?.let {
                    setRequestProperty("Cookie", it)
                }
            }

            if (connection.responseCode != HttpURLConnection.HTTP_OK) {
                connection.disconnect()
                return BlacklistCheckResult(false, "", 0, "", emptyList())
            }

            val body = connection.inputStream.bufferedReader().use { it.readText() }
            connection.disconnect()

            val json = JSONObject(body)
            val reportsJson = json.optJSONArray("reports")
            val reports = mutableListOf<BlacklistReport>()
            if (reportsJson != null) {
                for (index in 0 until reportsJson.length()) {
                    val report = reportsJson.optJSONObject(index) ?: continue
                    reports.add(
                        BlacklistReport(
                            reason = report.optString("reason"),
                            reporterName = report.optString("reporterName").ifBlank { "익명" },
                            createdAt = report.optString("createdAt"),
                            isMine = report.optBoolean("isMine", false)
                        )
                    )
                }
            }

            BlacklistCheckResult(
                isBlacklisted = json.optBoolean("isBlacklisted", false),
                phoneNumber = json.optString("phoneNumber", phone),
                count = json.optInt("count", reports.size),
                latestDate = json.optString("latestDate"),
                reports = reports
                    .filter { it.reason.isNotBlank() }
                    .sortedWith(compareByDescending<BlacklistReport> { it.isMine }.thenByDescending { it.createdAt })
            )
        } catch (error: Exception) {
            BlacklistCheckResult(false, "", 0, "", emptyList())
        }
    }

    private fun showBlacklistWarning(result: BlacklistCheckResult) {
        progressBar.visibility = View.GONE
        retryButton.visibility = View.GONE
        closeButton.visibility = View.GONE
        statusText.text = "블랙리스트에 등록된 고객입니다."
        statusText.setTextColor(Color.rgb(153, 27, 27))
        statusText.setTypeface(statusText.typeface, Typeface.BOLD)
        statusText.background = roundedBackground(Color.rgb(254, 242, 242), Color.rgb(254, 202, 202), 3)
        statusText.layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            setMargins(0, 0, 0, 18)
        }
        reasonText.visibility = View.GONE
        renderBlacklistCard(result)
        warningContainer.visibility = View.VISIBLE
        cancelButton.visibility = View.VISIBLE
        continueButton.visibility = View.VISIBLE
    }

    private fun renderBlacklistCard(result: BlacklistCheckResult) {
        warningContainer.removeAllViews()

        val scrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (resources.displayMetrics.heightPixels * 0.58f).toInt()
            )
        }

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 26, 28, 26)
            background = roundedBackground(Color.WHITE, riskBorderColor(result.count), 3)
        }

        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val phoneText = TextView(this).apply {
            text = formatPhone(result.phoneNumber)
            textSize = 24f
            setTextColor(Color.rgb(17, 24, 39))
            setTypeface(typeface, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val badgeText = TextView(this).apply {
            text = "누적 ${result.count}건 (${riskLabel(result.count)})"
            textSize = 12f
            setTextColor(riskTextColor(result.count))
            setTypeface(typeface, Typeface.BOLD)
            setPadding(14, 6, 14, 6)
            background = roundedBackground(riskBadgeColor(result.count), Color.TRANSPARENT, 0)
        }

        headerRow.addView(phoneText)
        headerRow.addView(badgeText)
        card.addView(headerRow)

        card.addView(TextView(this).apply {
            text = "최근 제보일  ${formatDate(result.latestDate)}"
            textSize = 12f
            setTextColor(Color.rgb(107, 114, 128))
            setPadding(0, 12, 0, 16)
        })

        result.reports.forEach { report ->
            val reportCard = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(20, 18, 20, 18)
                val bgColor = if (report.isMine) Color.rgb(238, 242, 255) else Color.rgb(249, 250, 251)
                val borderColor = if (report.isMine) Color.rgb(199, 210, 254) else Color.rgb(229, 231, 235)
                background = roundedBackground(bgColor, borderColor, 2)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 12)
                }
            }

            val reasonRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.TOP
            }

            reasonRow.addView(TextView(this).apply {
                text = "사유: ${report.reason}"
                textSize = 15f
                setTextColor(Color.rgb(31, 41, 55))
                setTypeface(typeface, Typeface.BOLD)
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            })

            if (report.isMine) {
                reasonRow.addView(TextView(this).apply {
                    text = "내 제보"
                    textSize = 10f
                    setTextColor(Color.rgb(67, 56, 202))
                    setTypeface(typeface, Typeface.BOLD)
                    setPadding(10, 4, 10, 4)
                    background = roundedBackground(Color.rgb(224, 231, 255), Color.TRANSPARENT, 0)
                })
            }

            reportCard.addView(reasonRow)
            reportCard.addView(TextView(this).apply {
                text = "제보자  ${report.reporterName}   ${formatDate(report.createdAt)}"
                textSize = 12f
                setTextColor(Color.rgb(107, 114, 128))
                setPadding(0, 12, 0, 0)
            })
            card.addView(reportCard)
        }

        scrollView.addView(card)
        warningContainer.addView(scrollView)
    }

    private fun showFailure(message: String) {
        resetStatusStyle()
        progressBar.visibility = View.GONE
        reasonText.visibility = View.GONE
        warningContainer.visibility = View.GONE
        cancelButton.visibility = View.GONE
        continueButton.visibility = View.GONE
        statusText.text = message
        retryButton.visibility = View.VISIBLE
        closeButton.visibility = View.VISIBLE
    }

    private fun resetStatusStyle() {
        statusText.setTextColor(Color.BLACK)
        statusText.setTypeface(Typeface.DEFAULT, Typeface.NORMAL)
        statusText.background = null
        statusText.layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
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

    private fun roundedBackground(fillColor: Int, strokeColor: Int, strokeWidth: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 18f
            setColor(fillColor)
            if (strokeWidth > 0) setStroke(strokeWidth, strokeColor)
        }
    }

    private fun riskLabel(count: Int): String {
        return when {
            count >= 3 -> "매우 위험"
            count == 2 -> "위험"
            else -> "주의"
        }
    }

    private fun riskBorderColor(count: Int): Int {
        return when {
            count >= 3 -> Color.rgb(254, 202, 202)
            count == 2 -> Color.rgb(254, 215, 170)
            else -> Color.rgb(254, 240, 138)
        }
    }

    private fun riskBadgeColor(count: Int): Int {
        return when {
            count >= 3 -> Color.rgb(254, 226, 226)
            count == 2 -> Color.rgb(255, 237, 213)
            else -> Color.rgb(254, 249, 195)
        }
    }

    private fun riskTextColor(count: Int): Int {
        return when {
            count >= 3 -> Color.rgb(153, 27, 27)
            count == 2 -> Color.rgb(154, 52, 18)
            else -> Color.rgb(133, 77, 14)
        }
    }

    private fun formatPhone(phone: String): String {
        val digits = phone.replace(Regex("[^0-9]"), "")
        return if (digits.length == 11) {
            "${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7)}"
        } else {
            phone
        }
    }

    private fun formatDate(value: String): String {
        if (value.length < 10) return "-"
        return value.substring(0, 10)
    }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }

    companion object {
        private const val REQUEST_BLUETOOTH = 2001
    }
}
