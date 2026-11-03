package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.NotificationRepository
import com.akawo.app.data.model.ApiException
import com.akawo.app.ui.state.Resource
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@javax.inject.HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationRepository: NotificationRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(NotificationsState())
    val state: kotlinx.coroutines.flow.StateFlow<NotificationsState> = _state.asStateFlow()

    data class NotificationsState(
        val items: List<com.akawo.app.data.model.NotificationItem> = emptyList(),
        val unreadCount: Int = 0,
        val loading: Boolean = false,
        val error: String? = null,
    )

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val items = notificationRepository.list(unreadOnly = null, limit = null)
                val count = notificationRepository.unreadCount()
                _state.value = _state.value.copy(
                    loading = false,
                    items = items,
                    unreadCount = count,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load notifications.",
                )
            }
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            try {
                notificationRepository.markRead(id)
                _state.value = _state.value.copy(
                    items = _state.value.items.map {
                        if (it.id == id) it.copy(readAt = java.time.Instant.now().toString()) else it
                    },
                    unreadCount = maxOf(0, _state.value.unreadCount - 1),
                )
            } catch (_: Exception) {
                // non-critical
            }
        }
    }

    fun readAll() {
        viewModelScope.launch {
            try {
                notificationRepository.readAll()
                _state.value = _state.value.copy(
                    items = _state.value.items.map { it.copy(readAt = java.time.Instant.now().toString()) },
                    unreadCount = 0,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to mark all as read.")
            }
        }
    }
}
