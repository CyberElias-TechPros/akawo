# Akawo Android — ProGuard/R8 rules

# Retrofit + Gson + OkHttp
-keepattributes Signature, InnerClasses, EnclosingClass
-keep class com.akawo.app.data.model.** { *; }
-keep class com.squareup.okhttp3.** { *; }
-keep class retrofit2.** { *; }
-dontwarn com.squareup.okhttp3.**
-dontwarn retrofit2.**
-dontwarn okio.**

# Hilt (reflection)
-keep class com.akawo.app.di.** { *; }
-keep class * extends com.akawo.app.di.Hilt_** { *; }
-dontwarn dagger.**
-dontwarn androidx.hilt.**

# Coil
-dontwarn coil.**

# AndroidX
-dontwarn androidx.**
