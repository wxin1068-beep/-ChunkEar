// ChunkEar PWA — 主应用逻辑
const CORRECT_TO_PASS = 3; // 连续正确3次达标
const TEST_TIME_LIMIT = 6; // 自动化测试限时6秒
const TEST_LIVES = 5; // 5条命

const REVIEW_INTERVALS = [1, 3, 7, 14, 30]; // 间隔重复(天)

// 语音识别（开口说模式用）
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

function $(id) {
  return document.getElementById(id);
}

const ChunkApp = {
  state: {
    view: "home",
    currentLevelId: null,
    currentModuleIdx: null,
    mode: null,
    progress: {},
  },

  // ==================== INIT ====================
  init() {
    try {
      AudioManager.init();
    } catch (e) {
      console.warn(e);
    }
    try {
      this._loadProgress();
    } catch (e) {
      console.warn(e);
    }
    this._rebuildCustomLevel();
    this._applyTheme();
    this.showHome();
  },

  _applyTheme() {
    const saved = localStorage.getItem("chunkear-theme");
    if (saved === "dark")
      document.documentElement.setAttribute("data-theme", "dark");
  },

  // ==================== NAVIGATION ====================
  showHome() {
    this.state.view = "home";
    this.state.currentLevelId = null;
    this.state.currentModuleIdx = null;
    this.state.mode = null;
    this._showView("home");
    this._renderHome();
  },

  selectLevel(levelId) {
    this.state.currentLevelId = levelId;
    this.state.currentModuleIdx = null;
    this.state.mode = null;
    this.state.view = "level";
    this._showView("level");
    this._renderLevel();
  },

  selectMode(mode) {
    const level = CORPUS.find((l) => l.id === this.state.currentLevelId);
    if (!level) return;
    this.state.mode = mode;
    this.state.view = "training";
    this._showView("training");
    this._renderTraining(mode, level);
  },

  goBack() {
    if (this.state.view === "level") this.showHome();
    else if (this.state.view === "training")
      this.selectLevel(this.state.currentLevelId);
  },

  _showView(viewId) {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    const el = $("view-" + viewId);
    if (el) el.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  testVoice() {
    AudioManager.speak("Hello. Nice to meet you. Welcome to ChunkEar.");
  },

  // ==================== THEME ====================
  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    html.setAttribute("data-theme", isDark ? "" : "dark");
    localStorage.setItem("chunkear-theme", isDark ? "light" : "dark");
  },

  // ==================== PROGRESS ====================
  _key(levelId, eng) {
    return "L" + levelId + "_" + eng;
  },

  _getModuleProgress(levelId, eng, chn) {
    const k = this._key(levelId, eng);
    if (!this.state.progress[k]) {
      this.state.progress[k] = {
        eng,
        chn,
        level: levelId,
        correctInRow: 0,
        attempts: 0,
        correct: 0,
        passed: false,
        learnedOnce: false,
        testCheck: false,
        testPassed: false,
        speakPassed: false,
        reviewStage: -1, // -1=未进入复习, 0=待首次复习…
        lastReviewTime: 0,
      };
    }
    return this.state.progress[k];
  },

  _saveProgress() {
    try {
      localStorage.setItem(
        "chunkear-progress",
        JSON.stringify(this.state.progress),
      );
    } catch (e) {}
  },

  _loadProgress() {
    try {
      const saved = localStorage.getItem("chunkear-progress");
      if (saved) this.state.progress = JSON.parse(saved);
    } catch (e) {}
  },

  // ==================== 统计 ====================
  calcLevelStats(levelId) {
    const level = CORPUS.find((l) => l.id === levelId);
    if (!level)
      return {
        total: 0,
        speakPassed: 0,
        waitingSpeak: 0,
        waitingTest: 0,
        practicing: 0,
      };
    let speakPassed = 0,
      waitingSpeak = 0,
      passed = 0,
      practicing = 0;
    level.modules.forEach(([eng]) => {
      const p = this.state.progress[this._key(levelId, eng)];
      if (p && p.speakPassed) speakPassed++;
      else if (p && p.testPassed) waitingSpeak++;
      else if (p && p.passed) passed++;
      else if (p && p.attempts > 0) practicing++;
    });
    return {
      total: level.modules.length,
      speakPassed,
      waitingSpeak,
      waitingTest: passed,
      practicing,
    };
  },

  isLevelUnlocked(levelId) {
    if (levelId === 0) return true;
    const prev = CORPUS.find((l) => l.id === levelId - 1);
    if (!prev) return true;
    return prev.modules.every(([eng]) => {
      const p = this.state.progress[this._key(levelId - 1, eng)];
      return p && p.passed;
    });
  },

  isLevelCompleted(levelId) {
    const level = CORPUS.find((l) => l.id === levelId);
    if (!level) return false;
    return level.modules.every(([eng]) => {
      const p = this.state.progress[this._key(levelId, eng)];
      return p && p.passed;
    });
  },

  // ==================== 间隔复习 ====================
  getDueReviews() {
    const now = Date.now();
    const due = [];
    for (const key in this.state.progress) {
      const p = this.state.progress[key];
      if (!p.testPassed || p.reviewStage < 0) continue;
      // 计算下次复习到期时间
      const interval = REVIEW_INTERVALS[p.reviewStage] || 30;
      const nextDue = p.lastReviewTime + interval * 86400000;
      if (nextDue <= now) {
        due.push(p);
      }
    }
    return due;
  },

  getPendingReviews() {
    // 所有已经 testPassed 且 reviewStage >= 0 的模块
    const items = [];
    for (const key in this.state.progress) {
      const p = this.state.progress[key];
      if (p.testPassed && p.reviewStage >= 0) {
        items.push(p);
      }
    }
    return items;
  },

  // 标记模块已完成一次复习
  _advanceReview(eng, levelId) {
    const k = this._key(levelId, eng);
    const p = this.state.progress[k];
    if (!p || !p.testPassed) return;
    if (p.reviewStage < 0) p.reviewStage = 0;
    else if (p.reviewStage < REVIEW_INTERVALS.length - 1) p.reviewStage++;
    p.lastReviewTime = Date.now();
    this._saveProgress();
  },

  // 开始复习模式
  startReview() {
    const due = this.getDueReviews();
    if (due.length === 0) return;
    // 取第一个待复习模块的 level
    const p = due[0];
    const level = CORPUS.find((l) => l.id === p.level);
    if (!level) return;
    this.state.currentLevelId = p.level;
    this.state.mode = "review";
    this.state.view = "training";
    this._showView("training");
    this._renderTraining("review", level);
  },

  _renderReviewBanner() {
    const container = $("review-banner-container");
    if (!container) return;
    const due = this.getDueReviews();
    if (due.length > 0) {
      // 按 level 分组
      const byLevel = {};
      due.forEach((p) => {
        if (!byLevel[p.level]) byLevel[p.level] = 0;
        byLevel[p.level]++;
      });
      const levelNames = CORPUS.map((l) => l.name);
      const desc = Object.entries(byLevel)
        .map(
          ([lv, count]) => (levelNames[lv] || "Lv." + lv) + "(" + count + "个)",
        )
        .join("、");
      container.innerHTML =
        '<div class="review-banner">' +
        '<span class="review-banner-text">📚 ' +
        due.length +
        "个模块待复习（" +
        desc +
        "）</span>" +
        '<button class="btn" onclick="ChunkApp.startReview()">开始复习 →</button>' +
        "</div>";
    } else {
      container.innerHTML = "";
    }
  },

  // ==================== CUSTOM CORPUS ====================
  _getCustomCorpus() {
    try {
      const data = localStorage.getItem("chunkear-custom-corpus");
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  _saveCustomCorpus(arr) {
    localStorage.setItem("chunkear-custom-corpus", JSON.stringify(arr));
  },

  _rebuildCustomLevel() {
    const idx = CORPUS.findIndex((l) => l.id === "custom");
    if (idx >= 0) CORPUS.splice(idx, 1);
    const custom = this._getCustomCorpus();
    if (custom.length > 0) {
      CORPUS.push({
        id: "custom",
        name: "自定义语料",
        icon: "📝",
        color: "#e67e22",
        modules: custom.map((m) => [m.en, m.cn]),
      });
    }
  },

  addCustomModule(en, cn) {
    if (!en.trim() || !cn.trim()) return alert("请填写英文和中文");
    const corpus = this._getCustomCorpus();
    corpus.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      en: en.trim(),
      cn: cn.trim(),
      createdAt: Date.now(),
    });
    this._saveCustomCorpus(corpus);
    this._rebuildCustomLevel();
    this._renderCustomMgmt();
    $("cm-en").value = "";
    $("cm-cn").value = "";
  },

  removeCustomModule(id) {
    let corpus = this._getCustomCorpus();
    corpus = corpus.filter((m) => m.id !== id);
    this._saveCustomCorpus(corpus);
    this._rebuildCustomLevel();
    this._renderCustomMgmt();
  },

  exportCustomCorpus() {
    const corpus = this._getCustomCorpus();
    if (corpus.length === 0) return alert("自定义语料库为空");
    const data = JSON.stringify(
      {
        version: 1,
        name: "ChunkEar自定义语料",
        exportedAt: new Date().toISOString(),
        modules: corpus.map((m) => ({ en: m.en, cn: m.cn })),
      },
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "chunkear-custom-corpus-" +
      new Date().toISOString().slice(0, 10) +
      ".json";
    a.click();
    URL.revokeObjectURL(url);
  },

  importCustomCorpus(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.modules || !Array.isArray(data.modules)) throw new Error();
        const existing = this._getCustomCorpus();
        const existingEns = new Set(
          existing.map((m) => m.en.toLowerCase().trim()),
        );
        let added = 0,
          skipped = 0;
        for (const m of data.modules) {
          if (!m.en || !m.cn) continue;
          const key = m.en.toLowerCase().trim();
          if (!existingEns.has(key)) {
            existing.push({
              id:
                Date.now().toString(36) +
                Math.random().toString(36).substr(2, 4),
              en: m.en.trim(),
              cn: m.cn.trim(),
              createdAt: Date.now(),
            });
            existingEns.add(key);
            added++;
          } else {
            skipped++;
          }
        }
        this._saveCustomCorpus(existing);
        this._rebuildCustomLevel();
        alert(
          "✅ 导入成功！新增 " +
            added +
            " 条" +
            (skipped > 0 ? "，跳过 " + skipped + " 条重复。" : "。"),
        );
        this._renderCustomMgmt();
      } catch (err) {
        alert("❌ 导入失败：文件格式不正确");
      }
    };
    reader.readAsText(file);
  },

  showCustomMgmt() {
    this.state.view = "custom-mgmt";
    this._showView("custom-mgmt");
    this._renderCustomMgmt();
  },

  _renderCustomMgmt() {
    const area = $("custom-mgmt-area");
    const corpus = this._getCustomCorpus();

    area.innerHTML =
      '<div class="cm-card">' +
      '<div class="cm-card-title">📝 添加语料</div>' +
      '<div class="cm-form">' +
      '<div class="cm-form-row">' +
      '<input class="cm-input" id="cm-en" placeholder="英文（如: I think so）" />' +
      '<input class="cm-input" id="cm-cn" placeholder="中文（如: 我也这么想）" />' +
      "<button class=\"btn cm-add-btn\" onclick=\"ChunkApp.addCustomModule(document.getElementById('cm-en').value, document.getElementById('cm-cn').value)\">添加</button>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="cm-card">' +
      '<div class="cm-card-title">📚 自定义语料（' +
      corpus.length +
      " 条）</div>" +
      (corpus.length === 0
        ? '<div class="cm-empty">还没有添加自定义语料，在上方填写添加。</div>'
        : '<ul class="cm-list">' +
          corpus
            .map(
              (m) =>
                '<li class="cm-list-item">' +
                '<div class="cm-item-text">' +
                '<div class="cm-item-en">' +
                m.en +
                "</div>" +
                '<div class="cm-item-cn">' +
                m.cn +
                "</div>" +
                "</div>" +
                '<div class="cm-item-actions">' +
                '<button class="cm-item-delete" onclick="ChunkApp.removeCustomModule(\'' +
                m.id +
                '\')" title="删除">✕</button>' +
                "</div>" +
                "</li>",
            )
            .join("") +
          "</ul>") +
      "</div>" +
      '<div class="cm-card">' +
      '<div class="cm-card-title">🔁 导入 / 导出</div>' +
      '<div class="cm-actions">' +
      '<button class="btn btn-secondary" onclick="ChunkApp.exportCustomCorpus()">📤 导出语料库</button>' +
      '<label class="btn btn-secondary" style="cursor:pointer">📥 导入语料库' +
      '<input type="file" accept=".json" style="display:none" onchange="ChunkApp.importCustomCorpus(this.files[0]); this.value=\'\'" />' +
      "</label>" +
      "</div>" +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px">导入时自动跳过重复条目（按英文去重）</div>' +
      "</div>";
  },

  // ==================== HOME ====================
  _renderHome() {
    // 复习横幅
    this._renderReviewBanner();

    const grid = $("level-grid");
    if (!grid) return;

    grid.innerHTML = CORPUS.map((level) => {
      const stats = this.calcLevelStats(level.id);
      const unlocked = this.isLevelUnlocked(level.id);
      const completed = this.isLevelCompleted(level.id);
      const pct =
        stats.total > 0
          ? Math.round((stats.speakPassed / stats.total) * 100)
          : 0;

      let lockIcon = "",
        cardStyle = "";
      if (!unlocked) {
        lockIcon = "🔒";
        cardStyle = "opacity:0.5;";
      } else if (completed) {
        lockIcon = "✅";
      } else {
        lockIcon = "🎧";
      }

      return (
        '<div class="level-card" style="' +
        cardStyle +
        '" onclick="' +
        (unlocked
          ? "ChunkApp.selectLevel(" +
            (typeof level.id === "number" ? level.id : "'" + level.id + "'") +
            ")"
          : "") +
        '">' +
        '<div class="level-card-header">' +
        '<span class="level-icon">' +
        lockIcon +
        "</span>" +
        '<span class="level-badge" style="background:' +
        level.color +
        '">' +
        level.id +
        "</span>" +
        '<span class="level-name">' +
        level.name +
        "</span>" +
        "</div>" +
        '<div class="level-stats">' +
        stats.speakPassed +
        "/" +
        stats.total +
        " 通关 · 🗣️ " +
        stats.waitingSpeak +
        " 待开口</div>" +
        '<div class="level-bar"><div class="level-bar-fill" style="width:' +
        pct +
        "%;background:" +
        level.color +
        '"></div></div>' +
        '<div class="level-bar-label">' +
        pct +
        "%</div>" +
        (!unlocked
          ? '<div class="level-locked-msg">完成上一级所有模块后解锁</div>'
          : "") +
        "</div>"
      );
    }).join("");
  },

  // ==================== LEVEL VIEW ====================
  _renderLevel() {
    const level = CORPUS.find((l) => l.id === this.state.currentLevelId);
    if (!level) return;

    $("level-title").textContent = "Lv." + level.id + " " + level.name;
    $("level-title").style.color = level.color;

    const stats = this.calcLevelStats(level.id);
    $("level-stats").innerHTML =
      "📊 " +
      stats.total +
      "个模块 · 🏆 " +
      stats.speakPassed +
      "已通关" +
      (stats.waitingSpeak > 0 ? " · 🗣️ " + stats.waitingSpeak + "待开口" : "") +
      (stats.waitingTest > 0 ? " · ⏱️ " + stats.waitingTest + "待测试" : "") +
      (stats.practicing > 0 ? " · 📝 " + stats.practicing + "练习中" : "");

    // Module list
    const list = $("module-list");
    list.innerHTML = level.modules
      .map(([eng, chn]) => {
        const p = this._getModuleProgress(level.id, eng, chn);
        let statusIcon, statusText;
        if (p.speakPassed) {
          statusIcon = "🏆";
          statusText = "已通关";
        } else if (p.testPassed) {
          statusIcon = "🗣️";
          statusText = "待开口";
        } else if (p.passed) {
          statusIcon = "⏱️";
          statusText = "待测试";
        } else if (p.attempts > 0) {
          statusIcon = "📝";
          statusText = "练习中";
        } else {
          statusIcon = "◻️";
          statusText = "";
        }

        return (
          '<div class="module-item" data-status="' +
          (p.speakPassed
            ? "test-passed"
            : p.testPassed
              ? "speak-waiting"
              : p.passed
                ? "passed"
                : p.attempts > 0
                  ? "in-progress"
                  : "") +
          '">' +
          '<div class="module-left">' +
          '<span class="module-status">' +
          statusIcon +
          "</span>" +
          '<div class="module-text">' +
          '<div class="module-en">' +
          eng +
          "</div>" +
          '<div class="module-cn">' +
          chn +
          "</div>" +
          "</div></div>" +
          '<div class="module-right">' +
          (statusText
            ? '<span class="module-status-text">' + statusText + "</span>"
            : "") +
          "</div></div>"
        );
      })
      .join("");

    // Mode buttons
    const modeBtns = $("level-modes");
    const modes = [
      {
        id: "learn",
        icon: "📖",
        name: "学习模式",
        desc: "听英语 → 看释义 → 再听一遍",
        color: "#3498db",
      },
      {
        id: "practice",
        icon: "🎯",
        name: "听辨模式",
        desc: "听音辨义，连续✓" + CORRECT_TO_PASS + "次达标",
        color: "#e67e22",
      },
      {
        id: "test",
        icon: "⏱️",
        name: "自动化测试",
        desc: "限时" + TEST_TIME_LIMIT + "秒，" + TEST_LIVES + "条命",
        color: "#e74c3c",
      },
      {
        id: "speak",
        icon: "🗣️",
        name: "开口说",
        desc: "看中文，说出或打出英文，验证听懂",
        color: "#9b59b6",
      },
    ];
    modeBtns.innerHTML =
      modes
        .map(
          (m) =>
            '<div class="mode-card" style="border-top:3px solid ' +
            m.color +
            '" onclick="ChunkApp.selectMode(\'' +
            m.id +
            "')\">" +
            '<div class="mode-icon">' +
            m.icon +
            "</div>" +
            '<div class="mode-name">' +
            m.name +
            "</div>" +
            '<div class="mode-desc">' +
            m.desc +
            "</div>" +
            "</div>",
        )
        .join("") +
      (level.id === "custom"
        ? '<div class="mode-card" style="border-top:3px solid #888;background:var(--warn-bg)" onclick="ChunkApp.showCustomMgmt()">' +
          '<div class="mode-icon">📝</div>' +
          '<div class="mode-name">管理语料库</div>' +
          '<div class="mode-desc">添加、删除、导入导出语料</div>' +
          "</div>"
        : "");
  },

  // ==================== TRAINING ====================
  _renderTraining(mode, level) {
    const modeNames = {
      learn: "📖 学习模式",
      practice: "🎯 听辨模式",
      test: "⏱️ 自动化测试",
      speak: "🗣️ 开口说",
      review: "📚 间隔复习",
    };
    $("training-header").innerHTML =
      '<div class="training-title" style="color:' +
      level.color +
      '">Lv.' +
      level.id +
      " " +
      level.name +
      "</div>" +
      '<div class="training-mode">' +
      (modeNames[mode] || mode) +
      "</div>";

    const area = $("training-area");
    area.innerHTML = '<div class="loading">加载中...</div>';

    if (mode === "learn") this._startLearn(level, area);
    else if (mode === "review") this._startReview(level, area);
    else if (mode === "practice") this._startPractice(level, area);
    else if (mode === "test") this._startTest(level, area);
    else if (mode === "speak") this._startSpeak(level, area);
  },

  // --- LEARN MODE ---
  _startLearn(level, area) {
    const modules = level.modules;
    // 找到第一个未学过的模块续播
    let idx = modules.findIndex(([eng]) => {
      const p = this._getModuleProgress(level.id, eng);
      return !p.learnedOnce;
    });
    if (idx < 0) idx = modules.length;

    const renderStep = () => {
      if (idx >= modules.length) {
        area.innerHTML =
          '<div class="completed-view">' +
          '<div class="completed-icon">🎉</div>' +
          '<div class="completed-text">本级 ' +
          modules.length +
          " 个模块已全部学习完毕！</div>" +
          '<button class="btn" onclick="ChunkApp.selectLevel(' +
          level.id +
          ')">返回级别</button>' +
          '<button class="btn btn-secondary" onclick="ChunkApp.selectMode(\'practice\')">进入听辨练习 →</button>' +
          "</div>";
        return;
      }
      const [eng, chn] = modules[idx];
      let playCount = 0;

      area.innerHTML =
        '<div class="learn-card">' +
        '<div class="learn-progress">' +
        (idx + 1) +
        " / " +
        modules.length +
        "</div>" +
        '<div class="learn-icon">🔊</div>' +
        '<div class="learn-eng">' +
        eng +
        "</div>" +
        '<div class="learn-repeat" id="learn-repeat">👂 点击播放</div>' +
        '<div class="learn-hint" id="learn-hint" style="display:none">' +
        '<div class="learn-chn">' +
        chn +
        "</div></div>" +
        '<div class="learn-controls">' +
        '<button class="btn" id="learn-play-btn">🔊 再播一遍</button>' +
        '<button class="btn show-chn-btn" id="learn-show-btn">显示中文 →</button>' +
        '<button class="btn next-btn" id="learn-next-btn" style="display:none">下一个 →</button>' +
        "</div></div>";

      const playBtn = $("learn-play-btn");
      const showBtn = $("learn-show-btn");
      const nextBtn = $("learn-next-btn");
      const hint = $("learn-hint");
      const repeatEl = $("learn-repeat");

      const doPlay = () => {
        playCount++;
        repeatEl.textContent = "👂 第 " + playCount + " 遍";
        AudioManager.speak(eng);
      };

      playBtn.onclick = doPlay;
      doPlay();

      showBtn.onclick = function () {
        hint.style.display = "block";
        showBtn.style.display = "none";
        nextBtn.style.display = "inline-block";
      };
      nextBtn.onclick = function () {
        const p = ChunkApp._getModuleProgress(level.id, eng, chn);
        p.learnedOnce = true;
        ChunkApp._saveProgress();
        idx++;
        renderStep();
      };
    };

    renderStep();
  },

  // --- 复习模式 ---
  _startReview(level, area) {
    const due = this.getDueReviews().filter((p) => p.level === level.id);
    if (due.length === 0) {
      area.innerHTML =
        '<div class="completed-view">' +
        '<div class="completed-icon">🎉</div>' +
        '<div class="completed-text">没有待复习的模块</div>' +
        '<button class="btn" onclick="ChunkApp.showHome()">返回首页</button>' +
        "</div>";
      return;
    }

    const allModules = CORPUS.flatMap((l) => l.modules);
    const active = due.slice();
    let round = 0;

    const renderReview = () => {
      if (active.length === 0) {
        area.innerHTML =
          '<div class="completed-view">' +
          '<div class="completed-icon">🎉</div>' +
          '<div class="completed-text">本轮复习完成！</div>' +
          '<button class="btn" onclick="ChunkApp.showHome()">返回首页</button>' +
          "</div>";
        return;
      }

      const p = active[Math.floor(Math.random() * active.length)];
      const eng = p.eng;
      const chn = p.chn;
      round++;

      // 从全局语料取真实干扰项
      let options = [chn];
      const others = allModules.filter((m) => m[1] !== chn && m[0] !== eng);
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length && options.length < 4; i++) {
        if (!options.includes(shuffled[i][1])) options.push(shuffled[i][1]);
      }
      options.sort(() => Math.random() - 0.5);

      const labels = ["A", "B", "C", "D"];
      area.innerHTML =
        '<div class="practice-header">' +
        '<span class="round-badge">复习第 ' +
        round +
        " 轮</span>" +
        '<span class="passed-badge">剩余 ' +
        active.length +
        " 个</span></div>" +
        '<div class="practice-question">' +
        '<div class="practice-listen-icon">🔊</div>' +
        '<div class="practice-listen-text">听英语，选中文意思</div></div>' +
        '<div class="practice-options" id="practice-options">' +
        options
          .map(
            (opt, i) =>
              '<div class="practice-opt" data-chn="' +
              chn +
              '" data-correct="' +
              (opt === chn ? "1" : "0") +
              '">' +
              '<span class="opt-label">' +
              labels[i] +
              "</span>" +
              '<span class="opt-text">' +
              opt +
              "</span></div>",
          )
          .join("") +
        "</div>" +
        '<div id="practice-feedback" style="display:none"></div>';

      setTimeout(() => AudioManager.speak(eng), 300);

      const optsContainer = $("practice-options");
      const handler = (e) => {
        const el = e.target.closest(".practice-opt");
        if (!el || el.classList.contains("disabled")) return;
        optsContainer.removeEventListener("click", handler);
        document
          .querySelectorAll(".practice-opt")
          .forEach((o) => o.classList.add("disabled"));

        const feedback = $("practice-feedback");
        const isCorrect = el.dataset.correct === "1";

        if (isCorrect) {
          el.classList.add("correct");
          feedback.innerHTML =
            '<div class="feedback correct">✓ 正确！复习通过</div>';
          this._advanceReview(eng, level.id);
          // 从 active 移除
          const removeIdx = active.findIndex((a) => a.eng === eng);
          if (removeIdx > -1) active.splice(removeIdx, 1);
        } else {
          el.classList.add("wrong");
          document.querySelectorAll(".practice-opt").forEach((o) => {
            if (o.dataset.correct === "1") o.classList.add("correct");
          });
          feedback.innerHTML =
            '<div class="feedback wrong">✗ 正确答案: ' + chn + "</div>";
        }
        feedback.style.display = "block";
        setTimeout(renderReview, 1800);
      };
      optsContainer.addEventListener("click", handler);
    };

    renderReview();
  },

  // --- PRACTICE MODE ---
  _startPractice(level, area) {
    const modules = level.modules;
    const allModules = CORPUS.flatMap((l) => l.modules);
    let round = 0;

    const getActive = () =>
      modules.filter(([eng]) => {
        const p = this._getModuleProgress(level.id, eng);
        return !p.testPassed && !p.passed;
      });

    let active = getActive();

    if (active.length === 0) {
      area.innerHTML =
        '<div class="completed-view">' +
        '<div class="completed-icon">🏆</div>' +
        '<div class="completed-text">本级所有模块已达标！可以进入自动化测试</div>' +
        '<button class="btn" onclick="ChunkApp.selectMode(\'test\')">进入自动化测试 →</button>' +
        '<button class="btn btn-secondary" onclick="ChunkApp.selectLevel(' +
        level.id +
        ')">返回</button></div>';
      return;
    }

    const renderPractice = () => {
      active = getActive();
      if (active.length === 0) {
        this._startPractice(level, area);
        return;
      }

      const [eng, chn] = active[Math.floor(Math.random() * active.length)];
      const p = this._getModuleProgress(level.id, eng, chn);
      round++;

      // 从全局语料取真实干扰项
      let options = [chn];
      const others = allModules.filter((m) => m[1] !== chn && m[0] !== eng);
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length && options.length < 4; i++) {
        if (!options.includes(shuffled[i][1])) options.push(shuffled[i][1]);
      }
      options.sort(() => Math.random() - 0.5);

      const labels = ["A", "B", "C", "D"];
      const stats = this.calcLevelStats(level.id);

      area.innerHTML =
        '<div class="practice-header">' +
        '<span class="round-badge">第 ' +
        round +
        " 轮</span>" +
        '<span class="passed-badge">🏆 ' +
        stats.testPassed +
        "/" +
        modules.length +
        " · ⏱️ " +
        stats.waitingTest +
        "</span></div>" +
        '<div class="practice-remaining">剩余 ' +
        active.length +
        " 个待攻克</div>" +
        '<div class="practice-question">' +
        '<div class="practice-listen-icon">🔊</div>' +
        '<div class="practice-listen-text">听英语，选中文意思</div></div>' +
        '<div class="practice-options" id="practice-options">' +
        options
          .map(
            (opt, i) =>
              '<div class="practice-opt" data-chn="' +
              chn +
              '" data-level="' +
              level.id +
              '" data-eng="' +
              eng +
              '" data-correct="' +
              (opt === chn ? "1" : "0") +
              '">' +
              '<span class="opt-label">' +
              labels[i] +
              "</span>" +
              '<span class="opt-text">' +
              opt +
              "</span></div>",
          )
          .join("") +
        "</div>" +
        '<div id="practice-feedback" style="display:none"></div>' +
        '<div class="practice-streak">🔥 连续正确: ' +
        p.correctInRow +
        " / " +
        CORRECT_TO_PASS +
        "</div>";

      setTimeout(() => AudioManager.speak(eng), 300);

      const optsContainer = $("practice-options");
      const handler = (e) => {
        const el = e.target.closest(".practice-opt");
        if (!el || el.classList.contains("disabled")) return;
        optsContainer.removeEventListener("click", handler);
        document
          .querySelectorAll(".practice-opt")
          .forEach((o) => o.classList.add("disabled"));

        const feedback = $("practice-feedback");
        const correctChn = el.dataset.chn;
        const isCorrect = el.dataset.correct === "1";
        const modLevel = parseInt(el.dataset.level);
        const modEng = el.dataset.eng;
        const modP = this._getModuleProgress(modLevel, modEng, correctChn);

        if (isCorrect) {
          modP.correctInRow++;
          modP.correct++;
          el.classList.add("correct");
          feedback.innerHTML =
            '<div class="feedback correct">✓ 正确！(连续' +
            modP.correctInRow +
            "次)</div>";

          if (modP.correctInRow >= CORRECT_TO_PASS) {
            modP.passed = true;
            feedback.innerHTML =
              '<div class="feedback correct">🏆 达标！该模块已通过！</div>';
          }
        } else {
          modP.correctInRow = 0;
          el.classList.add("wrong");
          document.querySelectorAll(".practice-opt").forEach((o) => {
            if (o.dataset.correct === "1") o.classList.add("correct");
          });
          feedback.innerHTML =
            '<div class="feedback wrong">✗ 正确答案: ' + correctChn + "</div>";
        }

        modP.attempts++;
        this._saveProgress();
        feedback.style.display = "block";
        setTimeout(renderPractice, 1800);
      };
      optsContainer.addEventListener("click", handler);
    };

    renderPractice();
  },

  // --- TEST MODE ---
  _startTest(level, area) {
    const modules = level.modules;
    const allModules = CORPUS.flatMap((l) => l.modules);

    let lives = TEST_LIVES,
      passed = 0,
      failed = 0;
    let currentEng = "",
      currentChn = "";

    const nextRound = () => {
      const testable = modules.filter(([eng]) => {
        const p = this._getModuleProgress(level.id, eng);
        return p.passed && !p.testPassed;
      });

      if (testable.length === 0) {
        area.innerHTML =
          '<div class="completed-view">' +
          '<div class="completed-icon">🎉</div>' +
          '<div class="completed-text">自动化测试完成！<br>✅ 通关 ' +
          passed +
          " 个 · ❌ 退回 " +
          failed +
          " 个 · ❤️ 剩余 " +
          lives +
          " 命</div>" +
          '<button class="btn" onclick="ChunkApp.selectLevel(' +
          level.id +
          ')">返回</button></div>';
        return;
      }

      if (lives <= 0) {
        this._saveProgress();
        area.innerHTML =
          '<div class="completed-view">' +
          '<div class="completed-icon">💪</div>' +
          '<div class="completed-text">生命耗尽！<br>✅ 通关 ' +
          passed +
          " 个 · ❌ 退回练习 " +
          failed +
          " 个 · ⏳ 剩余 " +
          testable.length +
          " 个下次再测</div>" +
          '<button class="btn" onclick="ChunkApp.selectMode(\'practice\')">返回听辨练习</button>' +
          '<button class="btn btn-secondary" onclick="ChunkApp.selectLevel(' +
          level.id +
          ')">返回级别</button></div>';
        return;
      }

      const pickIdx = Math.floor(Math.random() * testable.length);
      const [eng, chn] = testable[pickIdx];
      currentEng = eng;
      currentChn = chn;
      const p = this._getModuleProgress(level.id, eng, chn);

      // 从全局语料取真实干扰项
      let options = [chn];
      const others = allModules.filter((m) => m[1] !== chn && m[0] !== eng);
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length && options.length < 4; i++) {
        if (!options.includes(shuffled[i][1])) options.push(shuffled[i][1]);
      }
      options.sort(() => Math.random() - 0.5);

      const labels = ["A", "B", "C", "D"];
      let answered = false;

      area.innerHTML =
        '<div class="test-header">' +
        '<span class="test-progress">' +
        passed +
        "/" +
        modules.length +
        " 通关</span>" +
        '<span class="test-lives">' +
        "❤️".repeat(lives) +
        "🖤".repeat(TEST_LIVES - lives) +
        "</span></div>" +
        '<div class="test-question">' +
        '<div class="test-listen-icon">🔊</div>' +
        '<div class="test-timer" id="test-timer">⏱️ ' +
        TEST_TIME_LIMIT +
        "s</div>" +
        '<div style="margin-top:6px;font-size:0.85em;color:#888;">' +
        (p.testCheck ? "🔄 再次验证中" : "🆕 第一次验证") +
        "</div></div>" +
        '<div class="test-options" id="test-options">' +
        options
          .map(
            (opt, i) =>
              '<div class="practice-opt test-opt" data-correct="' +
              (opt === chn ? "1" : "0") +
              '" data-chn="' +
              chn +
              '">' +
              '<span class="opt-label">' +
              labels[i] +
              "</span>" +
              '<span class="opt-text">' +
              opt +
              "</span></div>",
          )
          .join("") +
        "</div>" +
        '<div id="test-feedback" style="display:none"></div>';

      AudioManager.speak(eng);

      const optionsContainer = $("test-options");
      const handler = (e) => {
        const el = e.target.closest(".test-opt");
        if (!el || el.classList.contains("disabled")) return;
        optionsContainer.removeEventListener("click", handler);
        answered = true;
        clearInterval(timer);
        document
          .querySelectorAll(".test-opt")
          .forEach((o) => o.classList.add("disabled"));

        const feedback = $("test-feedback");
        const isCorrect = el.dataset.correct === "1";
        const pMod = this._getModuleProgress(level.id, currentEng, currentChn);

        if (isCorrect) {
          if (pMod.testCheck) {
            pMod.testPassed = true;
            pMod.testCheck = false;
            // 进入间隔复习
            pMod.reviewStage = 0;
            pMod.lastReviewTime = Date.now();
            passed++;
            el.classList.add("correct");
            feedback.innerHTML =
              '<div class="feedback correct">🏆 通关！两次验证均通过！</div>';
          } else {
            pMod.testCheck = true;
            el.classList.add("correct");
            feedback.innerHTML =
              '<div class="feedback correct">✓ 正确！还需再验证一次（防盲猜）</div>';
          }
        } else {
          el.classList.add("wrong");
          pMod.passed = false;
          pMod.correctInRow = 0;
          pMod.testCheck = false;
          lives--;
          failed++;
          feedback.innerHTML =
            '<div class="feedback wrong">✗ 正确答案: ' +
            currentChn +
            " · 退回听辨模式 · 生命 -1</div>";
        }

        pMod.attempts++;
        this._saveProgress();
        feedback.style.display = "block";
        setTimeout(() => nextRound(), 2000);
      };
      optionsContainer.addEventListener("click", handler);

      let timeLeft = TEST_TIME_LIMIT;
      const timerEl = $("test-timer");
      const timer = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.textContent = "⏱️ " + timeLeft + "s";
        if (timeLeft <= 0 && !answered) {
          clearInterval(timer);
          answered = true;
          optionsContainer.removeEventListener("click", handler);
          document
            .querySelectorAll(".test-opt")
            .forEach((o) => o.classList.add("disabled"));
          const pMod = this._getModuleProgress(
            level.id,
            currentEng,
            currentChn,
          );
          pMod.passed = false;
          pMod.correctInRow = 0;
          pMod.testCheck = false;
          lives--;
          failed++;
          this._saveProgress();
          const feedback = $("test-feedback");
          feedback.innerHTML =
            '<div class="feedback wrong">⏰ 超时！正确答案: ' +
            currentChn +
            "</div>";
          feedback.style.display = "block";
          setTimeout(() => nextRound(), 2000);
        }
      }, 1000);
    };

    const initialTestable = modules.filter(([eng]) => {
      const p = this._getModuleProgress(level.id, eng);
      return p.passed && !p.testPassed;
    });

    if (initialTestable.length === 0) {
      const allDone = modules.every(([eng]) => {
        const p = this._getModuleProgress(level.id, eng);
        return p.testPassed;
      });
      area.innerHTML = allDone
        ? '<div class="completed-view"><div class="completed-icon">🏆🏆🏆</div>' +
          '<div class="completed-text">🎉 本级全部通关！所有模块已通过自动化测试！</div>' +
          '<button class="btn" onclick="ChunkApp.selectLevel(' +
          level.id +
          ')">返回</button></div>'
        : '<div class="completed-view"><div class="completed-icon">⚠️</div>' +
          '<div class="completed-text">尚无待测模块。请先进入听辨模式练习，达标后再来测试。</div>' +
          '<button class="btn" onclick="ChunkApp.selectMode(\'practice\')">去练习 →</button>' +
          '<button class="btn btn-secondary" onclick="ChunkApp.selectLevel(' +
          level.id +
          ')">返回</button></div>';
      return;
    }

    nextRound();
  },

  // --- SPEAK MODE (开口说) ---
  _startSpeak(level, area) {
    const modules = level.modules;

    const getSpeakable = () =>
      modules.filter(([eng]) => {
        const p = this._getModuleProgress(level.id, eng);
        return p.testPassed && !p.speakPassed;
      });

    let active = getSpeakable();
    let round = 0;

    if (active.length === 0) {
      const allDone = modules.every(([eng]) => {
        const p = this._getModuleProgress(level.id, eng);
        return p.speakPassed;
      });
      area.innerHTML = allDone
        ? '<div class="completed-view"><div class="completed-icon">🏆🏆🏆</div>' +
          '<div class="completed-text">🎉 本级全部通关！所有模块已通过开口说测试！</div>' +
          '<button class="btn" onclick="ChunkApp.selectLevel(' +
          level.id +
          ')">返回</button></div>'
        : '<div class="completed-view"><div class="completed-icon">⚠️</div>' +
          '<div class="completed-text">尚无待开口模块。请先通过自动化测试，再来开口说。</div>' +
          '<button class="btn" onclick="ChunkApp.selectMode(\'test\')">去测试 →</button>' +
          '<button class="btn btn-secondary" onclick="ChunkApp.selectLevel(' +
          level.id +
          ')">返回</button></div>';
      return;
    }

    const renderSpeak = () => {
      delete area.dataset.speakRetry;
      active = getSpeakable();
      if (active.length === 0) {
        area.innerHTML =
          '<div class="completed-view"><div class="completed-icon">🎉</div>' +
          '<div class="completed-text">开口说全部完成！</div>' +
          '<button class="btn" onclick="ChunkApp.selectLevel(' +
          level.id +
          ')">返回</button></div>';
        return;
      }

      const [eng, chn] = active[Math.floor(Math.random() * active.length)];
      const p = this._getModuleProgress(level.id, eng, chn);
      round++;

      area.innerHTML =
        '<div class="speak-header">' +
        '<span class="round-badge">第 ' +
        round +
        " 轮</span>" +
        '<span class="passed-badge">剩余 ' +
        active.length +
        " 个</span></div>" +
        '<div class="speak-card">' +
        '<div class="speak-chn">' +
        chn +
        "</div>" +
        '<div class="speak-hint">说或写都行，意思对就过 👇</div>' +
        '<div class="speak-mic-area" id="speak-mic-area">' +
        '<input type="text" id="speak-input" class="speak-input" placeholder="输入英文..." autofocus />' +
        '<div style="margin-top:8px;display:flex;gap:8px;justify-content:center">' +
        '<button class="btn" id="speak-submit-btn">确认</button>' +
        (SR
          ? '<button class="btn btn-secondary" id="speak-mic-btn">🎤 说</button>'
          : "") +
        "</div></div>" +
        '<div class="speak-result" id="speak-result" style="display:none"></div>' +
        '<div class="speak-feedback" id="speak-feedback" style="display:none"></div></div>';

      // 提交判断
      const doCheck = (text) => {
        this._checkSpeakAnswer(text, eng, chn, p, area, renderSpeak);
      };

      $("speak-submit-btn").onclick = () => doCheck($("speak-input").value);
      $("speak-input").onkeydown = (e) => {
        if (e.key === "Enter") doCheck($("speak-input").value);
      };
      $("speak-input").focus();

      // 语音识别（可选附加）
      if (SR && $("speak-mic-btn")) {
        $("speak-mic-btn").onclick = () => {
          try {
            const rec = new SR();
            rec.lang = "en-US";
            rec.continuous = false;
            rec.interimResults = false;
            rec.maxAlternatives = 1;
            rec.onresult = (e) => {
              const t = e.results[0][0].transcript.trim();
              $("speak-input").value = t;
              doCheck(t);
            };
            rec.onerror = () => {
              $("speak-feedback").style.display = "block";
              $("speak-feedback").innerHTML =
                '<div class="feedback wrong">⚠️ 没识别出来，打字也行</div>';
            };
            rec.start();
          } catch (err) {
            $("speak-feedback").style.display = "block";
            $("speak-feedback").innerHTML =
              '<div class="feedback wrong">⚠️ ' + err.message + "</div>";
          }
        };
      }
    };

    renderSpeak();
  },

  _checkSpeakAnswer(userText, expectedEng, chn, p, area, callback) {
    const fb = $("speak-feedback");
    fb.style.display = "block";

    const normalize = (s) =>
      s
        .toLowerCase()
        .replace(/[^\w\s']/g, "")
        .trim();

    const normUser = normalize(userText);
    const normExpected = normalize(expectedEng);

    // 精确匹配
    if (normUser === normExpected) {
      p.speakPassed = true;
      this._saveProgress();
      fb.innerHTML = '<div class="feedback correct">✅ 正确！</div>';
      setTimeout(callback, 1200);
      return;
    }

    // 冠词容错 (a/an/the)
    const stripArticle = (s) => s.replace(/\b(a|an|the)\s+/g, "").trim();
    if (stripArticle(normUser) === stripArticle(normExpected)) {
      p.speakPassed = true;
      this._saveProgress();
      fb.innerHTML = '<div class="feedback correct">✅ 正确！</div>';
      setTimeout(callback, 1200);
      return;
    }

    // 拼写容错（较长字符串）
    if (
      normUser.length > 4 &&
      normExpected.length > 4 &&
      this._levenshtein(normUser, normExpected) <=
        Math.max(1, Math.floor(normExpected.length * 0.2))
    ) {
      p.speakPassed = true;
      this._saveProgress();
      fb.innerHTML = '<div class="feedback correct">✅ 正确！</div>';
      setTimeout(callback, 1200);
      return;
    }

    // 不对 → 重试或显示答案
    const isRetry = area.dataset.speakRetry === "1";

    if (!isRetry) {
      // 第一次不对，给重试机会
      area.dataset.speakRetry = "1";
      const hint = expectedEng.replace(/\b(\w)\w+/g, "$1___");

      fb.innerHTML =
        '<div class="feedback wrong" id="speak-fb-text">❌ 不对，再试试</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">' +
        '<button class="btn" id="speak-retry-btn">再试一次</button>' +
        '<button class="btn btn-secondary" id="speak-hint-btn">💡 提示</button>' +
        '<button class="btn btn-secondary" id="speak-skip-btn">跳过 →</button></div>';

      const doRetry = () => {
        $("speak-input").focus();
        this._checkSpeakAnswer(
          $("speak-input").value,
          expectedEng,
          chn,
          p,
          area,
          callback,
        );
      };
      const doSkip = () => {
        delete area.dataset.speakRetry;
        fb.innerHTML = "";
        fb.style.display = "none";
        callback();
      };

      setTimeout(() => {
        const retryBtn = $("speak-retry-btn");
        const hintBtn = $("speak-hint-btn");
        const skipBtn = $("speak-skip-btn");
        if (retryBtn) retryBtn.onclick = doRetry;
        if (hintBtn)
          hintBtn.onclick = () => {
            const t = $("speak-fb-text");
            if (t) t.textContent = "💡 " + hint;
          };
        if (skipBtn) skipBtn.onclick = doSkip;
      }, 50);
    } else {
      // 第二次不对 → 显示正确答案
      delete area.dataset.speakRetry;
      fb.innerHTML =
        '<div class="feedback wrong">期望：<strong>' +
        expectedEng +
        "</strong></div>" +
        '<button class="btn" id="speak-skip-btn" style="margin-top:12px">继续 →</button>';

      setTimeout(() => {
        const btn = $("speak-skip-btn");
        if (btn)
          btn.onclick = () => {
            fb.innerHTML = "";
            fb.style.display = "none";
            callback();
          };
      }, 50);
    }
  },

  _levenshtein(a, b) {
    const m = a.length,
      n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    return dp[m][n];
  },

  // ==================== 导出/导入 ====================
  exportProgress() {
    const data = JSON.stringify(this.state.progress, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "chunkear-progress-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  },

  importProgress(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // 合并：保留已有的，导入新数据
        for (const key in data) {
          if (!this.state.progress[key]) {
            this.state.progress[key] = data[key];
          }
        }
        this._saveProgress();
        alert(
          "✅ 导入成功！共合并 " + Object.keys(data).length + " 个模块的进度。",
        );
        this.showHome();
      } catch (err) {
        alert("❌ 导入失败：文件格式不正确");
      }
    };
    reader.readAsText(file);
  },
};
