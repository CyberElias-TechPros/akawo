package com.akawo.app.ui.state

/** Generic load result used by repositories/ViewModels. */
sealed class Resource<out T> {
    object Loading : Resource<Nothing>()
    data class Success<T>(val data: T) : Resource<T>()
    data class Error(
        val message: String,
        val code: String? = null,
        val retryable: Boolean = true,
    ) : Resource<Nothing>()
}
