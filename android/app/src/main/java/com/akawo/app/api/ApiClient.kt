package com.akawo.app.api

import android.content.Context
import com.akawo.app.BuildConfig
import com.akawo.app.data.model.ApiException
import com.akawo.app.data.model.ApiResponse
import com.google.gson.FieldNamingPolicy
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.newSingleThreadContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext

/**
 * Holds a background coroutine context used to run suspending refresh calls from
 * the blocking OkHttp interceptor without blocking Android's main thread.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class IoDispatcherProvider @Inject constructor() {
    val ioContext: CoroutineContext =
        newSingleThreadContext("AkawoApiIo", CoroutineExceptionHandler { _, ex ->
            ex.printStackTrace()
        })
}

@Singleton
class ApiClient @Inject constructor(
    @ApplicationContext context: Context,
    api: AkawoApi,
    tokenHolder: TokenHolder,
    dispatcher: IoDispatcherProvider,
) {
    private val retrofit: Retrofit = buildRetrofit(context)

    fun api(): AkawoApi = api

    private fun buildRetrofit(context: Context): Retrofit {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.NONE
        }

        val okHttp = OkHttpClient.Builder()
            .addInterceptor(logging)
            .apply { AuthInterceptor.install(this, context, api, tokenHolder) }
            .connectTimeout(30_000, java.util.concurrent.TimeUnit.MILLISECONDS)
            .readTimeout(30_000, java.util.concurrent.TimeUnit.MILLISECONDS)
            .writeTimeout(30_000, java.util.concurrent.TimeUnit.MILLISECONDS)
            .retryOnConnectionFailure(true)
            .build()

        val gson = GsonBuilder()
            .setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES)
            .serializeNulls()
            .create()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttp)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    /** Convert a Retrofit call into a typed result, translating HTTP errors into ApiException. */
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

        // HTTP-level error (4xx/5xx). Try to read the structured error body.
        val code = response.code
        val message = response.errorBody()?.string() ?: "Request failed (HTTP $code)"
        throw ApiException(code, "http_error", message)
    }
}
