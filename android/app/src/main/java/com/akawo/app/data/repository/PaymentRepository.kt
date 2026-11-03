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
class PaymentRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val api: AkawoApi,
) : BaseRepository(apiClient) {

    suspend fun initiate(contributionId: String): Payment {
        return execute { api.initiatePayment(InitiatePaymentRequest(contributionId)) }?.payment
            ?: throw ApiException(500, "empty", "No payment returned.")
    }

    suspend fun list(page: Int, limit: Int): PaymentsResponse {
        return execute { api.listPayments(page, limit) }
            ?: throw ApiException(500, "empty", "No payment history returned.")
    }

    suspend fun get(id: String): Payment {
        return execute { api.getPayment(id) }
            ?: throw ApiException(404, "not_found", "Payment not found.")
    }

    suspend fun charge(
        paymentId: String,
        cardNumber: String,
        expiry: String,
        cvv: String,
        name: String,
    ): Payment {
        val response = execute { api.charge(paymentId, ChargeRequest(cardNumber, expiry, cvv, name)) }
        return response ?: throw ApiException(500, "empty", "No payment result returned.")
    }

    suspend fun verify(paymentId: String): Payment {
        return execute { api.verifyPayment(paymentId) }
            ?: throw ApiException(500, "empty", "No payment result returned.")
    }

    suspend fun uploadProof(paymentId: String, file: File): Payment {
        val requestFile = RequestBody(
            file,
            MediaType.parse("application/octet-stream")
        )
        val part = MultipartBody.Part.createFormData("file", file.name, requestFile)
        return execute { api.uploadProof(paymentId, part) }?.payment
            ?: throw ApiException(500, "empty", "No payment returned after upload.")
    }
}
