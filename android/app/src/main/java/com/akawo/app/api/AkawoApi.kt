package com.akawo.app.api

import com.akawo.app.data.model.*
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PART
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface AkawoApi {

    /* ---------------------------------------------------------------- */
/* Public                                                             */
/* ---------------------------------------------------------------- */

    @GET("/api/health")
    suspend fun health(): Response<ApiResponse<Health>>

    @GET("/api/config")
    suspend fun config(): Response<ApiResponse<AppConfig>>

    @POST("/api/auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<ApiResponse<RegisterResponse>>

    @POST("/api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<ApiResponse<LoginResponse>>

    @GET("/api/auth/me")
    suspend fun me(): Response<ApiResponse<MeResponse>>

    @POST("/api/auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): Response<ApiResponse<TokenPair>>

    @POST("/api/auth/logout")
    suspend fun logout(@Body body: LogoutRequest): Response<ApiResponse<LogoutResponse>>

    @POST("/api/auth/verify-email")
    suspend fun verifyEmail(@Body body: VerifyEmailRequest): Response<ApiResponse<VerifyEmailResponse>>

    @POST("/api/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): Response<ApiResponse<ForgotPasswordResponse>>

    @POST("/api/auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): Response<ApiResponse<ResetPasswordResponse>>

    @POST("/api/auth/bootstrap-admin")
    suspend fun bootstrapAdmin(@Body body: BootstrapAdminRequest): Response<ApiResponse<BootstrapAdminResponse>>

    /* ---------------------------------------------------------------- */
/* User                                                               */
/* ---------------------------------------------------------------- */

    @GET("/api/users/dashboard")
    suspend fun dashboard(): Response<ApiResponse<Dashboard>>

    @PUT("/api/users/profile")
    suspend fun updateProfile(@Body body: ProfileRequest): Response<ApiResponse<User>>

    @PUT("/api/users/password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): Response<ApiResponse<ChangePasswordResponse>>

    /* ---------------------------------------------------------------- */
/* Contributions                                                      */
/* ---------------------------------------------------------------- */

    @GET("/api/contributions")
    suspend fun listContributions(
        @Query("status") status: String?,
        @Query("label") label: String?,
        @Query("page") page: Int?
    ): Response<ApiResponse<ContributionsResponse>>

    @POST("/api/contributions")
    suspend fun createContribution(@Body body: ContributionRequest): Response<ApiResponse<Contribution>>

    @GET("/api/contributions/{id}")
    suspend fun getContribution(@Path("id") id: String): Response<ApiResponse<ContributionResponse>>

    @PUT("/api/contributions/{id}")
    suspend fun updateContribution(
        @Path("id") id: String,
        @Body body: ContributionUpdateRequest
    ): Response<ApiResponse<Contribution>>

    @DELETE("/api/contributions/{id}")
    suspend fun deleteContribution(@Path("id") id: String): Response<ApiResponse<DeleteResponse>>

    /* ---------------------------------------------------------------- */
/* Payments                                                           */
/* ---------------------------------------------------------------- */

    @POST("/api/payments/initiate")
    suspend fun initiatePayment(@Body body: InitiatePaymentRequest): Response<ApiResponse<InitiatePaymentResponse>>

    @GET("/api/payments")
    suspend fun listPayments(
        @Query("page") page: Int?,
        @Query("limit") limit: Int?
    ): Response<ApiResponse<PaymentsResponse>>

    @GET("/api/payments/{id}")
    suspend fun getPayment(@Path("id") id: String): Response<ApiResponse<Payment>>

    @POST("/api/payments/{id}/charge")
    suspend fun charge(
        @Path("id") id: String,
        @Body body: ChargeRequest
    ): Response<ApiResponse<ChargeResponse>>

    @POST("/api/payments/{id}/verify")
    suspend fun verifyPayment(@Path("id") id: String): Response<ApiResponse<Payment>>

    @Multipart
    @POST("/api/payments/{id}/proof")
    suspend fun uploadProof(
        @Path("id") id: String,
        @PART file: MultipartBody.Part
    ): Response<ApiResponse<UploadProofResponse>>

    /* ---------------------------------------------------------------- */
/* Verification (KYC)                                                 */
/* ---------------------------------------------------------------- */

    @GET("/api/verification/status")
    suspend fun verificationStatus(): Response<ApiResponse<VerificationStatusResponse>>

    @GET("/api/verification/history")
    suspend fun verificationHistory(): Response<ApiResponse<VerificationHistoryResponse>>

    @Multipart
    @POST("/api/verification/submit")
    suspend fun submitVerification(
        @PART facialImage: MultipartBody.Part,
        @PART livenessVideo: MultipartBody.Part
    ): Response<ApiResponse<SubmitVerificationResponse>>

    /* ---------------------------------------------------------------- */
/* Notifications                                                      */
/* ---------------------------------------------------------------- */

    @GET("/api/notifications")
    suspend fun listNotifications(
        @Query("unreadOnly") unreadOnly: Boolean?,
        @Query("limit") limit: Int?
    ): Response<ApiResponse<NotificationsResponse>>

    @GET("/api/notifications/unread-count")
    suspend fun unreadCount(): Response<ApiResponse<UnreadCountResponse>>

    @POST("/api/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<ApiResponse<MarkReadResponse>>

    @POST("/api/notifications/read-all")
    suspend fun readAllNotifications(): Response<ApiResponse<ReadAllResponse>>

    /* ---------------------------------------------------------------- */
/* Media                                                              */
/* ---------------------------------------------------------------- */

    @GET("/api/media/{key}")
    suspend fun getMedia(
        @Path("key") key: String,
        @Query("token") token: String
    ): Response<ResponseBody>

    /* ---------------------------------------------------------------- */
/* Admin                                                              */
/* ---------------------------------------------------------------- */

    @GET("/api/admin/stats")
    suspend fun adminStats(): Response<ApiResponse<AdminStats>>

    @GET("/api/admin/users")
    suspend fun adminUsers(
        @Query("q") q: String?,
        @Query("role") role: String?,
        @Query("verified") verified: Boolean?,
        @Query("status") status: String?,
        @Query("page") page: Int?,
        @Query("limit") limit: Int?
    ): Response<ApiResponse<AdminUsersResponse>>

    @PUT("/api/admin/users/{id}/status")
    suspend fun adminUserStatus(
        @Path("id") id: String,
        @Body body: AdminUserStatusRequest
    ): Response<ApiResponse<AdminUserStatusResponse>>

    @PUT("/api/admin/users/{id}/role")
    suspend fun adminUserRole(
        @Path("id") id: String,
        @Body body: AdminUserRoleRequest
    ): Response<ApiResponse<AdminUserRoleResponse>>

    @GET("/api/admin/verifications")
    suspend fun adminVerifications(
        @Query("status") status: String?,
        @Query("page") page: Int?
    ): Response<ApiResponse<AdminVerificationsResponse>>

    @GET("/api/admin/verifications/{id}")
    suspend fun adminVerification(@Path("id") id: String): Response<ApiResponse<AdminVerificationDetail>>

    @POST("/api/admin/verifications/{id}/approve")
    suspend fun adminApproveVerification(@Path("id") id: String): Response<ApiResponse<AdminVerificationActionResponse>>

    @POST("/api/admin/verifications/{id}/reject")
    suspend fun adminRejectVerification(
        @Path("id") id: String,
        @Body body: AdminVerificationRejectRequest
    ): Response<ApiResponse<AdminVerificationActionResponse>>

    @GET("/api/admin/payments")
    suspend fun adminPayments(
        @Query("status") status: String?,
        @Query("page") page: Int?
    ): Response<ApiResponse<AdminPaymentsResponse>>

    @POST("/api/admin/payments/{id}/proof/approve")
    suspend fun adminApproveProof(
        @Path("id") id: String,
        @Body body: AdminProofActionRequest
    ): Response<ApiResponse<AdminProofActionResponse>>

    @POST("/api/admin/payments/{id}/proof/reject")
    suspend fun adminRejectProof(
        @Path("id") id: String,
        @Body body: AdminProofActionRequest
    ): Response<ApiResponse<AdminProofActionResponse>>

    @GET("/api/admin/emails")
    suspend fun adminEmails(@Query("page") page: Int?): Response<ApiResponse<AdminEmailsResponse>>

    @GET("/api/admin/audit")
    suspend fun adminAudit(@Query("page") page: Int?): Response<ApiResponse<AdminAuditResponse>>

    /* ---------------------------------------------------------------- */
/* Dev-only                                                           */
/* ---------------------------------------------------------------- */

    @POST("/api/test/reset")
    suspend fun testReset(): Response<ApiResponse<TestResetResponse>>

    @POST("/api/test/run-cron")
    suspend fun testRunCron(): Response<ApiResponse<TestRunCronResponse>>
}

/* ==================================================================== */
/* Small response wrappers not in ApiTypes                              */
/* ==================================================================== */

data class LogoutResponse(val ok: Boolean)
data class VerifyEmailResponse(val ok: Boolean)
data class ForgotPasswordResponse(val message: String)
data class ResetPasswordResponse(val ok: Boolean)
data class BootstrapAdminResponse(val ok: Boolean)
data class DeleteResponse(val ok: Boolean)
data class SubmitVerificationResponse(val ok: Boolean)
data class MarkReadResponse(val ok: Boolean)
data class ReadAllResponse(val ok: Boolean)
data class TestResetResponse(val ok: Boolean)
data class TestRunCronResponse(val ok: Boolean)

data class AdminVerificationActionResponse(val ok: Boolean)
data class AdminProofActionResponse(val ok: Boolean)

data class AdminUserStatusResponse(val ok: Boolean)
data class AdminUserRoleResponse(val ok: Boolean)
data class AdminVerificationsResponse(
    val verifications: List<AdminVerificationQueueItem>,
    val pagination: Pagination?,
)
data class AdminPaymentsResponse(
    val payments: List<AdminPaymentItem>,
    val pagination: Pagination?,
)
data class AdminEmailsResponse(
    val emails: List<AdminEmailItem>,
    val pagination: Pagination?,
)
data class AdminAuditResponse(
    val audit: List<AdminAuditEntry>,
    val pagination: Pagination?,
)
