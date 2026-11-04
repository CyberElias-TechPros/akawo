package com.akawo.app.ui.util

import android.text.Patterns

/** 11-digit Nigerian BVN (spaces allowed). */
fun isValidBvn(bvn: String?): Boolean {
    val digits = bvn?.replace(Regex("\\s"), "") ?: ""
    return digits.length == 11 && digits.all { it.isDigit() }
}

/** Password: ≥10 chars, upper + lower + number + symbol. */
fun isValidPassword(password: String?): Boolean {
    val p = password ?: ""
    return p.length >= 10 &&
        p.any { it.isUpperCase() } &&
        p.any { it.isLowerCase() } &&
        p.any { it.isDigit() } &&
        p.any { !it.isLetterOrDigit() }
}

fun isValidEmail(email: String?): Boolean =
    Patterns.EMAIL_ADDRESS.matcher(email ?: "").matches()

fun isValidAmount(text: String?): Boolean {
    val n = text?.toDoubleOrNull() ?: return false
    return n >= 1.0 && n <= 10_000_000.0
}
