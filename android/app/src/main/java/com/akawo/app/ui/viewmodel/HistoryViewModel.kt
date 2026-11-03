package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.PaymentRepository
import com.akawo.app.data.model.ApiException
import com.akawo.app.ui.state.Resource
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@javax.inject.HiltViewModel
class HistoryViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HistoryState())
    val state: kotlinx.coroutines.flow.StateFlow<HistoryState> = _state.asStateFlow()

    data class HistoryState(
        val payments: List<com.akawo.app.data.model.Payment> = emptyList(),
        val pagination: com.akawo.app.data.model.Pagination? = null,
        val page: Int = 1,
        val loading: Boolean = false,
        val error: String? = null,
    )

    fun load(page: Int = 1) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = paymentRepository.list(page = page, limit = 20)
                _state.value = _state.value.copy(
                    loading = false,
                    page = page,
                    payments = response.payments,
                    pagination = response.pagination,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load payment history.",
                )
            }
        }
    }
}
