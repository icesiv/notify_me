# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native optimizations
-keepclassmembers class com.facebook.react.bridge.** {
    *** get*(*);
}

-keepclassmembers @com.facebook.react.bridge.ReactMethod class ** {
    *** *(***);
}

-keepclassmembers class * implements com.facebook.react.bridge.NativeModule {
    *** *(***);
}

# Keep Hermes runtime
-keepclasseswithmembernames class * {
    native <methods>;
}

# Add any project specific keep options here:
