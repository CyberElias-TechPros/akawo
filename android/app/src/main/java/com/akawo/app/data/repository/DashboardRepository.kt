package com.akawo.app.data.repository

import com.akawo.app.api.AkawoApi
import com.akawo.app.api.ApiClient
import com.akawo.app.data.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DashboardRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val api: AkawoApi,
) : BaseRepository(apiClient) {

    suspend fun loadDashboard(): DashboardResponse {
        return execute { api.dashboard() }
            ?: throw ApiException(500, "empty", "No dashboard returned.")
    }
}
