package com.chunkear.app

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
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

    // MARK: - JavaScript 桥接
    inner class TTSBridge {
        @JavascriptInterface
        fun speak(text: String, rate: Float) {
            if (!ttsReady || tts == null) return
            runOnUiThread {
                try {
                    val utteranceId = UUID.randomUUID().toString()
                    val bundle = Bundle()
                    // Android TTS speed: 1.0 = normal, our rate 0.7-1.3 maps to 0.8-1.2
                    val speechRate = 0.7f + rate * 0.4f
                    bundle.putFloat(TextToSpeech.Engine.KEY_PARAM_SPEED, speechRate)
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
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                return
            }
            tts?.setSpeechRate(1.0f)
            tts?.setPitch(1.0f)
            ttsReady = true

            // 朗读完成回调 — 通知 JS
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
    }

    // MARK: - 注入 JS 桥接
    private fun injectTTSBridge() {
        val js = """
            window.nativeTTS = {
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
        webView.loadUrl("file:///android_asset/index.html")
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
