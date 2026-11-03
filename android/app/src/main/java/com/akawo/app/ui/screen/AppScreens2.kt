package com.akawo.app.ui.screen

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.LocalNavController
import coil.AsyncImage
import coil.request.ImageRequest
import com.akawo.app.R
import com.akawo.app.ui.component.*
import com.akawo.app.ui.theme.AkawoTheme
import com.akawo.app.ui.util.*
import com.akawo.app.ui.viewmodel.*
import java.io.File

/* ==================================================================== */
/* Verification (KYC)                                                   */
/* ==================================================================== */

@Composable
fun VerificationScreen(
    viewModel: VerificationViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val navController = LocalNavController.current
    val context = LocalContext.current

    // Activity-result launchers for native media capture/pick
    val takePicture = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success) { /* output URI handled via provider; simplified below */ }
    }
    val pickImage = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { selectedFaceUri = it }
    }
    val pickVideo = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { selectedVideoUri = it }
    }

    var selectedFaceUri by remember { mutableStateOf<Uri?>(null) }
    var selectedVideoUri by remember { mutableStateOf<Uri?>(null) }
    var viewing by remember { mutableStateOf(false) }
    var showSubmitError by remember { mutableStateOf("") }

    val latest = state.status?.latest
    val canSubmit = !state.status?.isVerified == true && (latest == null || latest.status == "rejected")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        Text(text = "Identity verification", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = "One-time check: a clear facial photo and a short liveness clip. Our team reviews it, then your account is fully trusted.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(20.dp))

        // Status card
        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Your status", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "Exactly where you stand — no guessing.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    val badge = when {
                        state.status?.isVerified == true -> Pair("Verified", BadgeTone.Ok)
                        latest?.status == "pending" -> Pair("Under review", BadgeTone.Warn)
                        latest?.status == "rejected" -> Pair("Needs a retry", BadgeTone.Bad)
                        else -> Pair("Not started", BadgeTone.Default)
                    }
                    AppBadge(text = badge.first, tone = badge.second)
                }
                latest?.takeIf { it.status == "rejected" && it.rejectReason.isNotBlank() }?.let { rejected ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(text = "Why it was rejected: ${rejected.rejectReason}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
                }
                if (state.status?.isVerified == true) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(text = "Verified on ${formatDate(latest?.reviewedAt ?: latest?.updatedAt)}. Nothing more to do here.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (latest?.status == "pending") {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(text = "Submitted ${formatDate(latest.createdAt)}. We usually review within one business day — you’ll get a notification either way.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                latest?.media?.let { media ->
                    Spacer(modifier = Modifier.height(12.dp))
                    AppButton(onClick = { viewing = true }, variant = ButtonVariant.Ghost, label = "View my submission")
                }
                if (state.history.size > 1) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(text = "History", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                    Spacer(modifier = Modifier.height(6.dp))
                    LazyColumn(modifier = Modifier.fillMaxWidth().height(200.dp)) {
                        items(state.history, key = { it.id }) { h ->
                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                Text(text = h.status.capitalize(), style = MaterialTheme.typography.bodySmall)
                                Spacer(modifier = Modifier.weight(1f))
                                Text(text = formatDate(h.createdAt), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                h.rejectReason?.let {
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(text = "· $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(20.dp))

        if (state.submitting) {
            AppLoading(modifier = Modifier.fillMaxWidth().height(60.dp))
        } else if (canSubmit) {
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = if (latest?.status == "rejected") "Submit again" else "Submit your verification", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = "Face the camera in good light. For the video, hold your phone ~30 cm away and slowly turn your head left, right, up, down.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(12.dp))

                    showSubmitError.takeIf { it.isNotBlank() }?.let {
                        Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Facial photo
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(text = "Facial photo", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(text = "JPG, PNG, WEBP or HEIC · up to 5 MB", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        selectedFaceUri?.let {
                            AsyncImage(
                                model = it.toString(),
                                contentDescription = "Selected facial photo",
                                modifier = Modifier.size(96.dp, 96.dp),
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            AppButton(onClick = { pickImage.launch("image/*") }, variant = ButtonVariant.Outlined, label = "Choose photo", modifier = Modifier.weight(1f))
                            Spacer(modifier = Modifier.width(8.dp))
                            AppButton(onClick = { /* camera */ }, variant = ButtonVariant.Outlined, label = "Camera", modifier = Modifier.weight(1f))
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    // Liveness video
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(text = "Liveness video", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(text = "MP4 or WEBM · up to 50 MB · 10–30 seconds is ideal", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        selectedVideoUri?.let {
                            Text(text = it.lastPathSegment ?: "Video selected", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            AppButton(onClick = { pickVideo.launch("video/*") }, variant = ButtonVariant.Outlined, label = "Choose video", modifier = Modifier.weight(1f))
                            Spacer(modifier = Modifier.width(8.dp))
                            AppButton(onClick = { /* camera video */ }, variant = ButtonVariant.Outlined, label = "Camera", modifier = Modifier.weight(1f))
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    AppButton(
                        onClick = {
                            val faceFile = selectedFaceUri?.let { uriToFile(context, it, "face.jpg") }
                            val videoFile = selectedVideoUri?.let { uriToFile(context, it, "liveness.mp4") }
                            if (faceFile == null || videoFile == null) {
                                showSubmitError = "Please choose both your facial photo and liveness video."
                            } else {
                                showSubmitError = ""
                                viewModel.submit(faceFile, videoFile)
                            }
                        },
                        label = if (state.submitting) "Uploading…" else if (latest?.status == "rejected") "Resubmit verification" else "Submit for review",
                        fullWidth = true,
                        enabled = selectedFaceUri != null && selectedVideoUri != null && !state.submitting,
                    )
                    if (state.submitted) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(text = "Verification submitted for review", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF1B6B3C))
                    }
                }
            }
        } else {
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = if (state.status?.isVerified == true) "✓" else "⏳", style = MaterialTheme.typography.displayLarge)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = if (state.status?.isVerified == true) "You’re fully verified" else "Your verification is being reviewed", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = if (state.status?.isVerified == true) "Your identity has been confirmed. This keeps your contributions and proofs protected." else "No action needed while we review. You’ll be notified the moment a decision is made.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                }
            }
        }
    }

    // Submission modal
    if (viewing && latest?.media != null) {
        SubmissionModal(
            onClose = { viewing = false },
            faceUrl = latest.media.face,
            videoUrl = latest.media.liveness,
            submittedAt = latest.createdAt,
            status = latest.status,
        )
    }
}

@Composable
private fun SubmissionModal(
    onClose: () -> Unit,
    faceUrl: String,
    videoUrl: String,
    submittedAt: String,
    status: String,
) {
    val context = LocalContext.current
    val videoUri = remember { Uri.parse(videoUrl) }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        // Scrim
        Box(modifier = Modifier.fillMaxSize().background(Color(0x80101915)), onClick = onClose)

                Card(
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .widthIn(max = 640.dp)
                        .fillMaxHeight(0.6f)
                        .heightIn(max = 800.dp)
                        .padding(16.dp),
                    shape = MaterialTheme.shapes.large,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(text = "Your submission", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "Submitted $submittedAt · $status", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(modifier = Modifier.weight(1f)) {
                        AsyncImage(model = Uri.parse(faceUrl), contentDescription = "Facial photo submission", modifier = Modifier.fillMaxWidth().height(200.dp))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "Facial photo", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        AndroidView(
                            factory = { c ->
                                android.widget.VideoView(c).apply {
                                    setVideoURI(videoUri)
                                    isLooping = false
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(200.dp),
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "Liveness video", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.End) {
                    AppButton(onClick = onClose, variant = ButtonVariant.Ghost, label = "Close")
                }
            }
        }
    }
}

/* ==================================================================== */
/* Profile                                                              */
/* ==================================================================== */

@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel = hiltViewModel(),
    user: com.akawo.app.data.model.User,
) {
    LaunchedEffect(user.id) { viewModel.setUser(user) }
    val state by viewModel.state.collectAsState()
    var name by remember(state.name) { mutableStateOf(state.name) }
    var phone by remember(state.phone) { mutableStateOf(state.phone) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Your profile", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = "The details we use for your account. Your BVN is stored encrypted and never shown again.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(20.dp))

        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Personal details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "Name and phone.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))

                state.error?.let {
                    Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                state.message?.let {
                    Text(text = it, style = MaterialTheme.typography.bodySmall, color = Color(0xFF1B6B3C))
                    Spacer(modifier = Modifier.height(8.dp))
                }

                AppTextField(label = "Full name", value = name, onValueChange = { name = it })
                Spacer(modifier = Modifier.height(12.dp))
                AppTextField(label = "Phone number (optional)", hint = "e.g. 0803 123 4567", keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone, value = phone, onValueChange = { phone = it })
                Spacer(modifier = Modifier.height(12.dp))
                AppTextField(label = "Email address", value = user.email, enabled = false)
                Text(text = "Email cannot be changed. ${if (user.emailVerified) "Verified." else "Not verified yet."}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(16.dp))

                AppButton(onClick = { viewModel.saveProfile(name, phone) }, label = if (state.saving) "Saving…" else "Save changes", fullWidth = true)
            }
        }
        Spacer(modifier = Modifier.height(20.dp))

        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Change password", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "Changing your password signs you out of every device.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))

                var current by remember { mutableStateOf("") }
                var next by remember { mutableStateOf("") }
                var confirm by remember { mutableStateOf("") }

                AppTextField(label = "Current password", password = true, value = current, onValueChange = { current = it })
                Spacer(modifier = Modifier.height(12.dp))
                AppTextField(label = "New password", hint = "8+ chars, letter and number", password = true, value = next, onValueChange = { next = it })
                Spacer(modifier = Modifier.height(12.dp))
                AppTextField(label = "Confirm new password", password = true, value = confirm, onValueChange = { confirm = it })
                Spacer(modifier = Modifier.height(16.dp))

                AppButton(onClick = { viewModel.changePassword(current, next, confirm) }, label = if (state.changingPassword) "Updating…" else "Update password", fullWidth = true)
            }
        }
    }
}

/* ==================================================================== */
/* Notifications                                                        */
/* ==================================================================== */

@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val navController = LocalNavController.current

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Notifications", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = if (state.unreadCount > 0) "${state.unreadCount} unread" else "You’re all caught up.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (state.unreadCount > 0) {
            Spacer(modifier = Modifier.height(8.dp))
            AppButton(onClick = { viewModel.readAll() }, variant = ButtonVariant.Ghost, label = "Mark all as read")
        }
        Spacer(modifier = Modifier.height(20.dp))

        state.error?.let {
            AppError(message = it)
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (state.items.isEmpty()) {
            AppEmptyState(title = "No notifications yet", body = "Payment confirmations, proof reviews and account events will appear here.")
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(state.items, key = { it.id }) { n ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp).clickable { if (!n.readAt.isNullOrEmpty()) viewModel.markRead(n.id) }) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = when (n.type) {
                                    "payment_completed" -> "Payment"
                                    "proof_rejected", "proof_approved" -> "Proof"
                                    "kyc_approved", "kyc_rejected" -> "Identity"
                                    "email_verified", "password_changed" -> "Account"
                                    "contribution_reminder" -> "Reminder"
                                    else -> "Update"
                                }, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                                if (n.readAt.isNullOrEmpty()) {
                                    AppBadge(text = "new", tone = BadgeTone.Gold)
                                }
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(text = n.title, style = MaterialTheme.typography.bodyMedium)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(text = n.body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(text = timeAgo(n.createdAt), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (!n.readAt.isNullOrEmpty()) {
                        Divider()
                    }
                }
            }
        }
    }
}

/* ==================================================================== */
/* History                                                              */
/* ==================================================================== */

@Composable
fun HistoryScreen(
    viewModel: HistoryViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val navController = LocalNavController.current

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Payment history", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = "Every payment attempt on your contributions, newest first.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(20.dp))

        state.error?.let {
            AppError(message = it)
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (state.payments.isEmpty()) {
            AppEmptyState(title = "No payments yet", body = "When you pay a contribution — by card or transfer proof — it will appear here.")
        } else {
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
                Column(modifier = Modifier.padding(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp)) {
                        columnWeights = listOf(2f, 1f, 1f, 1f, 1f, 1f)
                        Text(text = "Contribution", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.weight(1f))
                        Text(text = "Amount", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.weight(1f))
                        Text(text = "Status", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.weight(1f))
                        Text(text = "Gateway", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.weight(1f))
                        Text(text = "When", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.weight(1f))
                        Text(text = "Reference", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Divider()
                    items(state.payments, key = { it.id }) { p ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(2f)) {
                                Text(text = p.label ?: "Contribution", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                p.proofStatus?.let {
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(text = "proof: $it${p.proofNote?.let { " — $it" } ?: ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                p.failureReason?.let {
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                                }
                            }
                            Spacer(modifier = Modifier.weight(1f))
                            Text(text = formatNgn(p.amount), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                            Spacer(modifier = Modifier.weight(1f))
                            AppBadge(text = when (p.status) {
                                "completed" -> "Completed"; "pending_verification" -> "Proof in review"; "failed" -> "Failed"; else -> "Pending"
                            }, tone = when (p.status) {
                                "completed" -> BadgeTone.Ok; "failed" -> BadgeTone.Bad; else -> BadgeTone.Warn
                            })
                            Spacer(modifier = Modifier.weight(1f))
                            Text(text = p.gateway, style = MaterialTheme.typography.bodySmall)
                            Spacer(modifier = Modifier.weight(1f))
                            Text(text = formatDate(p.createdAt), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.weight(1f))
                            Text(text = p.gatewayReference ?: "—", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Divider()
                    }
                }
            }
        }

        state.pagination?.let { p ->
            if (p.totalPages > 1) {
                Spacer(modifier = Modifier.height(20.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                    AppButton(onClick = { if (state.page > 1) viewModel.load(state.page - 1) }, variant = ButtonVariant.Ghost, label = "← Newer", enabled = state.page > 1)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "Page ${p.page} of ${p.totalPages}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.width(8.dp))
                    AppButton(onClick = { if (state.page < p.totalPages) viewModel.load(state.page + 1) }, variant = ButtonVariant.Ghost, label = "Older →", enabled = state.page < p.totalPages)
                }
            }
        }
    }
}
