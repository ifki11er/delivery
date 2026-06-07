package com.baedalk.printapp

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import java.net.URLEncoder

class SharePrintActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        openWebSharePrint(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        openWebSharePrint(intent)
    }

    private fun openWebSharePrint(intent: Intent?) {
        val text = extractSharedText(intent)
        val encoded = URLEncoder.encode(text, "UTF-8")
        val target = Intent(this, MainActivity::class.java).apply {
            putExtra(MainActivity.EXTRA_START_PATH, "/share-print?text=$encoded")
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        startActivity(target)
        finish()
    }

    private fun extractSharedText(intent: Intent?): String {
        if (intent?.action != Intent.ACTION_SEND) return ""
        return intent.extras?.get(Intent.EXTRA_TEXT)?.toString() ?: ""
    }
}
