package com.akawo.app.di

import android.content.Context
import com.akawo.app.api.AkawoApi
import com.akawo.app.api.AuthInterceptor
import com.akawo.app.api.TokenHolder
import com.akawo.app.data.pref.SecureTokenStore
import com.google.gson.FieldNamingPolicy
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton
import java.util.concurrent.TimeUnit

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideSecureTokenStore(@ApplicationContext context: Context): SecureTokenStore {
        return SecureTokenStore(context)
    }

    @Provides
    @Singleton
    fun provideTokenHolder(tokenStore: SecureTokenStore): TokenHolder {
        return TokenHolder(tokenStore).also { it.initFromStore() }
    }

    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            .setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES)
            .serializeNulls()
            .create()
    }

    /**
     * Plain client used solely for the refresh-token rotation. No auth interceptor — avoids a
     * circular dependency with the main client.
     */
    @Provides
    @Singleton
    fun provideRefreshClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        tokenHolder: TokenHolder,
        refreshClient: OkHttpClient,
        gson: Gson,
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .apply {
                AuthInterceptor.install(
                    this,
                    tokenHolder,
                    refreshClient,
                    com.akawo.app.BuildConfig.API_BASE_URL,
                    gson,
                )
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttp: OkHttpClient,
        gson: Gson,
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(com.akawo.app.BuildConfig.API_BASE_URL)
            .client(okHttp)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideAkawoApi(retrofit: Retrofit): AkawoApi {
        return retrofit.create(AkawoApi::class.java)
    }
}
