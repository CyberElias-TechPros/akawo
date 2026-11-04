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
class AdminOutboxViewModel @Inject constructor(
    private val adminRepository: AdminRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AdminOutboxState())
    val state: kotlinx.coroutines.flow.StateFlow<AdminOutboxState> = _state.asStateFlow()

    data class AdminOutboxState(
        val emails: List<com.akawo.app.data.model.AdminEmailItem> = emptyList(),
        val audit: List<com.akawo.app.data.model.AdminAuditEntry> = emptyList(),
        val pagination: com.akawo.app.data.model.Pagination? = null,
        val loading: Boolean = false,
        val error: String? = null,
    )

    fun loadEmails(page: Int = 1) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = adminRepository.emails(page)
                _state.value = _state.value.copy(
                    loading = false,
                    emails = response.emails,
                    pagination = response.pagination,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load email outbox.",
                )
            }
        }
    }

    fun loadAudit(page: Int = 1) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = adminRepository.audit(page)
                _state.value = _state.value.copy(
                    loading = false,
                    audit = response.audit,
                    pagination = response.pagination,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load audit log.",
                )
            }
        }
    }
}
