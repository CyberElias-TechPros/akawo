package com.akawo.app.data.pref

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

/** EncryptedSharedPreferences backed by Android Keystore. Refresh token only. */
class SecureTokenStore(private val context: Context) {

    private const val PREFS_NAME = "akawo_secure"
    private const val KEY_REFRESH_TOKEN = "refresh_token"

    private val preferences: androidx.security.crypto.EncryptedSharedPreferences by lazy {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SCHEME)
        EncryptedSharedPreferences.create(
            PREFS_NAME,
            masterKeyAlias,
            context.context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun saveRefreshToken(token: String) = preferences.edit().putString(KEY_REFRESH_TOKEN, token).apply()

    fun getRefreshToken(): String? = preferences.getString(KEY_REFRESH_TOKEN, null)

    fun clearRefreshToken() = preferences.edit().remove(KEY_REFRESH_TOKEN).apply()
}
