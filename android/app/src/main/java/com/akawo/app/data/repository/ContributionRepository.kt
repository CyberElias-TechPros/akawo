package com.akawo.app.data.repository

import com.akawo.app.api.AkawoApi
import com.akawo.app.api.ApiClient
import com.akawo.app.data.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContributionRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val api: AkawoApi,
) : BaseRepository(apiClient) {

    suspend fun list(
        status: String?,
        label: String?,
        page: Int,
    ): ContributionsResponse {
        return execute { api.listContributions(status, label, page) }
            ?: throw ApiException(500, "empty", "No contribution list returned.")
    }

    suspend fun create(
        amount: Double,
        dueDate: String?,
        label: String?,
        frequency: String,
    ): Contribution {
        return execute { api.createContribution(ContributionRequest(amount, dueDate, label, frequency)) }
            ?: throw ApiException(500, "empty", "No contribution returned.")
    }

    suspend fun get(id: String): Contribution {
        return execute { api.getContribution(id) }?.contribution
            ?: throw ApiException(404, "not_found", "Contribution not found.")
    }

    suspend fun update(
        id: String,
        label: String?,
        dueDate: String?,
        frequency: String?,
    ): Contribution {
        return execute { api.updateContribution(id, ContributionUpdateRequest(label, dueDate, frequency)) }
            ?: throw ApiException(500, "empty", "No contribution returned.")
    }

    suspend fun delete(id: String) {
        execute { api.deleteContribution(id) }
    }
}
