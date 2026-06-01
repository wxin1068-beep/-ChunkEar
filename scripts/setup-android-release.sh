#!/bin/bash
# ChunkEar Android 发布版签名配置
# 用法: bash scripts/setup-android-release.sh
# 前置条件: 安装 Java JDK 8+

set -e

KEYSTORE="ChunkEar-Android/app/release.keystore"
ALIAS="chunkear"

echo "=== ChunkEar Android 发布签名配置 ==="
echo ""

# 检查 Java
if ! command -v keytool &> /dev/null; then
    echo "❌ 未找到 keytool，请安装 Java JDK"
    echo "   macOS: brew install java"
    echo "   或从 https://www.oracle.com/java/technologies/downloads/ 下载"
    exit 1
fi

# 如果已有密钥库，询问是否覆盖
if [ -f "$KEYSTORE" ]; then
    read -p "⚠️  已存在 release.keystore，覆盖？(y/N) " OVERWRITE
    if [ "$OVERWRITE" != "y" ]; then
        echo "已跳过"
        exit 0
    fi
fi

echo ""
echo "请设置密钥库密码（务必记住！发布更新时需用同一密钥）"
echo ""

# 生成密钥
keytool -genkey -v -keystore "$KEYSTORE" \
    -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000

echo ""
echo "✅ release.keystore 已生成: $KEYSTORE"
echo ""
echo "📋 将以下环境变量添加到你的 ~/.zshrc："
echo ""
echo "  export CHUNKEAR_STORE_PASSWORD='你的密钥库密码'"
echo "  export CHUNKEAR_KEY_ALIAS='$ALIAS'"
echo "  export CHUNKEAR_KEY_PASSWORD='你的密钥密码'"
echo ""
echo "然后运行构建："
echo "  cd ChunkEar-Android && ./gradlew assembleRelease"
echo ""
