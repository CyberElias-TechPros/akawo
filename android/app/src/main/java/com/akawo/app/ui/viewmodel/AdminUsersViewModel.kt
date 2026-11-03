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
class AdminUsersViewModel @Inject constructor(
    private val adminRepository: AdminRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AdminUsersState())
    val state: kotlinx.coroutines.flow.StateFlow<AdminUsersState> = _state.asStateFlow()

    data class AdminUsersState(
        val users: List<com.akawo.app.data.model.AdminUser> = emptyList(),
        val pagination: com.akawo.app.data.model.Pagination? = null,
        val loading: Boolean = false,
        val error: String? = null,
    )

    fun load(q: String? = null, role: String? = null, verified: Boolean? = null, status: String? = null, page: Int = 1, limit: Int = 20) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = adminRepository.users(q, role, verified, status, page, limit)
                _state.value = _state.value.copy(
                    loading = false,
                    users = response.users,
                    pagination = response.pagination,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load users.",
                )
            }
        }
    }

    fun setUserStatus(id: String, status: String) {
        viewModelScope.launch {
            try {
                adminRepository.setUserStatus(id, status)
                load(page = _state.value.pagination?.page ?: 1)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to update user status.")
            }
        }
    }

    fun setUserRole(id: String, role: String) {
        viewModelScope.launch {
            try {
                adminRepository.setUserRole(id, role)
                load(page = _state.value.pagination?.page ?: 1)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to update user role.")
            }
        }
    }
}
