# ChunkEar Android 项目
# 用法: 用 Android Studio 打开此目录 → 连接手机 → 点 Run

# ProGuard
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
