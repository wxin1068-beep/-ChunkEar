// ChunkEar Audio Manager — 谷歌 TTS 代理优先，Web Speech API 兜底
const AudioManager = {
  _rate: 1.0,
  _audio: null,
  _synth: null,
  _utterance: null,
  _usingNative: false,
  _usingProxy: false,
  _usingSpeech: false,
  isPlaying: false,
  isPaused: false,
  onEnd: null,

  init() {
    this._rate = parseFloat(localStorage.getItem("chunkear-rate")) || 1.0;

    // 优先级 1: 原生 TTS 桥接 (iOS/Android)
    if (window.nativeTTS && typeof window.nativeTTS.speak === "function") {
      this._usingNative = true;
      return;
    }

    // 优先级 2: 谷歌 TTS 代理（服务器上）
    if (window.location.protocol !== "file:" && window.Audio) {
      this._audio = new Audio();
      this._usingProxy = true;
      return;
    }

    // 优先级 3: Web Speech API（本地或兜底）
    if ("speechSynthesis" in window) {
      this._synth = window.speechSynthesis;
      this._usingSpeech = true;
    }
  },

  speak(text, callback) {
    this.stop();
    if (!text) return;

    const cb = typeof callback === "function" ? callback : null;

    if (this._usingNative) {
      this.isPlaying = true;
      window.nativeTTS.speak(text, this._rate, () => {
        this.isPlaying = false;
        if (cb) cb();
      });
    } else if (this._usingProxy) {
      this.isPlaying = true;
      this._audio.src = "/tts?q=" + encodeURIComponent(text) + "&tl=en";
      this._audio.play().catch(() => {
        // 代理失败，自动降级到 Web Speech API
        this._usingProxy = false;
        if ("speechSynthesis" in window) {
          this._synth = window.speechSynthesis;
          this._usingSpeech = true;
          this.speak(text, callback);
        } else {
          this.isPlaying = false;
          if (cb) cb();
        }
      });
      this._audio.onended = () => {
        this.isPlaying = false;
        if (cb) cb();
      };
      this._audio.onerror = () => {
        this.isPlaying = false;
        if (cb) cb();
      };
    } else if (this._usingSpeech) {
      this._synth.cancel();
      this._utterance = new SpeechSynthesisUtterance(text);
      this._utterance.lang = "en-US";
      this._utterance.rate = this._rate;
      this._utterance.onend = () => {
        this.isPlaying = false;
        if (cb) cb();
      };
      this._utterance.onerror = () => {
        this.isPlaying = false;
        if (cb) cb();
      };
      this.isPlaying = true;
      this._synth.speak(this._utterance);
    }
  },

  stop() {
    if (this._usingNative && window.nativeTTS.stop) {
      window.nativeTTS.stop();
    } else if (this._usingProxy && this._audio) {
      this._audio.pause();
      this._audio.src = "";
    } else if (this._usingSpeech) {
      this._synth && this._synth.cancel();
    }
    this.isPlaying = false;
  },

  pause() {
    if (this._usingSpeech && this.isPlaying && !this.isPaused) {
      this._synth.pause();
      this.isPaused = true;
    }
  },

  resume() {
    if (this._usingSpeech && this.isPaused) {
      this._synth.resume();
      this.isPaused = false;
    }
  },

  setRate(rate) {
    this._rate = rate;
    try {
      localStorage.setItem("chunkear-rate", String(rate));
    } catch (e) {}
  },

  getRate() {
    return this._rate;
  },
};
