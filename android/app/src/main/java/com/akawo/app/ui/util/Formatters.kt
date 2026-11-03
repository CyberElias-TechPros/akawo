package com.akawo.app.ui.util

import java.text.NumberFormat
import java.util.*
import kotlin.time.*

/** NGN major units → "₦1,250,000.00" using the Nigerian locale. */
fun formatNgn(amount: Double): String {
    val nf = NumberFormat.getCurrencyInstance(Locale("en", "NG"))
    nf.maximumFractionDigits = 2
    nf.minimumFractionDigits = 2
    return nf.format(amount)
}

/** Compact NGN: ₦1.2m / ₦350k / ₦1,250.00. */
fun formatNgnCompact(amount: Double): String {
    return when {
        amount >= 1_000_000 -> {
            val nf = NumberFormat.getNumberInstance(Locale("en", "NG"))
            nf.maximumFractionDigits = 1
            nf.minimumFractionDigits = 0
            "₦${nf.format(amount / 1_000_000)}m"
        }
        amount >= 1_000 -> {
            val nf = NumberFormat.getNumberInstance(Locale("en", "NG"))
            nf.maximumFractionDigits = 1
            nf.minimumFractionDigits = 0
            "₦${nf.format(amount / 1_000)}k"
        }
        else -> formatNgn(amount)
    }
}

/** "2026-09-17" → "17 Sep 2026" (en-GB short month). */
fun formatDate(iso: String?): String {
    if (iso.isNullOrBlank()) return "—"
    val input = if (iso.length == 10) "${iso}T00:00:00Z" else iso
    try {
        val date = java.time.Instant.parse(input)
            .atZone(java.time.ZoneId.of("Africa/Lagos"))
            .toLocalDate()
        return date.format(java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH))
    } catch (_: Exception) {
        return iso
    }
}

/** Relative "x ago" label. */
fun timeAgo(iso: String?): String {
    if (iso.isNullOrBlank()) return "—"
    val then = try {
        java.time.Instant.parse(if (iso.length == 10) "${iso}T00:00:00Z" else iso)
    } catch (_: Exception) {
        return iso
    }
    val now = java.time.Instant.now()
    val seconds = now.minus(then).get(java.time.temporal.ChronoUnit.SECONDS).coerceAtLeast(0)
    return when {
        seconds < 60 -> "just now"
        seconds < 3600 -> "${seconds / 60}m ago"
        seconds < 86400 -> "${seconds / 3600}h ago"
        seconds < 604800 -> "${seconds / 86400}d ago"
        else -> formatDate(iso)
    }
}

fun todayIso(): String = java.time.LocalDate.now(java.time.ZoneId.of("Africa/Lagos")).toString()
