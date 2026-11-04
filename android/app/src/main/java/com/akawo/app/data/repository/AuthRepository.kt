package com.akawo.app.data.repository

import com.akawo.app.api.AkawoApi
import com.akawo.app.api.ApiClient
import com.akawo.app.api.TokenHolder
import com.akawo.app.data.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val api: AkawoApi,
    private val tokenHolder: TokenHolder,
) : BaseRepository(apiClient) {

    suspend fun register(
        name: String,
        email: String,
        password: String,
        bvn: String,
    ): RegisterResponse {
        val response = execute { api.register(RegisterRequest(name, email, password, bvn)) }
        val data = response ?: throw ApiException(500, "empty", "Registration returned no user.")
        tokenHolder.setTokens(data.tokens.accessToken, data.tokens.refreshToken)
        tokenHolder.setUser(data.user.role)
        return data
    }

    suspend fun login(email: String, password: String): LoginResponse {
        val response = execute { api.login(LoginRequest(email, password)) }
        val data = response ?: throw ApiException(500, "empty", "Login returned no user.")
        tokenHolder.setTokens(data.tokens.accessToken, data.tokens.refreshToken)
        tokenHolder.setUser(data.user.role)
        return data
    }

    suspend fun me(): User {
        val user = execute { api.me() }?.user
            ?: throw ApiException(500, "empty", "Session restore returned no user.")
        tokenHolder.setUser(user.role)
        return user
    }

    suspend fun verifyEmail(token: String) {
        execute { api.verifyEmail(VerifyEmailRequest(token)) }
    }

    suspend fun forgotPassword(email: String) {
        execute { api.forgotPassword(ForgotPasswordRequest(email)) }
    }

    suspend fun resetPassword(token: String, password: String) {
        execute { api.resetPassword(ResetPasswordRequest(token, password)) }
    }

    suspend fun logout() {
        val refresh = tokenHolder.refreshToken
        try {
            execute { api.logout(LogoutRequest(refresh)) }
        } catch (_: Exception) {
            // best effort — clear local state regardless
        } finally {
            tokenHolder.clear()
        }
    }

    suspend fun bootstrapAdmin(
        name: String,
        email: String,
        password: String,
        bvn: String,
    ) {
        execute { api.bootstrapAdmin(BootstrapAdminRequest(name, email, password, bvn)) }
    }
}
