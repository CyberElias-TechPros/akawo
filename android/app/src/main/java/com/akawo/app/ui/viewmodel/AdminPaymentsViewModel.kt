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
class AdminPaymentsViewModel @Inject constructor(
    private val adminRepository: AdminRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AdminPaymentsState())
    val state: kotlinx.coroutines.flow.StateFlow<AdminPaymentsState> = _state.asStateFlow()

    data class AdminPaymentsState(
        val payments: List<com.akawo.app.data.model.AdminPaymentItem> = emptyList(),
        val pagination: com.akawo.app.data.model.Pagination? = null,
        val loading: Boolean = false,
        val error: String? = null,
    )

    fun load(status: String? = null, page: Int = 1) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = adminRepository.payments(status, page)
                _state.value = _state.value.copy(
                    loading = false,
                    payments = response.payments,
                    pagination = response.pagination,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load payments.",
                )
            }
        }
    }

    fun approveProof(id: String, note: String?) {
        viewModelScope.launch {
            try {
                adminRepository.approveProof(id, note)
                load(page = _state.value.pagination?.page ?: 1)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to approve proof.")
            }
        }
    }

    fun rejectProof(id: String, reason: String) {
        if (reason.isBlank()) {
            _state.value = _state.value.copy(error = "A reason is required to reject.")
            return
        }
        viewModelScope.launch {
            try {
                adminRepository.rejectProof(id, reason.trim())
                load(page = _state.value.pagination?.page ?: 1)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to reject proof.")
            }
        }
    }
}
