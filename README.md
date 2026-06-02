# 🎧 ChunkEar · 语块听

**从最简单的语义模块开始，逐级自动化，彻底攻克英语听力。**
**不达标，不进级。**

> 当前版本: **v1.2** — 自定义语料库 + 开口说 + 间隔复习

---

## 项目简介

ChunkEar 是一个基于**语义模块（语块）理论**的英语听力训练工具。

核心理念：**不是哑巴英语，是聋子英语**——听力是首要瓶颈。从最简单的语块开始，6级递进，每级全部达标才解锁下一级。达标标准：听辨连续正确3次 + 限时6秒自动化测试。

### 支持的平台

| 平台 | 方式 |
|------|------|
| 🌐 **PWA 网页版** | 浏览器打开即用，推荐 |
| 💻 **macOS CLI** | Python 命令行版，内置 TTS |
| 📱 **iOS App** | WKWebView + AVSpeechSynthesizer |
| 🤖 **Android App** | WebView + TextToSpeech |

---

## 项目结构

```
ChunkEar/
├── ChunkEar-app/         🌐 PWA 网页版（核心）
│   ├── index.html       主界面
│   ├── css/style.css    暗黑/亮色双主题
│   ├── js/
│   │   ├── audio.js     音频管理（Web Speech API）
│   │   ├── corpus.js    语料库（6级315模块）
│   │   └── chunkear.js  主应用逻辑（52KB）
│   ├── sw.js            离线 Service Worker
│   └── manifest.json
├── ChunkEar-iOS/         📱 iOS App（Xcode 项目）
│   └── ChunkEar/ChunkEarApp.swift
├── ChunkEar-Android/     🤖 Android App（Gradle 项目）
│   └── app/.../MainActivity.kt
├── corpus.py             Python 语料库源
├── trainer.py            Python CLI 命令行训练器（22KB）
├── scripts/
│   ├── build-android.sh  Android 构建脚本
│   ├── build-ios.sh      iOS 构建脚本
│   └── setup-android-release.sh  Android 签名配置
└── run.sh                快捷启动脚本
```

---

## 功能一览

### 📖 学习模式
- 逐个模块学习：**听英语 → 看释义 → 再听一遍**
- 自动续播：退出后下次从上次中断处继续
- 多平台 TTS：浏览器 Web Speech / macOS `say` / iOS AVSpeechSynthesizer / Android TextToSpeech

### 🎯 听辨模式
- **4选1辨义**：听英语，从中选对应的中文释义
- 全局真实干扰项（从全部语料库取，非占位符）
- 连续正确3次达标（达标后进入自动化区）
- 答错重置连续计数，不连坐其他模块

### ⏱️ 自动化测试
- **限时6秒**，检验是否真正达到自动化
- **5条命**（螺旋递减）：3次错误即重新训练
- 未达标模块自动重置，需回听辨模式重练

### 🗣️ 开口说模式（v1.0+）
- 听英语 → 输入拼写 → 模糊匹配验证
- **Levenshtein 编辑距离容错**（≤2字符差异可接受）
- **冠词忽略**：`a`/`an`/`the` 不影响判对
- 答错可重试 + 逐字母提示

### 📝 自定义语料库（v1.0+）
- 自定义级别 + 任意模块，自由扩展
- **批量输入**（v1.1）：粘贴格式 `english/中文`，一键导入
- **AI 格式支持**（v1.2）：提供标准导入模板，AI 可一键生成
- 支持导入/导出，可分享自定义语料包
- 自定义模块与内置模块隔离训练

### 💾 数据管理
- 自动保存到浏览器 localStorage / 本地 JSON
- 支持 **导入/导出 JSON 进度**，跨设备迁移
- API：通过 `window.ChunkApp` 可编程操作

### 🔁 间隔复习（v1.0+）
- 通关后按 **1/3/7/14/30 天周期**提醒复习
- 首页展示待复习模块数

### 🎨 暗黑/亮色主题
- 支持手动切换（首页右上角 🌓 按钮）
- 自动跟随系统 `prefers-color-scheme`

### 🔊 语音设置
- 语速调节：慢/偏慢/正常/偏快/快
- 即点即听，无需额外配置

### 📊 学习统计
- 各等级进度条 + 达标数 + 练习次数 + 正确率
- 全局总览：总达标数/总练习/整体正确率

---

## 快速使用

### PWA 网页版（推荐，无需安装）

> 📎 **在线版**：部署到任意静态服务器（VPS / GitHub Pages / Netlify）
> 或直接在浏览器打开 `ChunkEar-app/index.html`

