import SwiftUI
import WebKit
import AVFoundation

// MARK: - Native TTS Bridge
class TTSBridge: NSObject, WKScriptMessageHandler, AVSpeechSynthesizerDelegate {
    weak var webView: WKWebView?
    private let synthesizer = AVSpeechSynthesizer()

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "ttsSpeak":
            guard let body = message.body as? [String: Any],
                  let text = body["text"] as? String else { return }
            let rate = body["rate"] as? Double ?? 1.0
            speak(text, rate: Float(rate))
        case "ttsStop":
            synthesizer.stopSpeaking(at: .immediate)
        default:
            break
        }
    }

    private func speak(_ text: String, rate: Float) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        // AVSpeechUtterance rate range: 0.0 ~ 1.0, default 0.5
        // Map our 0.7-1.3 range to 0.35-0.65
        utterance.rate = max(0.3, min(0.7, 0.3 + rate * 0.25))
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0

        synthesizer.speak(utterance)
    }

    // AVSpeechSynthesizerDelegate — 朗读完成回调
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        webView?.evaluateJavaScript("window.__ttsCallback && window.__ttsCallback();", completionHandler: nil)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        webView?.evaluateJavaScript("window.__ttsCallback && window.__ttsCallback();", completionHandler: nil)
    }

    // 注入 JavaScript 到 WebView
    func injectJS() {
        let js = """
        window.nativeTTS = {
            speak: function(text, rate, callback) {
                if (typeof callback === 'function') {
                    window.__ttsCallback = callback;
                }
                window.webkit.messageHandlers.ttsSpeak.postMessage({
                    text: text,
                    rate: rate || 1.0
                });
            },
            stop: function() {
                window.webkit.messageHandlers.ttsStop.postMessage({});
                window.__ttsCallback = null;
            }
        };
        """
        let script = WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        webView?.configuration.userContentController.addUserScript(script)
    }
}

// MARK: - WebView
struct ContentView: UIViewRepresentable {
    let ttsBridge = TTSBridge()

    func makeCoordinator() -> TTSBridge { ttsBridge }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "ttsSpeak")
        config.userContentController.add(context.coordinator, name: "ttsStop")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.isOpaque = false
        webView.backgroundColor = UIColor(named: "bgColor") ?? .systemBackground

        context.coordinator.webView = webView
        context.coordinator.injectJS()

        if let path = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "web") {
            let url = URL(fileURLWithPath: path)
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }

        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

// MARK: - App
@main
struct ChunkEarApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .ignoresSafeArea()
                .onAppear {
                    UIApplication.shared.beginReceivingRemoteControlEvents()
                }
        }
    }
}
