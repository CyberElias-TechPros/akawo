plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.parcelize)
    alias(libs.plugins.hilt.android)
}

android {
    namespace = "com.akawo.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.akawo.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        // Override this for production: the deployed Worker URL, e.g.
        // https://akawo-api.<account>.workers.dev
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8787\"")
        buildConfigField("String", "APP_NAME", "\"Akawo\"")

        vectorDrawables {
            useSupportLibrary = true
        }
    }

    signingConfigs {
        // Create a `debug.keystore` or provide release signing via
        // ~/.gradle/gradle.properties (AKAWO_RELEASE_STORE_FILE, etc.).
        release {
            storeFile = project.rootProject.file("../keystore/release.keystore")
            storePassword = project.findProperty("AKAWO_RELEASE_STORE_PASSWORD") ?: "android"
            keyAlias = project.findProperty("AKAWO_RELEASE_KEY_ALIAS") ?: "akawo"
            keyPassword = project.findProperty("AKAWO_RELEASE_KEY_PASSWORD") ?: "android"
        }
        debug {
            storeFile = rootProject.file("keystore/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.release
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            signingConfig = signingConfigs.debug
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }

    composeOptions {
        kotlinCompilerExtensionVersion = libs.versions.compose.compiler.get()
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1,notice,license}.txt"
        }
    }

    sourceSets {
        getByName("main") {
            res.srcDirs("src/main/res")
        }
        getByName("debug") {
            java.srcDirs("src/debug/java")
        }
    }
}

dependencies {
    // Compose BOM
    implementation(platform(libs.compose.bom))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.fragment)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.compose.material)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.ui.tooling.preview)

    // Hilt DI
    implementation(libs.hilt.library)
    kapt(libs.hilt.compiler)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)
    implementation(libs.kotlinx.coroutines.android)

    // Image loading (Coil) for KYC media + avatars
    implementation(libs.coil.core)

    // WorkManager for due-date reminders
    implementation(libs.androidx.work.runtime.ktx)

    // Biometric prompt (app unlock)
    implementation(libs.androidx.biometric)

    // EncryptedSharedPreferences (Keystore-backed refresh-token storage)
    implementation(libs.androidx.security.crypto)

    // Custom tabs (deep links / email magic links)
    implementation(libs.androidx.browser)

    // AndroidX test (local unit tests run on the JVM)
    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    androidTestImplementation(libs.androidx.test.core)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.rules)
    androidTestImplementation(libs.okhttp.mockwebserver)
}

tasks.withType<Test> {
    useJUnitPlatform()
}
