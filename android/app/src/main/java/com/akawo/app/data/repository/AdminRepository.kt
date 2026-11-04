package com.akawo.app.data.repository

import com.akawo.app.api.AkawoApi
import com.akawo.app.api.ApiClient
import com.akawo.app.data.model.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton
import com.akawo.app.data.model.AdminProofActionRequest
import com.akawo.app.data.model.AdminVerificationRejectRequest

@Singleton
class AdminRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val api: AkawoApi,
) : BaseRepository(apiClient) {

    suspend fun stats(): AdminStats {
        return execute { api.adminStats() }
            ?: throw ApiException(500, "empty", "No stats returned.")
    }

    suspend fun users(
        q: String?,
        role: String?,
        verified: Boolean?,
        status: String?,
        page: Int,
        limit: Int,
    ): AdminUsersResponse {
        return execute { api.adminUsers(q, role, verified, status, page, limit) }
            ?: throw ApiException(500, "empty", "No users returned.")
    }

    suspend fun setUserStatus(id: String, status: String) {
        execute { api.adminUserStatus(id, AdminUserStatusRequest(status)) }
    }

    suspend fun setUserRole(id: String, role: String) {
        execute { api.adminUserRole(id, AdminUserRoleRequest(role)) }
    }

    suspend fun verifications(status: String?, page: Int): AdminVerificationsResponse {
        return execute { api.adminVerifications(status, page) }
            ?: throw ApiException(500, "empty", "No verifications returned.")
    }

    suspend fun verificationDetail(id: String): AdminVerificationDetail {
        return execute { api.adminVerification(id) }
            ?: throw ApiException(404, "not_found", "Verification not found.")
    }

    suspend fun approveVerification(id: String) {
        execute { api.adminApproveVerification(id) }
    }

    suspend fun rejectVerification(id: String, reason: String) {
        execute { api.adminRejectVerification(id, AdminVerificationRejectRequest(reason)) }
    }

    suspend fun payments(status: String?, page: Int): AdminPaymentsResponse {
        return execute { api.adminPayments(status, page) }
            ?: throw ApiException(500, "empty", "No payments returned.")
    }

    suspend fun approveProof(id: String, note: String?) {
        execute { api.adminApproveProof(id, AdminProofActionRequest(note)) }
    }

    suspend fun rejectProof(id: String, reason: String) {
        execute { api.adminRejectProof(id, AdminProofActionRequest(reason)) }
    }

    suspend fun emails(page: Int): AdminEmailsResponse {
        return execute { api.adminEmails(page) }
            ?: throw ApiException(500, "empty", "No emails returned.")
    }

    suspend fun audit(page: Int): AdminAuditResponse {
        return execute { api.adminAudit(page) }
            ?: throw ApiException(500, "empty", "No audit entries returned.")
    }
}
