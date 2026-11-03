package com.akawo.app.data.model

/* ------------------------------------------------------------------ */
/* Envelope                                                           */
/* ------------------------------------------------------------------ */

/** The Worker always replies { success, data } or { success, error }. */
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: ApiError?,
)

data class ApiError(
    val code: String?,
    val message: String?,
    val requestId: String?,
)

/** Thrown by repositories when the API returns an error or a non-2xx. */
class ApiException(
    val status: Int,
    val code: String,
    val message: String,
) : RuntimeException("$code: $message (HTTP $status)")

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val bvn: String,
)

data class RegisterResponse(
    val user: User,
    val tokens: TokenPair,
    val emailVerification: EmailVerification?,
)

data class EmailVerification(
    val sent: Boolean,
    val devUrl: String?,
)

data class LoginRequest(val email: String, val password: String)

data class LoginResponse(val user: User, val tokens: TokenPair)

data class RefreshRequest(val refreshToken: String)

data class LogoutRequest(val refreshToken: String?)

data class VerifyEmailRequest(val token: String)

data class ForgotPasswordRequest(val email: String)

data class ResetPasswordRequest(val token: String, val password: String)

data class BootstrapAdminRequest(
    val name: String,
    val email: String,
    val password: String,
    val bvn: String,
)

data class MeResponse(val user: User)

data class Health(
    val ok: Boolean,
    val gatewayMode: String?,
)

/* ------------------------------------------------------------------ */
/* User                                                               */
/* ------------------------------------------------------------------ */

data class User(
    val id: String,
    val name: String,
    val email: String,
    val phone: String?,
    val emailVerified: Boolean,
    val isVerified: Boolean,
    val role: String,        // "user" | "admin"
    val status: String,      // "active" | "suspended"
    val createdAt: String,
    val lastLoginAt: String?,
    val bvnLast4: String? = null, // admin views only
)

data class ProfileRequest(val name: String, val phone: String)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String,
)

/* ------------------------------------------------------------------ */
/* Contributions                                                      */
/* ------------------------------------------------------------------ */

data class Contribution(
    val id: String,
    val amount: Double,
    val label: String?,
    val frequency: String, // "once" | "monthly"
    val status: String,    // "pending" | "paid" | "failed" | "cancelled"
    val dueDate: String?,
    val paidAt: String?,
    val createdAt: String,
    val updatedAt: String,
    val overdue: Boolean,
)

data class ContributionRequest(
    val amount: Double,
    val dueDate: String?,
    val label: String?,
    val frequency: String,
)

data class ContributionUpdateRequest(
    val label: String?,
    val dueDate: String?,
    val frequency: String?,
)

data class ContributionResponse(val contribution: Contribution)

data class ContributionsResponse(
    val contributions: List<Contribution>,
    val pagination: Pagination,
)

/* ------------------------------------------------------------------ */
/* Payments                                                           */
/* ------------------------------------------------------------------ */

data class Payment(
    val id: String,
    val contributionId: String,
    val amount: Double,
    val currency: String,
    val gateway: String,
    val gatewayReference: String?,
    val status: String, // "pending" | "pending_verification" | "completed" | "failed"
    val proofStatus: String?,
    val proofNote: String?,
    val failureReason: String?,
    val completedAt: String?,
    val createdAt: String,
    val updatedAt: String,
    val label: String?,
)

data class InitiatePaymentRequest(val contributionId: String)

data class InitiatePaymentResponse(val payment: Payment)

data class ChargeRequest(
    val cardNumber: String,
    val expiry: String,
    val cvv: String,
    val name: String,
)

data class ChargeResponse(val payment: Payment, val declined: Boolean)

data class UploadProofResponse(val payment: Payment)

data class PaymentsResponse(
    val payments: List<Payment>,
    val pagination: Pagination,
)

/* ------------------------------------------------------------------ */
/* Verification (KYC)                                                 */
/* ------------------------------------------------------------------ */

data class VerificationRecord(
    val id: String,
    val status: String, // "pending" | "approved" | "rejected"
    val faceMeta: Map<String, Any?>?,
    val livenessMeta: Map<String, Any?>?,
    val rejectReason: String?,
    val reviewedAt: String?,
    val createdAt: String,
    val updatedAt: String,
)

data class MyVerification(
    override val id: String,
    override val status: String,
    override val faceMeta: Map<String, Any?>?,
    override val livenessMeta: Map<String, Any?>?,
    override val rejectReason: String?,
    override val reviewedAt: String?,
    override val createdAt: String,
    override val updatedAt: String,
    val media: VerificationMedia?,
) : VerificationRecord(
    id = id,
    status = status,
    faceMeta = faceMeta,
    livenessMeta = livenessMeta,
    rejectReason = rejectReason,
    reviewedAt = reviewedAt,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

data class VerificationMedia(val face: String, val liveness: String)

data class VerificationStatusResponse(
    val isVerified: Boolean,
    val latest: MyVerification?,
)

data class VerificationHistoryResponse(val verifications: List<VerificationRecord>)

/* ------------------------------------------------------------------ */
/* Notifications                                                      */
/* ------------------------------------------------------------------ */

data class NotificationItem(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val readAt: String?,
    val createdAt: String,
)

data class NotificationsResponse(val notifications: List<NotificationItem>)

data class UnreadCountResponse(val count: Int)

/* ------------------------------------------------------------------ */
/* Pagination                                                         */
/* ------------------------------------------------------------------ */

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int,
)

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

