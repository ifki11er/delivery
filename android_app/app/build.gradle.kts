plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

import java.util.Properties
import java.io.FileInputStream

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localProperties.load(FileInputStream(localPropertiesFile))
}

// WebView가 처음 열 웹 주소입니다.
// - local.properties에 DEV_WEB_URL이 있으면 그 값을 사용합니다.
// - DEV_WEB_URL이 없으면 테스트 배포 주소(Vercel)를 기본값으로 사용합니다.
// 로컬 서버로 테스트하려면 android_app/local.properties에 아래처럼 추가하세요.
// DEV_WEB_URL=http://192.168.2.94.nip.io:3000
// 다시 Vercel 배포본으로 테스트하려면 DEV_WEB_URL 줄을 지우거나 주석 처리한 뒤 앱을 다시 빌드하세요.
val webUrl = localProperties.getProperty("DEV_WEB_URL", "https://delivery-nu-dun.vercel.app")
val googleWebClientId = localProperties.getProperty("GOOGLE_WEB_CLIENT_ID", "")

android {
    signingConfigs {
        create("release") {
            storeFile = file("C:\\d\\develop\\delivery\\android_app\\key\\key")
            storePassword = "clsrnzltmxhdj"
            keyAlias = "key0"
            keyPassword = "dnjzmfldzmzl0"
        }
    }
    namespace = "com.chingu.worklink"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.chingu.worklink"
        minSdk = 24
        targetSdk = 34
        versionCode = 3
        versionName = "0.2.0"
        buildConfigField("String", "WEB_URL", "\"${webUrl}\"")
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"${googleWebClientId}\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.webkit:webkit:1.10.0")
    implementation("com.google.android.gms:play-services-auth:21.2.0")
}
