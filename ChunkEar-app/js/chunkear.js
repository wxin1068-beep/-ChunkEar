// ChunkEar PWA — 主应用逻辑
const CORRECT_TO_PASS = 3;  // 连续正确3次达标
const TEST_TIME_LIMIT = 6;  // 自动化测试限时6秒
const TEST_LIVES = 3;       // 3条命

const ChunkApp = {
  state: {
    view: 'home',
    currentLevelId: null,
    currentModuleIdx: null,
    mode: null,           // 'learn' | 'practice' | 'test'
    progress: {},         // { 'L0_Hello.': { correctInRow, attempts, correct, passed } }
  },

  // ==================== INIT ====================
  init() {
    AudioManager.init();
    this._loadProgress();
    this.showHome();
    // 语音列表加载后刷新选择器
    if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this._loadVoiceSettings();
    }
  },

  // ==================== VOICE SETTINGS ====================

  _loadVoiceSettings() {
    const voices = AudioManager.getEnglishVoices();
    const select = document.getElementById('voice-select');
    if (!select) return;

    const saved = localStorage.getItem('chunkear-voice') || '';
    select.innerHTML = voices.map(v =>
      `<option value="${v.name}" ${v.name === saved ? 'selected' : ''}>${v.name} (${v.lang})</option>`
    ).join('');

    const status = document.getElementById('voice-status');
    status.textContent = voices.length > 0
      ? `找到 ${voices.length} 个英语语音 · 当前: ${AudioManager.getVoiceName()}`
      : '⚠️ 未找到英语语音，使用系统默认';

    select.onchange = function() {
      AudioManager.setVoice(this.value);
      document.getElementById('voice-status').textContent = `已切换至: ${this.value}`;
      // 自动播放试听
      setTimeout(() => { AudioManager.speak('Hello. How are you today?'); }, 300);
    };
  },

  testVoice() {
    AudioManager.speak('Hello. Nice to meet you. Welcome to ChunkEar.');
    document.getElementById('voice-status').textContent = '▶ 正在试听...';
    setTimeout(() => {
      document.getElementById('voice-status').textContent =
        `当前: ${AudioManager.getVoiceName()}`;
    }, 2000);
  },

  // ==================== NAVIGATION ====================
  showHome() {
    this.state.view = 'home';
    this.state.currentLevelId = null;
    this.state.currentModuleIdx = null;
    this.state.mode = null;
    this._showView('home');
    this._renderHome();
  },

  selectLevel(levelId) {
    this.state.currentLevelId = levelId;
    this.state.currentModuleIdx = null;
    this.state.mode = null;
    this.state.view = 'level';
    this._showView('level');
    this._renderLevel();
  },

  selectMode(mode) {
    const level = CORPUS.find(l => l.id === this.state.currentLevelId);
    if (!level) return;
    this.state.mode = mode;
    this.state.view = 'training';
    this._showView('training');
    this._renderTraining(mode, level);
  },

  goBack() {
    if (this.state.view === 'level') this.showHome();
    else if (this.state.view === 'training') this.selectLevel(this.state.currentLevelId);
  },

  _showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + viewId);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ==================== PROGRESS ====================
  _key(levelId, eng) { return `L${levelId}_${eng}`; },

  _getModuleProgress(levelId, eng, chn) {
    const k = this._key(levelId, eng);
    if (!this.state.progress[k]) {
      this.state.progress[k] = { eng, chn, level: levelId, correctInRow: 0, attempts: 0, correct: 0, passed: false };
    }
    return this.state.progress[k];
  },

  _saveProgress() {
    try {
      localStorage.setItem('chunkear-progress', JSON.stringify(this.state.progress));
    } catch(e) {}
  },

  _loadProgress() {
    try {
      const saved = localStorage.getItem('chunkear-progress');
      if (saved) this.state.progress = JSON.parse(saved);
    } catch(e) {}
  },

  calcLevelStats(levelId) {
    const level = CORPUS.find(l => l.id === levelId);
    if (!level) return { total: 0, passed: 0, practicing: 0 };
    let passed = 0, practicing = 0;
    level.modules.forEach(([eng]) => {
      const p = this.state.progress[this._key(levelId, eng)];
      if (p && p.passed) passed++;
      else if (p && p.attempts > 0) practicing++;
    });
    return { total: level.modules.length, passed, practicing };
  },

  isLevelUnlocked(levelId) {
    if (levelId === 0) return true;
    const prev = CORPUS.find(l => l.id === levelId - 1);
    if (!prev) return true;
    return prev.modules.every(([eng]) => {
      const p = this.state.progress[this._key(levelId - 1, eng)];
      return p && p.passed;
    });
  },

  isLevelCompleted(levelId) {
    const level = CORPUS.find(l => l.id === levelId);
    if (!level) return false;
    return level.modules.every(([eng]) => {
      const p = this.state.progress[this._key(levelId, eng)];
      return p && p.passed;
    });
  },

  // ==================== HOME ====================
  _renderHome() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;

    grid.innerHTML = CORPUS.map(level => {
      const stats = this.calcLevelStats(level.id);
      const unlocked = this.isLevelUnlocked(level.id);
      const completed = this.isLevelCompleted(level.id);
      const pct = stats.total > 0 ? Math.round(stats.passed / stats.total * 100) : 0;
      const barW = Math.round(pct / 5);

      let lockIcon = '', cardStyle = '';
      if (!unlocked) {
        lockIcon = '🔒';
        cardStyle = 'opacity:0.5;';
      } else if (completed) {
        lockIcon = '✅';
      } else {
        lockIcon = '🎧';
      }

      return `
        <div class="level-card" style="${cardStyle}" onclick="${unlocked ? `ChunkApp.selectLevel(${level.id})` : ''}">
          <div class="level-card-header">
            <span class="level-icon">${lockIcon}</span>
            <span class="level-badge" style="background:${level.color}">${level.id}</span>
            <span class="level-name">${level.name}</span>
          </div>
          <div class="level-stats">${stats.passed}/${stats.total} 达标</div>
          <div class="level-bar"><div class="level-bar-fill" style="width:${pct}%;background:${level.color}"></div></div>
          <div class="level-bar-label">${pct}%</div>
          ${!unlocked ? '<div class="level-locked-msg">完成上一级所有模块后解锁</div>' : ''}
        </div>
      `;
    }).join('');
  },

  // ==================== LEVEL VIEW ====================
  _renderLevel() {
    const level = CORPUS.find(l => l.id === this.state.currentLevelId);
    if (!level) return;

    document.getElementById('level-title').textContent = `Lv.${level.id} ${level.name}`;
    document.getElementById('level-title').style.color = level.color;

    const stats = this.calcLevelStats(level.id);
    document.getElementById('level-stats').innerHTML =
      `📊 ${stats.total}个模块 · ✅ ${stats.passed}已达标 · ${stats.practicing > 0 ? `📝 ${stats.practicing}练习中` : ''}`;

    // Module list
    const list = document.getElementById('module-list');
    list.innerHTML = level.modules.map(([eng, chn], idx) => {
      const p = this._getModuleProgress(level.id, eng, chn);
      let status = 'pending', statusIcon = '◻️', statusText = '';
      if (p.passed) {
        status = 'passed';
        statusIcon = '✅';
        statusText = '已达标';
      } else if (p.attempts > 0) {
        status = 'in-progress';
        statusIcon = '📝';
        const need = CORRECT_TO_PASS - p.correctInRow;
        statusText = need > 0 ? `还需连续✓${need}次` : '即将达标！';
      }
      return `
        <div class="module-item" data-status="${status}">
          <div class="module-left">
            <span class="module-status">${statusIcon}</span>
            <div class="module-text">
              <div class="module-en">${eng}</div>
              <div class="module-cn">${chn}</div>
            </div>
          </div>
          <div class="module-right">
            ${statusText ? `<span class="module-status-text">${statusText}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Mode buttons
    const modeBtns = document.getElementById('level-modes');
    const modes = [
      { id: 'learn', icon: '📖', name: '学习模式', desc: '听英语 → 看释义 → 再听一遍', color: '#3498db' },
      { id: 'practice', icon: '🎯', name: '听辨模式', desc: `听音辨义，连续✓${CORRECT_TO_PASS}次达标`, color: '#e67e22' },
      { id: 'test', icon: '⏱️', name: '自动化测试', desc: `限时${TEST_TIME_LIMIT}秒，${TEST_LIVES}条命，检验真功夫`, color: '#e74c3c' },
    ];
    modeBtns.innerHTML = modes.map(m => `
      <div class="mode-card" style="border-top:3px solid ${m.color}" onclick="ChunkApp.selectMode('${m.id}')">
        <div class="mode-icon">${m.icon}</div>
        <div class="mode-name">${m.name}</div>
        <div class="mode-desc">${m.desc}</div>
      </div>
    `).join('');
  },

  // ==================== TRAINING ====================
  _renderTraining(mode, level) {
    const modules = level.modules;
    const header = document.getElementById('training-header');
    const modeNames = { learn: '📖 学习模式', practice: '🎯 听辨模式', test: '⏱️ 自动化测试' };
    header.innerHTML = `
      <div class="training-title" style="color:${level.color}">Lv.${level.id} ${level.name}</div>
      <div class="training-mode">${modeNames[mode] || mode}</div>
    `;

    const area = document.getElementById('training-area');
    area.innerHTML = '<div class="loading">加载中...</div>';

    if (mode === 'learn') this._startLearn(level, area);
    else if (mode === 'practice') this._startPractice(level, area);
    else if (mode === 'test') this._startTest(level, area);
  },

  // --- LEARN MODE ---
  _startLearn(level, area) {
    const modules = level.modules;
    let idx = 0;

    const renderStep = () => {
      if (idx >= modules.length) {
        area.innerHTML = `
          <div class="completed-view">
            <div class="completed-icon">🎉</div>
            <div class="completed-text">本级 ${modules.length} 个模块已全部学习完毕！</div>
            <button class="btn" onclick="ChunkApp.selectLevel(${level.id})">返回级别</button>
            <button class="btn btn-secondary" onclick="ChunkApp.selectMode('practice')">进入听辨练习 →</button>
          </div>
        `;
        return;
      }
      const [eng, chn] = modules[idx];
      area.innerHTML = `
        <div class="learn-card">
          <div class="learn-progress">${idx + 1} / ${modules.length}</div>
          <div class="learn-icon">🔊</div>
          <div class="learn-eng">${eng}</div>
          <div class="learn-repeat" id="learn-repeat">👂 第 1 遍</div>
          <div class="learn-hint" id="learn-hint" style="display:none">
            <div class="learn-chn">${chn}</div>
          </div>
          <div class="learn-controls">
            <button class="btn show-chn-btn" id="learn-show-btn" style="display:none">显示中文 →</button>
            <button class="btn next-btn" id="learn-next-btn" style="display:none">下一个 →</button>
          </div>
        </div>
      `;

      const showBtn = document.getElementById('learn-show-btn');
      const nextBtn = document.getElementById('learn-next-btn');
      const hint = document.getElementById('learn-hint');
      const repeatEl = document.getElementById('learn-repeat');

      // 用当前已选的声音，常速连读3遍
      let repeatCount = 0;
      const maxRepeats = 3;

      const playRepeat = () => {
        if (repeatCount >= maxRepeats) {
          repeatEl.textContent = '✅ 播放完毕';
          showBtn.style.display = 'inline-block';
          ChunkApp._getModuleProgress(level.id, eng, chn);
          ChunkApp._saveProgress();
          return;
        }
        repeatCount++;
        repeatEl.textContent = `👂 第 ${repeatCount} 遍 (共${maxRepeats}遍)`;
        // 播完一遍再播下一遍，用回调确保不打断
        AudioManager.speak(eng, function() {
          setTimeout(playRepeat, 600);
        });
      };

      setTimeout(playRepeat, 500);

      showBtn.onclick = function() {
        hint.style.display = 'block';
        showBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
      };

      nextBtn.onclick = function() {
        idx++;
        renderStep();
      };
    };

    renderStep();
  },

  // --- PRACTICE MODE (4-option listening) ---
  _startPractice(level, area) {
    const modules = level.modules;
    const allModules = CORPUS.flatMap(l => l.modules);
    let round = 0;

    // 取未达标的模块
    let active = modules.filter(([eng]) => {
      const p = this._getModuleProgress(level.id, eng);
      return !p.passed;
    });

    if (active.length === 0) {
      area.innerHTML = `
        <div class="completed-view">
          <div class="completed-icon">🏆</div>
          <div class="completed-text">本级所有模块已达标！可以进入自动化测试</div>
          <button class="btn" onclick="ChunkApp.selectMode('test')">进入自动化测试 →</button>
          <button class="btn btn-secondary" onclick="ChunkApp.selectLevel(${level.id})">返回</button>
        </div>
      `;
      return;
    }

    const renderPractice = () => {
      // 重新检查是否有新的达标模块
      active = modules.filter(([eng]) => {
        const p = this._getModuleProgress(level.id, eng);
        return !p.passed;
      });

      if (active.length === 0) {
        this._startPractice(level, area);
        return;
      }

      const [eng, chn] = active[Math.floor(Math.random() * active.length)];
      const p = this._getModuleProgress(level.id, eng, chn);
      round++;

      // 生成4个选项
      let options = [chn];
      const others = allModules.filter(m => m[1] !== chn && m[0] !== eng);
      for (let i = 0; i < 3 && i < others.length; i++) {
        const pick = others.splice(Math.floor(Math.random() * others.length), 1)[0];
        options.push(pick[1]);
      }
      options.sort(() => Math.random() - 0.5);

      const labels = ['A', 'B', 'C', 'D'];
      const passedCount = modules.filter(([e]) => {
        const pp = this._getModuleProgress(level.id, e);
        return pp.passed;
      }).length;

      area.innerHTML = `
        <div class="practice-header">
          <span class="round-badge">第 ${round} 轮</span>
          <span class="passed-badge">✅ ${passedCount}/${modules.length} 已达标</span>
        </div>
        <div class="practice-remaining">剩余 ${active.length} 个待攻克</div>
        <div class="practice-question">
          <div class="practice-listen-icon">🔊</div>
          <div class="practice-listen-text" id="practice-text">听英语，选中文意思</div>
        </div>
        <div class="practice-options" id="practice-options">
          ${options.map((opt, i) => `
            <div class="practice-opt" data-opt="${opt}" onclick="ChunkApp._onPracticeAnswer(this, '${options.indexOf(chn)}', '${i}')">
              <span class="opt-label">${labels[i]}</span>
              <span class="opt-text">${opt}</span>
            </div>
          `).join('')}
        </div>
        <div id="practice-feedback" style="display:none"></div>
        <div class="practice-streak">🔥 当前连续正确: ${p.correctInRow} / ${CORRECT_TO_PASS}</div>
      `;

      // 播放英语
      setTimeout(() => AudioManager.speak(eng), 300);
    };

    // Override answer handler
    this._onPracticeAnswer = (el, correctIdxStr, chosenIdxStr) => {
      if (el.classList.contains('disabled')) return;
      document.querySelectorAll('.practice-opt').forEach(o => o.classList.add('disabled'));

      const correctIdx = parseInt(correctIdxStr);
      const chosenIdx = parseInt(chosenIdxStr);
      const allOpts = document.querySelectorAll('.practice-opt');
      const eng = active[0] ? active[0][0] : '';

      // 获取当前模块进度
      const currentModule = active.find(([e]) => e === eng) || active[0];
      if (!currentModule) return;
      const p = this._getModuleProgress(level.id, currentModule[0], currentModule[1]);

      if (chosenIdx === correctIdx) {
        p.correctInRow++;
        p.correct++;
        el.classList.add('correct');
        document.getElementById('practice-feedback').innerHTML =
          `<div class="feedback correct">✓ 正确！(连续${p.correctInRow}次)</div>`;

        if (p.correctInRow >= CORRECT_TO_PASS) {
          p.passed = true;
          document.getElementById('practice-feedback').innerHTML =
            `<div class="feedback correct">🏆 达标！该模块已通过！</div>`;
        }
      } else {
        p.correctInRow = 0;
        el.classList.add('wrong');
        allOpts[correctIdx].classList.add('correct');
        document.getElementById('practice-feedback').innerHTML =
          `<div class="feedback wrong">✗ 正确答案是: ${allOpts[correctIdx].querySelector('.opt-text').textContent}<br>
           <span class="slow-link" onclick="AudioManager.setRate(0.6);AudioManager.speak('${currentModule[0]}');setTimeout(()=>AudioManager.setRate(1),2000)">🔊 慢速再听</span></div>`;
      }

      p.attempts++;
      this._saveProgress();
      document.getElementById('practice-feedback').style.display = 'block';

      // 自动进入下一题
      setTimeout(renderPractice, 1800);
    };

    renderPractice();
  },

  // --- TEST MODE (timed) ---
  _startTest(level, area) {
    const modules = level.modules;
    const allModules = CORPUS.flatMap(l => l.modules);

    // 只测试已达标的模块
    let testable = modules.filter(([eng]) => {
      const p = this._getModuleProgress(level.id, eng);
      return p.passed;
    });

    if (testable.length === 0) {
      area.innerHTML = `
        <div class="completed-view">
          <div class="completed-icon">⚠️</div>
          <div class="completed-text">尚无已达标的模块。请先进入听辨模式练习。</div>
          <button class="btn" onclick="ChunkApp.selectMode('practice')">去练习 →</button>
          <button class="btn btn-secondary" onclick="ChunkApp.selectLevel(${level.id})">返回</button>
        </div>
      `;
      return;
    }

    // 随机打乱
    testable = [...testable].sort(() => Math.random() - 0.5);
    let idx = 0, lives = TEST_LIVES, passed = 0;

    const renderTest = () => {
      if (idx >= testable.length) {
        area.innerHTML = `
          <div class="completed-view">
            <div class="completed-icon">🏆🏆🏆</div>
            <div class="completed-text">自动化测试全部通过！<br>${passed}/${testable.length} 通过 · ❤️剩余${lives}</div>
            <button class="btn" onclick="ChunkApp.selectLevel(${level.id})">返回</button>
          </div>
        `;
        return;
      }

      if (lives <= 0) {
        // 重置未通过模块
        for (let i = idx; i < testable.length; i++) {
          const p = this._getModuleProgress(level.id, testable[i][0], testable[i][1]);
          p.passed = false;
          p.correctInRow = 0;
        }
        this._saveProgress();
        area.innerHTML = `
          <div class="completed-view">
            <div class="completed-icon">💔</div>
            <div class="completed-text">生命耗尽！<br>通过 ${passed}/${testable.length} · 未通过的已重置，请回去重练</div>
            <button class="btn" onclick="ChunkApp.selectMode('practice')">返回听辨练习</button>
            <button class="btn btn-secondary" onclick="ChunkApp.selectLevel(${level.id})">返回级别</button>
          </div>
        `;
        return;
      }

      const [eng, chn] = testable[idx];

      // 生成选项
      let options = [chn];
      const others = allModules.filter(m => m[1] !== chn && m[0] !== eng);
      for (let i = 0; i < 3 && i < others.length; i++) {
        const pick = others.splice(Math.floor(Math.random() * others.length), 1)[0];
        options.push(pick[1]);
      }
      options.sort(() => Math.random() - 0.5);

      const labels = ['A', 'B', 'C', 'D'];
      let answered = false;

      area.innerHTML = `
        <div class="test-header">
          <span class="test-progress">${passed + 1}/${testable.length}</span>
          <span class="test-lives">${'❤️'.repeat(lives)}${'🖤'.repeat(TEST_LIVES - lives)}</span>
        </div>
        <div class="test-question">
          <div class="test-listen-icon">🔊</div>
          <div class="test-timer" id="test-timer">⏱️ ${TEST_TIME_LIMIT}s</div>
        </div>
        <div class="test-options" id="test-options">
          ${options.map((opt, i) => `
            <div class="practice-opt test-opt" data-correct="${options[i] === chn ? '1' : '0'}"
                 onclick="ChunkApp._onTestAnswer(this, ${i === options.indexOf(chn)})">
              <span class="opt-label">${labels[i]}</span>
              <span class="opt-text">${opt}</span>
            </div>
          `).join('')}
        </div>
        <div id="test-feedback" style="display:none"></div>
      `;

      // 播放英语
      AudioManager.speak(eng);

      // 计时
      let timeLeft = TEST_TIME_LIMIT;
      const timerEl = document.getElementById('test-timer');
      const timer = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.textContent = `⏱️ ${timeLeft}s`;
        if (timeLeft <= 0 && !answered) {
          clearInterval(timer);
          answered = true;
          document.querySelectorAll('.test-opt').forEach(o => o.classList.add('disabled'));
          const p = this._getModuleProgress(level.id, eng, chn);
          p.passed = false;
          p.correctInRow = 0;
          lives--;
          this._saveProgress();
          document.getElementById('test-feedback').innerHTML =
            `<div class="feedback wrong">⏰ 超时！正确答案: ${chn}<br>🔊 慢速: <span class="slow-link" onclick="AudioManager.setRate(0.6);AudioManager.speak('${eng}');setTimeout(()=>AudioManager.setRate(1),2000)">再听</span></div>`;
          document.getElementById('test-feedback').style.display = 'block';
          setTimeout(renderTest, 2000);
        }
      }, 1000);
    };

    this._onTestAnswer = (el, isCorrect) => {
      if (el.classList.contains('disabled')) return;
      document.querySelectorAll('.test-opt').forEach(o => o.classList.add('disabled'));

      const eng = testable[idx][0], chn = testable[idx][1];
      const p = this._getModuleProgress(level.id, eng, chn);

      if (isCorrect) {
        el.classList.add('correct');
        passed++;
        idx++;
        document.getElementById('test-feedback').innerHTML =
          `<div class="feedback correct">✓ 正确！（剩余${testable.length - idx}题）</div>`;
      } else {
        el.classList.add('wrong');
        p.passed = false;
        p.correctInRow = 0;
        lives--;
        document.getElementById('test-feedback').innerHTML =
          `<div class="feedback wrong">✗ 正确答案: ${chn} · 生命 -1</div>`;
      }

      p.attempts++;
      this._saveProgress();
      document.getElementById('test-feedback').style.display = 'block';
      setTimeout(renderTest, 2000);
    };

    renderTest();
  }
};
