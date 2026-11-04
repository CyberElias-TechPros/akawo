package com.akawo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.akawo.app.data.repository.ContributionRepository
import com.akawo.app.data.model.ApiException
import com.akawo.app.ui.state.Resource
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@javax.inject.HiltViewModel
class ContributionsViewModel @Inject constructor(
    private val contributionRepository: ContributionRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(ContributionsState())
    val state: kotlinx.coroutines.flow.StateFlow<ContributionsState> = _state.asStateFlow()

    data class ContributionsState(
        val list: List<com.akawo.app.data.model.Contribution> = emptyList(),
        val pagination: com.akawo.app.data.model.Pagination? = null,
        val statusFilter: String = "",
        val labelFilter: String = "",
        val page: Int = 1,
        val loading: Boolean = false,
        val error: String? = null,
        val creating: Boolean = false,
    )

    fun load() {
        load(page = 1)
    }

    fun load(page: Int) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = contributionRepository.list(
                    status = _state.value.statusFilter.takeIf { it.isNotEmpty() },
                    label = _state.value.labelFilter.takeIf { it.isNotEmpty() },
                    page = page,
                )
                _state.value = _state.value.copy(
                    loading = false,
                    page = page,
                    list = response.contributions,
                    pagination = response.pagination,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load contributions.",
                )
            }
        }
    }

    fun setStatusFilter(status: String) {
        _state.value = _state.value.copy(statusFilter = status, page = 1)
        load(1)
    }

    fun setLabelFilter(label: String) {
        _state.value = _state.value.copy(labelFilter = label, page = 1)
        load(1)
    }

    fun create(amount: Double, dueDate: String?, label: String?, frequency: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(creating = true, error = null)
            try {
                contributionRepository.create(amount, dueDate, label, frequency)
                _state.value = _state.value.copy(creating = false)
                load(1)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(creating = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    creating = false,
                    error = e.message ?: "Failed to create contribution.",
                )
            }
        }
    }

    fun update(id: String, label: String?, dueDate: String?, frequency: String?) {
        viewModelScope.launch {
            _state.value = _state.value.copy(error = null)
            try {
                contributionRepository.update(id, label, dueDate, frequency)
                load(_state.value.page)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to update contribution.")
            }
        }
    }

    fun delete(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(error = null)
            try {
                contributionRepository.delete(id)
                load(_state.value.page)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to delete contribution.")
            }
        }
    }
}
