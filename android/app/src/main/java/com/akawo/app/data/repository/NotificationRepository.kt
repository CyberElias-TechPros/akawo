package com.akawo.app.data.repository

import com.akawo.app.api.AkawoApi
import com.akawo.app.api.ApiClient
import com.akawo.app.data.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val api: AkawoApi,
) : BaseRepository(apiClient) {

    suspend fun list(unreadOnly: Boolean?, limit: Int?): List<NotificationItem> {
        return execute { api.listNotifications(unreadOnly, limit) }?.notifications
            ?: emptyList()
    }

    suspend fun unreadCount(): Int {
        return execute { api.unreadCount() }?.count ?: 0
    }

    suspend fun markRead(id: String) {
        execute { api.markNotificationRead(id) }
    }

    suspend fun readAll() {
        execute { api.readAllNotifications() }
    }
}
