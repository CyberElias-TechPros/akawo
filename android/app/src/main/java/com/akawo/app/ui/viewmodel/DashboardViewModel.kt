package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.DashboardRepository
import com.akawo.app.data.model.ApiException
import com.akawo.app.ui.state.Resource
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@javax.inject.HiltViewModel
class DashboardViewModel @Inject constructor(
    private val dashboardRepository: DashboardRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardState())
    val state: kotlinx.coroutines.flow.StateFlow<DashboardState> = _state.asStateFlow()

    data class DashboardState(
        val resource: Resource<DashboardData> = Resource.Loading,
        val error: String? = null,
    )

    data class DashboardData(
        val summary: com.akawo.app.data.model.DashboardSummary?,
        val nextContribution: com.akawo.app.data.model.NextContribution?,
        val recentContributions: List<com.akawo.app.data.model.Contribution>,
        val recentPayments: List<com.akawo.app.data.model.Payment>,
        val unreadNotifications: Int,
        val proofsAwaitingReview: Int,
        val verification: VerificationState,
        val user: com.akawo.app.data.model.User,
    )

    data class VerificationState(
        val isVerified: Boolean,
        val emailVerified: Boolean,
    )

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(resource = Resource.Loading, error = null)
            try {
                val d = dashboardRepository.loadDashboard()
                _state.value = _state.value.copy(
                    resource = Resource.Success(
                        DashboardData(
                            summary = d.summary,
                            nextContribution = d.nextContribution,
                            recentContributions = d.recentContributions,
                            recentPayments = d.recentPayments,
                            unreadNotifications = d.unreadNotifications,
                            proofsAwaitingReview = d.proofsAwaitingReview,
                            verification = VerificationState(
                                isVerified = d.verification.isVerified,
                                emailVerified = d.verification.emailVerified,
                            ),
                            user = d.user,
                        ),
                    ),
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(resource = Resource.Loading, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    resource = Resource.Loading,
                    error = e.message ?: "Failed to load dashboard.",
                )
            }
        }
    }
}
