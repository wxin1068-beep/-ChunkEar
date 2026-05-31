# ChunkEar Android App

ChunkEar 语义模块听力训练器 — 安卓安装包项目。

## 使用方法

### 方法一：用 Android Studio 构建（推荐，无需开发者账号）

1. 在 Mac 上安装 [Android Studio](https://developer.android.com/studio)
2. 选择 **"Open an existing project"**
3. 选择本目录 (`ChunkEar-Android`)
4. 手机连接电脑（开启 USB 调试）
5. 点顶部绿色三角 **Run ▶** 按钮
6. App 自动安装到手机

### 方法二：生成 APK 安装包

在 Android Studio 中：
1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. 生成的 APK 在 `app/build/outputs/apk/debug/` 目录
3. 把 APK 传到手机，点开安装即可

## 特点

- 🚀 **本地加载**：所有网页文件打包在 App 内，无需联网
- 🎧 使用系统 TTS 引擎，离线朗读英语
- 💾 进度保存在手机本地

## 技术

- Kotlin + WebView
- 本地加载 `assets/index.html`
- 目标 SDK 34
