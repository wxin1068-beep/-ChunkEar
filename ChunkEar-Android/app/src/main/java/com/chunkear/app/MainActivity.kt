package com.chunkear.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import androidx.appcompat.app.AppCompatActivity
import android.view.KeyEvent
import java.util.Locale
import java.util.UUID

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var webView: WebView
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var assetServer: LocalAssetServer? = null

    // MARK: - JavaScript 桥接
    inner class TTSBridge {
        @JavascriptInterface
        fun isReady(): Boolean = ttsReady

        @JavascriptInterface
        fun speak(text: String, rate: Float) {
            if (!ttsReady || tts == null) return
            runOnUiThread {
                try {
                    val utteranceId = UUID.randomUUID().toString()
                    val bundle = Bundle()
                    val speechRate = 0.7f + rate * 0.4f
                    bundle.putFloat("speed", speechRate)
                    tts!!.speak(text, TextToSpeech.QUEUE_FLUSH, bundle, utteranceId)
                } catch (_: Exception) { }
            }
        }

        @JavascriptInterface
        fun stop() {
            tts?.stop()
        }
    }

    // MARK: - TTS 初始化
    override fun onInit(status: Int) {
        if (status != TextToSpeech.SUCCESS) return
        val result = tts?.setLanguage(Locale.US)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) return

        tts?.setSpeechRate(1.0f)
        tts?.setPitch(1.0f)
        ttsReady = true

        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onDone(utteranceId: String?) {
                runOnUiThread {
                    webView.evaluateJavascript(
                        "window.__ttsCallback && window.__ttsCallback();", null
                    )
                }
            }
            override fun onError(utteranceId: String?) {}
            override fun onStart(utteranceId: String?) {}
        })
    }

    // MARK: - 注入 JS 桥接
    private fun injectTTSBridge() {
        val js = """
            window.nativeTTS = {
                isReady: function() { return Android.isReady(); },
                speak: function(text, rate, callback) {
                    if (typeof callback === 'function') {
                        window.__ttsCallback = callback;
                    }
                    Android.speak(text, rate || 1.0);
                },
                stop: function() {
                    Android.stop();
                    window.__ttsCallback = null;
                }
            };
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 启动本地 HTTP 服务器（让 speechSynthesis 等 API 在安全上下文中可用）
        val server = LocalAssetServer(assets, 0)
        server.start()
        assetServer = server

        tts = TextToSpeech(this, this)

        webView = WebView(this)
        setContentView(webView)

        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.cacheMode = WebSettings.LOAD_DEFAULT
        webSettings.databaseEnabled = true
        webSettings.useWideViewPort = true
        webSettings.loadWithOverviewMode = true
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        webSettings.mediaPlaybackRequiresUserGesture = false

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectTTSBridge()
            }
        }

        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(TTSBridge(), "Android")
        webView.loadUrl(server.baseUrl)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        assetServer?.stop()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }
}
