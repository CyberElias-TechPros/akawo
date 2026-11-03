package com.akawo.app.api

import android.content.Context
import androidx.annotation.WorkerThread
import com.akawo.app.data.model.ApiException
import com.akawo.app.data.model.RefreshRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.IOException

/**
 * Adds Bearer auth to requests and, on a 401, rotates the refresh token once and retries.
 * The refresh call itself runs on Dispatchers.IO because OkHttp interceptors are blocking.
 */
class AuthInterceptor(
    private val context: Context,
    private val api: AkawoApi,
    private val tokenHolder: TokenHolder,
) : Interceptor {

    @Volatile private var isRefreshing = false

    @WorkerThread
    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()
        tokenHolder.accessToken?.let {
            request = request.newBuilder()
                .header("Authorization", "Bearer $it")
                .build()
        }

        var response = chain.proceed(request)

        if (response.code == 401 && tokenHolder.refreshToken != null) {
            // Only one request at a time should rotate the refresh token.
            synchronized(this) {
                if (response.code == 401 && tokenHolder.refreshToken != null && !isRefreshing) {
                    isRefreshing = true
                    val refreshed = try {
                        runBlocking(Dispatchers.IO) { refreshAccessToken() }
                    } catch (_: Exception) {
                        false
                    } finally {
                        isRefreshing = false
                    }
                    if (refreshed) {
                        request = chain.request().newBuilder()
                            .header("Authorization", "Bearer ${tokenHolder.accessToken}")
                            .build()
                        response = chain.proceed(request)
                    } else {
                        tokenHolder.clear()
                        throw IOException("Session expired")
                    }
                }
            }
        }

        return response
    }

    private suspend fun refreshAccessToken(): Boolean {
        val response = api.refresh(RefreshRequest(tokenHolder.refreshToken!!))
        return if (response.isSuccessful) {
            response.body()?.let { body ->
                tokenHolder.setTokens(body.accessToken, body.refreshToken)
                true
            } ?: false
        } else {
            false
        }
    }

    companion object {
        fun install(
            client: OkHttpClient.Builder,
            context: Context,
            api: AkawoApi,
            tokenHolder: TokenHolder,
        ) {
            client.addInterceptor(AuthInterceptor(context, api, tokenHolder))
        }
    }
}
