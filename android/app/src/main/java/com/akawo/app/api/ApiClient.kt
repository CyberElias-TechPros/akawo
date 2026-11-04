package com.akawo.app.api

import com.akawo.app.data.model.ApiException
import com.akawo.app.data.model.ApiResponse
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Validates the Worker's `{ success, data } / { success, error }` envelope and translates any API
 * or HTTP error into ApiException. The actual HTTP call (with auth + refresh) is performed by the
 * Retrofit instance wired in NetworkModule; this class only interprets the response.
 */
@Singleton
class ApiClient @Inject constructor() {

    suspend fun <T> execute(call: suspend () -> okhttp3.Response<ApiResponse<T>>): T {
        val response = call()
        val body = response.body()

        if (response.isSuccessful && body != null) {
            if (body.success) {
                return body.data ?: throw ApiException(200, "empty_data", "Response contained no data.")
            }
            throw ApiException(
                response.code,
                body.error?.code ?: "error",
                body.error?.message ?: "Request failed.",
            )
        }

        val code = response.code
        val message = response.errorBody()?.string() ?: "Request failed (HTTP $code)"
        throw ApiException(code, "http_error", message)
    }
}
