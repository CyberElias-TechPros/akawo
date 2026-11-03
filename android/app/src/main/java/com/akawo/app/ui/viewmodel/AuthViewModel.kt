package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.api.TokenHolder
import com.akawo.app.data.repository.AuthRepository
import com.akawo.app.data.model.ApiException
import com.akawo.app.data.model.User
import com.akawo.app.ui.state.Resource
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.SharingStarted
import javax.inject.Inject

@javax.inject.HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tokenHolder: TokenHolder,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthState())
    val state: kotlinx.coroutines.flow.StateFlow<AuthState> = _state.asStateFlow()

    data class AuthState(
        val resource: Resource<Any?> = Resource.Loading,
        val error: String? = null,
    )

    /** Session lifecycle: loading -> signed-in(user) | signed-out. */
    sealed class SessionState {
        object Loading : SessionState()
        data class SignedIn(val user: User) : SessionState()
        object SignedOut : SessionState()
    }

    private val _session = MutableStateFlow(SessionState.Loading)
    val session: StateFlow<SessionState> = _session.asStateFlow()

    /** True when the signed-in user is an administrator. */
    val isAdmin: StateFlow<Boolean> = tokenHolder.userRoleFlow
        .map { it == "admin" }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), initialValue = false)

    /** Restore an existing session (access token in memory / refresh token in store). */
    fun checkSession() {
        viewModelScope.launch {
            _session.value = SessionState.Loading
            try {
                val user = authRepository.me()
                _session.value = SessionState.SignedIn(user)
            } catch (_: Exception) {
                _session.value = SessionState.SignedOut
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(resource = Resource.Loading, error = null)
            try {
                val response = authRepository.login(email, password)
                _session.value = SessionState.SignedIn(response.user)
                _state.value = _state.value.copy(resource = Resource.Success(true))
            } catch (e: ApiException) {
                _state.value = _state.value.copy(resource = Resource.Loading, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    resource = Resource.Loading,
                    error = e.message ?: "Unexpected error.",
                )
            }
        }
    }

    fun register(name: String, email: String, password: String, bvn: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(resource = Resource.Loading, error = null)
            try {
                val response = authRepository.register(name, email, password, bvn)
                _session.value = SessionState.SignedIn(response.user)
                _state.value = _state.value.copy(resource = Resource.Success(true))
            } catch (e: ApiException) {
                _state.value = _state.value.copy(resource = Resource.Loading, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    resource = Resource.Loading,
                    error = e.message ?: "Unexpected error.",
                )
            }
        }
    }

    fun verifyEmail(token: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(resource = Resource.Loading, error = null)
            try {
                authRepository.verifyEmail(token)
                _state.value = _state.value.copy(resource = Resource.Success(true))
            } catch (e: ApiException) {
                _state.value = _state.value.copy(resource = Resource.Loading, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    resource = Resource.Loading,
                    error = e.message ?: "Unexpected error.",
                )
            }
        }
    }

    fun resetPassword(token: String, password: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(resource = Resource.Loading, error = null)
            try {
                authRepository.resetPassword(token, password)
                _state.value = _state.value.copy(resource = Resource.Success(true))
            } catch (e: ApiException) {
                _state.value = _state.value.copy(resource = Resource.Loading, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    resource = Resource.Loading,
                    error = e.message ?: "Unexpected error.",
                )
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            try {
                authRepository.logout()
            } finally {
                tokenHolder.clear()
                _session.value = SessionState.SignedOut
            }
            _state.value = AuthState(resource = Resource.Success(false))
        }
    }
}
