package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.AuthRepository
import com.akawo.app.ui.state.Resource
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@javax.inject.HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(SplashState())
    val state: kotlinx.coroutines.flow.StateFlow<SplashState> = _state.asStateFlow()

    data class SplashState(
        val resource: Resource<Boolean> = Resource.Loading, // true = signed in
        val error: String? = null,
    )

    fun checkSession() {
        viewModelScope.launch {
            _state.value = _state.value.copy(resource = Resource.Loading)
            try {
                authRepository.me()
                _state.value = _state.value.copy(resource = Resource.Success(true))
            } catch (e: Exception) {
                // No valid session — send the user to login.
                _state.value = _state.value.copy(resource = Resource.Success(false))
            }
        }
    }
}
