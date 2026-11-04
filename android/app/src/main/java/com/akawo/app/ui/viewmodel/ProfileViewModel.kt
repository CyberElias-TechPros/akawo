package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.UserRepository
import com.akawo.app.data.model.ApiException
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@javax.inject.HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileState())
    val state: kotlinx.coroutines.flow.StateFlow<ProfileState> = _state.asStateFlow()

    data class ProfileState(
        val user: com.akawo.app.data.model.User? = null,
        val name: String = "",
        val phone: String = "",
        val saving: Boolean = false,
        val changingPassword: Boolean = false,
        val error: String? = null,
        val message: String? = null,
    )

    /** Seed the form from the current user (called after login / session restore). */
    fun setUser(user: com.akawo.app.data.model.User) {
        _state.value = _state.value.copy(
            user = user,
            name = user.name,
            phone = user.phone ?: "",
        )
    }

    fun saveProfile(name: String, phone: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true, error = null, message = null)
            try {
                userRepository.updateProfile(name.trim(), phone.trim())
                _state.value = _state.value.copy(
                    name = name.trim(),
                    phone = phone.trim(),
                    saving = false,
                    message = "Profile saved.",
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(saving = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    saving = false,
                    error = e.message ?: "Failed to update profile.",
                )
            }
        }
    }

    fun changePassword(current: String, next: String, confirm: String) {
        if (next != confirm) {
            _state.value = _state.value.copy(error = "New passwords do not match.")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(changingPassword = true, error = null)
            try {
                userRepository.changePassword(current, next)
                _state.value = _state.value.copy(
                    changingPassword = false,
                    message = "Password updated. Sign in again with your new password.",
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(changingPassword = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    changingPassword = false,
                    error = e.message ?: "Failed to change password.",
                )
            }
        }
    }
}
