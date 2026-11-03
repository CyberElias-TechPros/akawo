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
class AdminStatsViewModel @Inject constructor(
    private val adminRepository: AdminRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AdminStatsState())
    val state: kotlinx.coroutines.flow.StateFlow<AdminStatsState> = _state.asStateFlow()

    data class AdminStatsState(
        val stats: com.akawo.app.data.model.AdminStats? = null,
        val loading: Boolean = false,
        val error: String? = null,
    )

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                _state.value = _state.value.copy(
                    loading = false,
                    stats = adminRepository.stats(),
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load admin stats.",
                )
            }
        }
    }
}
