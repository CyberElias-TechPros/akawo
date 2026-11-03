package com.akawo.app.data.repository

import com.akawo.app.api.AkawoApi
import com.akawo.app.api.ApiClient
import com.akawo.app.data.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val api: AkawoApi,
) : BaseRepository(apiClient) {

    suspend fun updateProfile(name: String, phone: String): User {
        return execute { api.updateProfile(ProfileRequest(name, phone)) }
            ?: throw ApiException(500, "empty", "No user returned.")
    }

    suspend fun changePassword(currentPassword: String, newPassword: String) {
        execute { api.changePassword(ChangePasswordRequest(currentPassword, newPassword)) }
    }
}
