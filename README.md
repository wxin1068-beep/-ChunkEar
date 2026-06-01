# 🎧 ChunkEar · 语块听

**从最简单的语义模块开始，逐级自动化，彻底攻克英语听力。**
**不达标，不进级。**

---

## 项目结构

```
ChunkEar/
├── ChunkEar-app/         🌐 PWA 网页版（核心）
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── audio.js     音频管理（原生TTS → Web Speech 自动降级）
│   │   ├── corpus.js     语料库（6级315模块）
│   │   └── chunkear.js   主应用逻辑
│   ├── sw.js             离线 Service Worker
│   └── manifest.json
├── ChunkEar-iOS/         📱 iOS App（Xcode 项目）
│   └── ChunkEar/ChunkEarApp.swift 原生 TTS 桥接
├── ChunkEar-Android/     🤖 Android App（Gradle 项目）
│   └── app/.../MainActivity.kt   原生 TTS 桥接
├── corpus.py             语料库源
├── trainer.py            命令行训练器
├── scripts/
│   ├── build-android.sh   Android 构建脚本
│   ├── build-ios.sh        iOS 构建脚本
│   └── setup-android-release.sh   Android 签名配置
└── run.sh                 快捷启动
```

## 快速使用

### PWA 网页版（推荐，无需安装）

用 Safari/Chrome 打开 `ChunkEar-app/index.html`，添加到主屏幕即可。

### macOS 命令行版

```bash
./run.sh cli
# 或
python3 trainer.py
```

### iOS App

需要 macOS + Xcode 15+：

```bash
./run.sh ios
# 在 Xcode 中选自己的 Team → Run
```

### Android App

```bash
./run.sh android
# 生成的 APK 在 ChunkEar-Android/app/build/outputs/apk/debug/
```

---

## 📱 App Store 上架指南

### iOS App Store

**前置条件：** Apple Developer 账号（年费 ¥688/$99）

**步骤：**

1. **配置开发者团队**
   - 打开 `ChunkEar-iOS/ChunkEar.xcodeproj`
   - 在 Signing & Capabilities 中选自己的 Team

2. **生成截图**
   - 在模拟器中运行 App（iPhone 16 6.7寸）
   - `Command + S` 截图
   - 需要 6.7寸、6.5寸、5.5寸 三种截图各一组

3. **App Store Connect 创建应用**
   - 前往 [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Apps → + → 新 App
   - 平台: iOS, 名称: ChunkEar, 语言: 简体中文
   - Bundle ID: `com.chunkear.app`（如果被占用则改 Info.plist）

4. **填写元数据**
   - 副标题: 英语听力语义模块训练
   - 关键词: 英语,听力,口语,语块,语义,训练,学习
   - 描述: ChunkEar 是一个基于语义模块（语块）理论的英语听力训练工具...
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

   然后将密钥密码设为环境变量：

   ```bash
   echo 'export CHUNKEAR_STORE_PASSWORD="你的密码"' >> ~/.zshrc
   echo 'export CHUNKEAR_KEY_ALIAS="chunkear"' >> ~/.zshrc
   echo 'export CHUNKEAR_KEY_PASSWORD="你的密钥密码"' >> ~/.zshrc
   source ~/.zshrc
   ```

2. **构建发布版 APK**

   ```bash
   bash scripts/build-android.sh release
   ```

3. **Google Play Console**
   - 前往 [play.google.com/console](https://play.google.com/console)
   - 创建应用 → 选择"Google Play 应用签名" → 上传 APK
   - 首次需要填写商品详情、内容评级、定价分发

4. **应用签名**
   - Google Play 会使用 Play App Signing
   - 上传上一步生成的 APK

5. **发布**
   - 选择"正式版"或"内部测试"先测试
   - 审核通常几小时到 1 天

---

## 核心功能

| 功能       | 说明                                           |
| ---------- | ---------------------------------------------- |
| 6 级语料库 | 315 个高频英语语义模块，从极简到精通           |
| 学习模式   | 听英语 → 看释义 → 可控重播                     |
| 听辨模式   | 4 选 1 辨义，连续 3 次正确达标                 |
| 自动化测试 | 限时 6 秒 + 5 条命，检验真功夫                 |
| 间隔复习   | 通关后 1/3/7/14/30 天周期提醒                  |
| 暗黑模式   | 手动切换，保护夜间视力                         |
| 进度管理   | 本地持久化 + JSON 导出/导入                    |
| PWA 离线   | Service Worker 缓存，断网可用                  |
| 原生 TTS   | iOS AVSpeechSynthesizer / Android TextToSpeech |

## 技术栈

- **PWA**: 原生 HTML/CSS/JavaScript，零依赖
- **iOS**: SwiftUI + WKWebView + AVSpeechSynthesizer，目标 iOS 16+
- **Android**: Kotlin + WebView + TextToSpeech，目标 SDK 34
- **CLI**: Python 3，macOS `say` 命令
- **语料**: 315 个模块，6 级递进，自动解锁

## License

MIT
