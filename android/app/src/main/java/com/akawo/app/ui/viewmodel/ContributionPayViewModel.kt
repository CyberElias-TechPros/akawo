package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.ContributionRepository
import com.akawo.app.data.repository.PaymentRepository
import com.akawo.app.data.model.ApiException
import com.akawo.app.ui.state.Resource
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import java.io.File

@javax.inject.HiltViewModel
class ContributionPayViewModel @Inject constructor(
    private val contributionRepository: ContributionRepository,
    private val paymentRepository: PaymentRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(PayState())
    val state: kotlinx.coroutines.flow.StateFlow<PayState> = _state.asStateFlow()

    enum class Phase { Choose, Done }

    data class PayState(
        val contribution: com.akawo.app.data.model.Contribution? = null,
        val payment: com.akawo.app.data.model.Payment? = null,
        val phase: Phase = Phase.Choose,
        val loading: Boolean = false,
        val error: String? = null,
    )

    fun load(contributionId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val c = contributionRepository.get(contributionId)
                _state.value = _state.value.copy(contribution = c, loading = false, phase = Phase.Choose, payment = null)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = e.message ?: "Failed to load contribution.")
            }
        }
    }

    fun payByCard(cardNumber: String, expiry: String, cvv: String, name: String) {
        val contributionId = _state.value.contribution?.id ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val payment = paymentRepository.initiate(contributionId)
                val result = paymentRepository.charge(payment.id, cardNumber, expiry, cvv, name)
                _state.value = _state.value.copy(
                    loading = false,
                    phase = Phase.Done,
                    payment = result,
                )
                // Refresh contribution so monthly recurrence shows the next installment.
                contributionRepository.get(contributionId).let { _state.value = _state.value.copy(contribution = it) }
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = e.message ?: "Payment failed.")
            }
        }
    }

    fun uploadProof(file: File) {
        val contributionId = _state.value.contribution?.id ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val payment = paymentRepository.initiate(contributionId)
                val result = paymentRepository.uploadProof(payment.id, file)
                _state.value = _state.value.copy(
                    loading = false,
                    phase = Phase.Done,
                    payment = result,
                )
                contributionRepository.get(contributionId).let { _state.value = _state.value.copy(contribution = it) }
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = e.message ?: "Upload failed.")
            }
        }
    }

    fun reset() {
        _state.value = _state.value.copy(phase = Phase.Choose, payment = null, error = null)
    }
}