data class AdminStats(
    val users: AdminStatsUsers,
    val contributions: AdminStatsContributions,
    val payments: AdminStatsPayments,
    val verifications: AdminStatsVerifications,
    val recentPayments: List<AdminRecentPayment>,
    val topContributors: List<AdminTopContributor>,
    val monthly: List<AdminMonthlyTotal>,
)

data class AdminStatsUsers(
    val total: Int,
    val verified: Int,
    val pendingKyc: Int,
    val emailUnverified: Int,
)

data class AdminStatsContributions(
    val count: Int,
    val total: Double,
    val pending: Int,
)

data class AdminStatsPayments(
    val completed: Int,
    val completedTotal: Double,
    val pending: Int,
    val pendingTotal: Double,
    val failed: Int,
)

data class AdminStatsVerifications(
    val pending: Int,
    val approved: Int,
    val rejected: Int,
)

data class AdminRecentPayment(
    val id: String,
    val amount: Double,
    val status: String,
    val createdAt: String,
    val name: String,
    val email: String,
)

data class AdminTopContributor(val name: String, val total: Double)

data class AdminMonthlyTotal(val month: String, val total: Double)

data class AdminUser(
    override val id: String,
    override val name: String,
    override val email: String,
    override val phone: String?,
    override val emailVerified: Boolean,
    override val isVerified: Boolean,
    override val role: String,
    override val status: String,
    override val createdAt: String,
    override val lastLoginAt: String?,
    override val bvnLast4: String?,
) : User(
    id = id, name = name, email = email, phone = phone,
    emailVerified = emailVerified, isVerified = isVerified, role = role,
    status = status, createdAt = createdAt, lastLoginAt = lastLoginAt,
    bvnLast4 = bvnLast4,
)

data class AdminUsersResponse(
    val users: List<AdminUser>,
    val pagination: Pagination,
)

data class AdminUserStatusRequest(val status: String) // "active" | "suspended"
data class AdminUserRoleRequest(val role: String)       // "user" | "admin"

data class AdminVerificationQueueItem(
    val id: String,
    val userId: String,
    val status: String,
    val createdAt: String,
    val user: AdminVerificationUser,
)

data class AdminVerificationUser(
    val name: String,
    val email: String,
    val phone: String?,
    val bvnLast4: String?,
)

data class AdminVerificationDetail(
    val verification: VerificationRecord,
    val user: AdminVerificationUser,
    val media: VerificationMedia,
)

data class AdminPaymentItem(
    val id: String,
    val amount: Double,
    val status: String,
    val gateway: String,
    val proofStatus: String?,
    val label: String?,
    val createdAt: String,
    val completedAt: String?,
    val user: AdminPaymentUser?,
)

data class AdminPaymentUser(val name: String, val email: String)

data class AdminEmailItem(
    val id: String,
    val to: String,
    val subject: String,
    val body: String,
    val createdAt: String,
)

data class AdminAuditEntry(
    val id: String,
    val actor: String,
    val action: String,
    val entity: String?,
    val entityId: String?,
    val meta: Map<String, Any?>?,
    val createdAt: String,
)

data class AdminVerificationRejectRequest(val reason: String)

data class AdminProofActionRequest(val note: String?)

data class AppConfig(
    val appName: String,
    val currency: String,
    val gatewayMode: String, // "mock" | "paystack"
    val faceMode: String,    // "manual" | "api"
    val minContribution: Double,
    val maxContribution: Double,
)

/* ------------------------------------------------------------------ */
/* Misc                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

data class DashboardResponse(
    val user: User,
    val summary: DashboardSummary,
    val nextContribution: NextContribution?,
    val recentContributions: List<Contribution>,
    val recentPayments: List<Payment>,
    val unreadNotifications: Int,
    val proofsAwaitingReview: Int,
    val verification: DashboardVerification,
)

data class DashboardSummary(
    val totalContributed: Double,
    val pendingAmount: Double,
    val paidCount: Int,
    val pendingCount: Int,
    val monthlyTotal: Double,
)

data class NextContribution(
    val id: String,
    val amount: Double,
    val dueDate: String?,
    val label: String?,
    val overdue: Boolean,
)

data class DashboardVerification(val isVerified: Boolean, val emailVerified: Boolean)

data class TokenPair(val accessToken: String, val refreshToken: String)