```bash
# 本地预览
open ChunkEar-app/index.html    # macOS
# 或直接用浏览器打开
```

添加到主屏幕即可获得 App 体验。

### macOS 命令行版

```bash
./run.sh cli
# 或
python3 trainer.py
```

（需 macOS + `say` 命令）

### iOS App

需要 macOS + Xcode 15+：

```bash
./run.sh ios
# 在 Xcode 中选 Team → Run
```

### Android App

```bash
./run.sh android              # debug 版
./run.sh release-android      # release 版
# APK 在 ChunkEar-Android/app/build/outputs/apk/
```

### 自定义语料库导入

在 PWA 首页点击「管理语料库」→ 批量输入格式：

```
Hello./你好。
How are you?/你好吗？
I'm fine./我挺好的。
```

或使用 AI 生成提示词模板（v1.2）：

> "请为 ChunkEar 生成 10 个关于【天气】的语义模块，格式：`english/中文`"

---

## 语料库规模

| 级别 | 名称 | 模块数 | 说明 |
|------|------|--------|------|
| L0 | 极简根基 | 50 | 一两个词的超级常用模块 |
| L1 | 日常问候 | 44 | 日常见面、告别、礼貌问答 |
| L2 | 生活常用 | 60 | 日常对话中3-5词语义块 |
| L3 | 表达观点 | 54 | 看法、解释、转折、强调 |
| L4 | 高级表达 | 55 | 深度讨论、说服、叙述 |
| L5 | 精通自动化 | 52 | 高频成语化预制语块 |
| **合计** | **6 级** | **315** | 逐级解锁 + 自定义可扩展 |

自定义语料可额外增加任意级别和模块。

---

## 技术栈

- **PWA**: 原生 HTML/CSS/JavaScript，零框架依赖
- **iOS**: SwiftUI + WKWebView + AVSpeechSynthesizer，目标 iOS 16+
- **Android**: Kotlin + WebView + TextToSpeech，目标 SDK 34
- **CLI**: Python 3，macOS `say` 命令
- **语料**: 315 个模块，6 级递进，自动解锁

---

## 📱 App Store 上架指南

### iOS App Store

**前置条件：** Apple Developer 账号（年费 ¥688/$99）

**步骤：**

1. **配置开发者团队**
   - 打开 `ChunkEar-iOS/ChunkEar.xcodeproj`
   - 在 Signing & Capabilities 中选择自己的 Team

2. **生成截图**
   - 在模拟器中运行 App（iPhone 16 6.7寸）
   - `Command + S` 截图
   - 需要 6.7寸、6.5寸、5.5寸 各一组

3. **App Store Connect 创建应用**
   - 前往 [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Apps → + → 新 App
   - 平台: iOS, 名称: ChunkEar, 语言: 简体中文
   - Bundle ID: `com.chunkear.app`（被占用则改 Info.plist）

4. **填写元数据**
   - 副标题: 英语听力语义模块训练
   - 关键词: 英语,听力,口语,语块,语义,训练,学习
   - 支持网址: https://github.com/wxin1068-beep/-ChunkEar
   - 隐私政策: 可使用 [https://app-privacy-policy-generator.nisrulz.com/](https://app-privacy-policy-generator.nisrulz.com/) 生成

5. **构建与上传**
   - Xcode: Product → Archive
   - Organizer → Distribute App → App Store Connect → Upload
   - 等待处理完成（约 15-30 分钟）

6. **提交审核**
   - 在 App Store Connect 中提交
   - 审核通常 1-3 个工作日

### Google Play Store

**前置条件：** Google Play Console 账号（一次性 $25）

**步骤：**

1. **生成签名密钥**

   ```bash
   bash scripts/setup-android-release.sh
   ```

   设置环境变量：

   ```bash
   export CHUNKEAR_STORE_PASSWORD="你的密码"
   export CHUNKEAR_KEY_ALIAS="chunkear"
   export CHUNKEAR_KEY_PASSWORD="你的密钥密码"
   ```

2. **构建发布版 APK**

   ```bash
   bash scripts/build-android.sh release
   ```

3. **Google Play Console**
   - 前往 [play.google.com/console](https://play.google.com/console)
   - 创建应用 → 选择「Google Play 应用签名」→ 上传 APK
   - 首次需要填写商品详情、内容评级、定价分发

4. **应用签名**
   - Google Play 会使用 Play App Signing
   - 上传上一步生成的 APK

5. **发布**
   - 选择「正式版」或「内部测试」先测试
   - 审核通常几小时到 1 天

---

## License

MIT
