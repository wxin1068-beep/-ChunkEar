plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.chunkear.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.chunkear.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        // debug 签名 — Android Studio 自动处理
        // release 签名 — 运行 scripts/setup-release.sh 生成
        create("release") {
            storeFile = file("release.keystore")
            storePassword = System.getenv("CHUNKEAR_STORE_PASSWORD") ?: ""
            keyAlias = System.getenv("CHUNKEAR_KEY_ALIAS") ?: "chunkear"
            keyPassword = System.getenv("CHUNKEAR_KEY_PASSWORD") ?: ""
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.9.0")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
}
