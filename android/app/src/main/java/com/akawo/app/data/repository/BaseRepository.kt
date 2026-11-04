package com.akawo.app.data.repository

import com.akawo.app.api.ApiClient
import com.akawo.app.data.model.ApiResponse
import javax.inject.Inject

abstract class BaseRepository @Inject constructor(protected val apiClient: ApiClient) {

    /**
     * Executes a Retrofit call and returns the parsed data, translating any API or
     * HTTP error into ApiException so ViewModels only handle one error type.
     */
    suspend fun <T> execute(call: suspend () -> okhttp3.Response<ApiResponse<T>>): T =
        apiClient.execute(call)
}
