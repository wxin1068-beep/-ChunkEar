#!/bin/bash
# ChunkEar iOS 构建脚本
# 用法: bash scripts/build-ios.sh
# 前置条件:
#   - macOS + Xcode 15+
#   - Apple Developer 账号（已登录 Xcode）
#   - 已设置 Development Team

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR/ChunkEar-iOS"

echo "=== ChunkEar iOS 构建 ==="
echo ""

# 检查 Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ 未找到 xcodebuild，请安装 Xcode"
    exit 1
fi

echo "📱 列出可用 scheme..."
xcodebuild -list 2>&1 | grep -A 10 "Schemes:"

echo ""
echo "=== 开始构建（Debug）==="
xcodebuild -scheme ChunkEar -configuration Debug \
    -destination 'platform=iOS Simulator,name=iPhone 16' \
    build 2>&1 | tail -10

echo ""
echo "✅ Debug 构建成功！可在模拟器中运行。"
echo ""
echo "=== 发布到 App Store ==="
echo "在 Xcode 中手动操作："
echo "  1. 打开 ChunkEar-iOS/ChunkEar.xcodeproj"
echo "  2. 选择 Product → Archive"
echo "  3. 在 Organizer 中点击 'Distribute App'"
echo "  4. 选择 'App Store Connect' → 'Upload'"
echo ""
