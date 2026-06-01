#!/bin/bash
# ChunkEar Android 构建脚本
# 用法:
#   bash scripts/build-android.sh          # 构建 debug APK
#   bash scripts/build-android.sh release   # 构建 release APK（需要签名配置）

set -e

MODE="${1:-debug}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== ChunkEar Android 构建 ($MODE) ==="
echo ""

cd "$PROJECT_DIR/ChunkEar-Android"

if [ "$MODE" = "release" ]; then
    # 检查签名配置
    if [ ! -f "app/release.keystore" ]; then
        echo "❌ 未找到 release.keystore"
        echo "   请先运行: bash scripts/setup-android-release.sh"
        exit 1
    fi
    if [ -z "$CHUNKEAR_STORE_PASSWORD" ]; then
        echo "❌ 未设置 CHUNKEAR_STORE_PASSWORD 环境变量"
        exit 1
    fi
    ./gradlew assembleRelease
    APK_PATH=$(find app/build/outputs/apk/release -name "*.apk" | head -1)
else
    ./gradlew assembleDebug
    APK_PATH=$(find app/build/outputs/apk/debug -name "*.apk" | head -1)
fi

echo ""
echo "✅ 构建完成！"
echo "   APK: $APK_PATH"
echo "   大小: $(ls -lh "$APK_PATH" | awk '{print $5}')"
