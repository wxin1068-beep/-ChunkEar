// ChunkEar Audio Manager — 支持语音选择
const AudioManager = {
  synth: null,
  utterance: null,
  rate: 1,
  isPlaying: false,
  isPaused: false,
  onEnd: null,
  onTick: null,
  _timer: null,
  _duration: 0,
  _voice: null,
  _voiceName: null,   // 用户选择的声音名称

  // ============ 初始化 ============

  init() {
    this.synth = window.speechSynthesis;
    // 加载用户上次选的声音
    try {
      const saved = localStorage.getItem('chunkear-voice');
      if (saved) this._voiceName = saved;
    } catch(e) {}
    this._loadVoice();
    // 某些浏览器（Safari）语音列表异步加载
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this._loadVoice();
    }
  },

  // ============ 语音列表 ============

  getEnglishVoices() {
    if (!this.synth) this.init();
    const all = this.synth.getVoices();
    // 返回所有英语语音
    return all.filter(v => v.lang.startsWith('en'));
  },

  getAllVoices() {
    if (!this.synth) this.init();
    return this.synth.getVoices();
  },

  // ============ 语音选择 ============

  _loadVoice() {
    const voices = this.synth.getVoices();
    if (voices.length === 0) return;

    // 优先用用户选择的
    if (this._voiceName) {
      const found = voices.find(v => v.name === this._voiceName);
      if (found) {
        this._voice = found;
        return;
      }
    }

    // 否则按优先级选
    this._voice = voices.find(v => v.lang.startsWith('en-GB'))
      || voices.find(v => v.lang.startsWith('en-US'))
      || voices.find(v => v.lang.startsWith('en'))
      || null;
  },

  setVoice(name) {
    this._voiceName = name;
    try {
      localStorage.setItem('chunkear-voice', name || '');
    } catch(e) {}
    this._loadVoice();
  },

  getVoiceName() {
    return this._voice ? this._voice.name : '默认';
  },

  // ============ 播放 ============

  speak(text, callback) {
    if (!this.synth) this.init();
    this.stop();

    if (!text) return;

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.lang = 'en-US';
    this.utterance.rate = this.rate;
    this.utterance.pitch = 1;
    this.utterance.volume = 1;

    if (this._voice) this.utterance.voice = this._voice;

    this._duration = Math.max(text.length * 60 / (this.rate || 1), 500);
    this.isPlaying = true;
    this.isPaused = false;

    const startTime = Date.now();

    this.utterance.onstart = () => {
      this.isPlaying = true;
      this._startProgress(startTime);
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this._stopProgress();
      if (this.onEnd) this.onEnd();
      if (callback) callback();
    };

    this.utterance.onerror = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this._stopProgress();
      if (this.onEnd) this.onEnd();
      if (callback) callback();
    };

    try {
      this.synth.speak(this.utterance);
    } catch (e) {
      console.warn('TTS speak failed:', e);
      this.isPlaying = false;
      if (callback) callback();
    }
  },

  // ============ 其他 ============

  speakSentences(sentences, index, onSentenceEnd, onComplete) {
    if (index >= sentences.length) {
      if (onComplete) onComplete();
      return;
    }
    this.onEnd = () => {
      if (onSentenceEnd) onSentenceEnd(index);
      setTimeout(() => {
        this.speakSentences(sentences, index + 1, onSentenceEnd, onComplete);
      }, 300);
    };
    this.speak(sentences[index]);
  },

  pause() {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this._stopProgress();
    }
  },

  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.isPlaying = true;
    }
  },

  stop() {
    if (this.synth) this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this._stopProgress();
    this.utterance = null;
  },

  setRate(rate) {
    this.rate = rate;
  },

  _startProgress(startTime) {
    this._stopProgress();
    this._timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this._duration, 0.95);
      if (this.onTick) this.onTick(progress);
    }, 100);
  },

  _stopProgress() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
};
