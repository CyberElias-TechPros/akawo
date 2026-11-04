package com.akawo.app.api

import com.akawo.app.data.pref.SecureTokenStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Holds the access token in memory and the refresh token in EncryptedSharedPreferences.
 * This mirrors the web behaviour: access token lives in memory, refresh token persists.
 */
@Singleton
class TokenHolder @Inject constructor(
    private val tokenStore: SecureTokenStore,
) {
    private val _accessToken = MutableStateFlow<String?>(null)
    val accessTokenFlow: StateFlow<String?> = _accessToken.asStateFlow()

    private val _userRole = MutableStateFlow<String?>(null)
    val userRoleFlow: StateFlow<String?> = _userRole.asStateFlow()

    var accessToken: String? = null
        private set

    var refreshToken: String? = null
        private set

    var userRole: String? = null
        private set

    fun initFromStore() {
        refreshToken = tokenStore.getRefreshToken()
        _accessToken.value = accessToken
    }

    fun setTokens(accessToken: String, refreshToken: String) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
        tokenStore.saveRefreshToken(refreshToken)
        _accessToken.value = accessToken
    }

    fun setUser(role: String?) {
        userRole = role
        _userRole.value = role
    }

    fun clear() {
        accessToken = null
        refreshToken = null
        userRole = null
        tokenStore.clearRefreshToken()
        _accessToken.value = null
        _userRole.value = null
    }
}

    fun setAccessToken(accessToken: String?) {
        this.accessToken = accessToken
        _accessToken.value = accessToken
    }

    fun clear() {
        accessToken = null
        refreshToken = null
        tokenStore.clearRefreshToken()
        _accessToken.value = null
    }
}
