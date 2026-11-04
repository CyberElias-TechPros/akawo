package com.akawo.app.ui.util

import android.content.Intent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Holds the intent that launched (or re-launched) the app so the nav graph can
 * resolve email magic-link deep links (akawo://verify?token=…, akawo://reset?token=…). */
object DeepLinkHolder {
    val intent = MutableStateFlow<Intent?>(null)
}
