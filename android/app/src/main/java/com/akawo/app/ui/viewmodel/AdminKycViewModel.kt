package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.AdminRepository
import com.akawo.app.data.model.ApiException
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@javax.inject.HiltViewModel
class AdminKycViewModel @Inject constructor(
    private val adminRepository: AdminRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AdminKycState())
    val state: kotlinx.coroutines.flow.StateFlow<AdminKycState> = _state.asStateFlow()

    data class AdminKycState(
        val queue: List<com.akawo.app.data.model.AdminVerificationQueueItem> = emptyList(),
        val pagination: com.akawo.app.data.model.Pagination? = null,
        val detail: com.akawo.app.data.model.AdminVerificationDetail? = null,
        val loadingDetail: Boolean = false,
        val loading: Boolean = false,
        val error: String? = null,
    )

    fun loadQueue(status: String? = null, page: Int = 1) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = adminRepository.verifications(status, page)
                _state.value = _state.value.copy(
                    loading = false,
                    queue = response.verifications,
                    pagination = response.pagination,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load KYC queue.",
                )
            }
        }
    }

    fun loadDetail(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loadingDetail = true, error = null)
            try {
                _state.value = _state.value.copy(
                    loadingDetail = false,
                    detail = adminRepository.verificationDetail(id),
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loadingDetail = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loadingDetail = false,
                    error = e.message ?: "Failed to load verification.",
                )
            }
        }
    }

    fun approve(id: String) {
        viewModelScope.launch {
            try {
                adminRepository.approveVerification(id)
                loadQueue(page = _state.value.pagination?.page ?: 1)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to approve verification.")
            }
        }
    }

    fun reject(id: String, reason: String) {
        if (reason.isBlank()) {
            _state.value = _state.value.copy(error = "A reason is required to reject.")
            return
        }
        viewModelScope.launch {
            try {
                adminRepository.rejectVerification(id, reason.trim())
                loadQueue(page = _state.value.pagination?.page ?: 1)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to reject verification.")
            }
        }
    }
}
