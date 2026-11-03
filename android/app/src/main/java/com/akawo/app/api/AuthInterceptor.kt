package com.akawo.app.api

import com.akawo.app.api.TokenHolder
import com.akawo.app.data.model.ApiException
import com.google.gson.Gson
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException

/**
 * Adds Bearer auth to requests and, on a 401, rotates the refresh token once and retries.
 *
 * The refresh call is performed on a *separate* plain OkHttpClient (no auth interceptor) using a
 * blocking execute() — this interceptor already runs on OkHttp's background dispatcher, so blocking
 * here is safe and avoids both coroutines and a circular Hilt dependency (this interceptor does not
 * depend on AkawoApi/Retrofit at all).
 */
class AuthInterceptor(
    private val tokenHolder: TokenHolder,
    private val refreshClient: OkHttpClient,
    private val baseUrl: String,
    private val gson: Gson,
) : Interceptor {

    @Volatile private var isRefreshing = false

    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()
        tokenHolder.accessToken?.let {
            request = request.newBuilder()
                .header("Authorization", "Bearer $it")
                .build()
        }

        var response = chain.proceed(request)

        if (response.code == 401 && tokenHolder.refreshToken != null) {
            synchronized(this) {
                // Re-check under lock: only one request rotates the refresh token.
                if (response.code == 401 && tokenHolder.refreshToken != null && !isRefreshing) {
                    isRefreshing = true
                    val refreshed = try {
                        refreshAccessToken()
                    } catch (_: Exception) {
                        false
                    } finally {
                        isRefreshing = false
                    }
                    if (refreshed && tokenHolder.accessToken != null) {
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

    private fun refreshAccessToken(): Boolean {
        val rt = tokenHolder.refreshToken ?: return false
        val body = toRequestBody(
            "{\"refreshToken\":\"$rt\"}",
            "application/json".toMediaType()
        )
        val req = Request.Builder()
            .url("$baseUrl/api/auth/refresh")
            .post(body)
            .build()
        val resp = refreshClient.newCall(req).execute()
        return if (resp.isSuccessful) {
            resp.body()?.string()?.let { json ->
                gson.fromJson(json, TokenPair::class.java).let { pair ->
                    tokenHolder.setTokens(pair.accessToken, pair.refreshToken)
                    true
                }
            } ?: false
        } else {
            false
        }
    }

    companion object {
        fun install(
            client: OkHttpClient.Builder,
            tokenHolder: TokenHolder,
            refreshClient: OkHttpClient,
            baseUrl: String,
            gson: Gson,
        ) {
            client.addInterceptor(AuthInterceptor(tokenHolder, refreshClient, baseUrl, gson))
        }
    }
}
