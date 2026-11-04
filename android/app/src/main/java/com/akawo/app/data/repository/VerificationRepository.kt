package com.akawo.app.data.repository

import com.akawo.app.api.AkawoApi
import com.akawo.app.api.ApiClient
import com.akawo.app.data.model.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton
import java.io.File

@Singleton
class VerificationRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val api: AkawoApi,
) : BaseRepository(apiClient) {

    suspend fun status(): VerificationStatusResponse {
        return execute { api.verificationStatus() }
            ?: throw ApiException(500, "empty", "No verification status returned.")
    }

    suspend fun history(): List<VerificationRecord> {
        return execute { api.verificationHistory() }?.verifications
            ?: emptyList()
    }

    suspend fun submit(facialImage: File, livenessVideo: File) {
        val facePart = MultipartBody.Part.createFormData(
            "facialImage",
            facialImage.name,
            RequestBody(facialImage, MediaType.parse("image/*"))
        )
        val videoPart = MultipartBody.Part.createFormData(
            "livenessVideo",
            livenessVideo.name,
            RequestBody(livenessVideo, MediaType.parse("video/*"))
        )
        execute { api.submitVerification(facePart, videoPart) }
    }
}
