# ChunkEar iOS App

ChunkEar 语义模块听力训练器 — 苹果 iOS 项目。

## 使用方法

### 在手机上安装

1. 确保 Mac 上已安装 **Xcode 15+**（Mac App Store 免费下载）
2. 双击 `ChunkEar.xcodeproj` 打开项目
3. 用数据线连接 iPhone 到 Mac
4. 在 Xcode 顶部选择您的 iPhone 为目标设备
5. 按 **Cmd+R** 运行
6. 首次运行时需在 iPhone 上：**设置 → 通用 → VPN与设备管理 → 信任开发者证书**

### 如果没有开发者账号

免费 Apple 账号也能装到自己的手机上：
1. Xcode 顶部菜单 **Xcode → Settings → Accounts** 添加您的 Apple ID
2. 在项目设置 `Signing & Capabilities` 中选择您的 Team
3. 手机的 `Bundle Identifier` 会自动生成签名
4. 按 **Cmd+R** 运行

### 如果只在模拟器测试

不需要开发者账号，直接：
1. Xcode 顶部选择任意 iPhone 模拟器
2. 按 **Cmd+R** 运行
3. 会在模拟器中打开 ChunkEar

## 特点

- 🚀 **本地加载**：所有网页文件打包在 App 内，无需联网
- 🎧 使用 iOS 内置 TTS 引擎
- 💾 进度保存在手机本地

## 技术

- SwiftUI + WKWebView
- 最低支持 iOS 16.0
