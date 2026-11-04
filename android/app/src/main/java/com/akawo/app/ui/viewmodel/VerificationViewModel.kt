package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.VerificationRepository
import com.akawo.app.data.model.ApiException
import com.akawo.app.ui.state.Resource
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import java.io.File

@javax.inject.HiltViewModel
class VerificationViewModel @Inject constructor(
    private val verificationRepository: VerificationRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(KycState())
    val state: kotlinx.coroutines.flow.StateFlow<KycState> = _state.asStateFlow()

    data class KycState(
        val status: com.akawo.app.data.model.VerificationStatusResponse? = null,
        val history: List<com.akawo.app.data.model.VerificationRecord> = emptyList(),
        val loading: Boolean = false,
        val submitting: Boolean = false,
        val error: String? = null,
        val submitted: Boolean = false,
    )

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val status = verificationRepository.status()
                val history = verificationRepository.history()
                _state.value = _state.value.copy(
                    loading = false,
                    status = status,
                    history = history,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load verification status.",
                )
            }
        }
    }

    fun submit(facialImage: File, livenessVideo: File) {
        viewModelScope.launch {
            _state.value = _state.value.copy(submitting = true, error = null, submitted = false)
            try {
                verificationRepository.submit(facialImage, livenessVideo)
                _state.value = _state.value.copy(submitting = false, submitted = true)
                load()
            } catch (e: ApiException) {
                _state.value = _state.value.copy(submitting = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    submitting = false,
                    error = e.message ?: "Submission failed.",
                )
            }
        }
    }
}
