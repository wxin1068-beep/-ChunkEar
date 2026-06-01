#!/bin/bash
# ChunkEar 快速启动
# 用法: ./run.sh [cli|web|ios|android]
#   cli     — Python 命令行版（默认）
#   web     — 启动 PWA 网页版
#   ios     — 打开 Xcode 项目
#   android — 构建 Android APK

cd "$(dirname "$0")"
MODE="${1:-cli}"

case "$MODE" in
    cli)
        echo "🎧 ChunkEar 语义模块听力训练 (CLI版)"
        echo "用法: python3 trainer.py"
        python3 trainer.py
        ;;
    web)
        echo "🌐 启动 PWA 网页版..."
        echo "用浏览器打开: file://$(pwd)/ChunkEar-app/index.html"
        open "ChunkEar-app/index.html" 2>/dev/null || echo "  或手动打开 ChunkEar-app/index.html"
        ;;
    ios)
        echo "📱 打开 Xcode 项目..."
        open "ChunkEar-iOS/ChunkEar.xcodeproj" 2>/dev/null || echo "  Xcode 未安装，手动打开 ChunkEar-iOS/ChunkEar.xcodeproj"
        ;;
    android)
        echo "🤖 构建 Android APK..."
        bash scripts/build-android.sh
        ;;
    release-android)
        echo "🤖 构建 Android 发布版..."
        bash scripts/build-android.sh release
        ;;
    *)
        echo "用法: $0 [cli|web|ios|android|release-android]"
        exit 1
        ;;
esac
