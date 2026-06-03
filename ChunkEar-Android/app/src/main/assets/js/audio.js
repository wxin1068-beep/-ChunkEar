// ChunkEar Audio Manager — 预生成音频 → Web Speech API 逐级降级
const AudioManager = {
  _rate: 1.0,
  _audio: null,
  _synth: null,
  _utterance: null,
  isPlaying: false,
  isPaused: false,
  onEnd: null,

  init() {
    this._rate = parseFloat(localStorage.getItem("chunkear-rate")) || 1.0;
  },

  _getAudioUrl(text) {
    // 从预生成的音频映射中查找
    if (typeof AUDIO_MAP !== "undefined" && AUDIO_MAP[text]) {
      return "audio/" + AUDIO_MAP[text];
    }
    return null;
  },

  speak(text, callback) {
    this.stop();
    if (!text) return;

    const cb = typeof callback === "function" ? callback : null;

    // 优先级 1: 预生成音频文件（最可靠、离线可用）
    const url = this._getAudioUrl(text);
    if (url) {
      this.isPlaying = true;
      this._audio = new Audio(url);
      this._audio.playbackRate = this._rate;
      this._audio.onended = () => {
        this.isPlaying = false;
        if (cb) cb();
      };
      this._audio.onerror = () => {
        this.isPlaying = false;
        this._trySpeechFallback(text, cb);
      };
      this._audio.play().catch(() => {
        this.isPlaying = false;
        this._trySpeechFallback(text, cb);
      });
      return;
    }

    // 优先级 2: Web Speech API（兜底）
    this._trySpeechFallback(text, cb);
  },

  _trySpeechFallback(text, cb) {
    if ("speechSynthesis" in window) {
      this._synth = window.speechSynthesis;
    }
    if (this._synth) {
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
    } else {
      this.isPlaying = false;
      if (cb) cb();
    }
  },

  stop() {
    if (this._audio) {
      this._audio.pause();
      this._audio.src = "";
    }
    if (this._synth) {
      this._synth.cancel();
    }
    this.isPlaying = false;
  },

  pause() {
    if (this._synth && this.isPlaying && !this.isPaused) {
      this._synth.pause();
      this.isPaused = true;
    }
  },

  resume() {
    if (this._synth && this.isPaused) {
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
