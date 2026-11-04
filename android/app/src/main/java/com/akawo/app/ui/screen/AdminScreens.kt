package com.akawo.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.akawo.app.R
import com.akawo.app.ui.component.*
import com.akawo.app.ui.theme.AkawoTheme
import com.akawo.app.ui.util.*
import com.akawo.app.ui.viewmodel.*
import java.io.File

/* ==================================================================== */
/* Admin shell                                                          */
/* ==================================================================== */

@Composable
fun AdminShell(
    navController: NavHostController = LocalNavController.current,
) {
    var selectedTab by remember { mutableStateOf(0) }

    TopAppBar(
        title = { Text(text = "Admin console") },
        colors = TopAppBarDefaults.mediumTopAppBarColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
        elevation = 0.dp,
    )

    BottomNavigation(
        selectedTabIndex = selectedTab,
        onTabSelected = { tab ->
            selectedTab = tab
            when (tab) {
                0 -> navController.navigate(Routes.Admin) { singleTop = true }
                1 -> navController.navigate(Routes.AdminUsers) { singleTop = true }
                2 -> navController.navigate(Routes.AdminVerifications) { singleTop = true }
                3 -> navController.navigate(Routes.AdminPayments) { singleTop = true }
            }
        },
        backgroundColor = MaterialTheme.colorScheme.surface,
    ) {
        val tabs = listOf(
            Pair("Stats", Icons.Default.BarChart),
            Pair("Users", Icons.Default.People),
            Pair("KYC", Icons.Default.VerifiedUser),
            Pair("Payments", Icons.Default.AttachMoney),
        )
        tabs.forEachIndexed { index, (label, icon) ->
            BottomNavigationItem(
                icon = { IconButton(onClick = {}, enabled = false) { androidx.compose.material3.Icon(imageVector = icon, contentDescription = null) } },
                label = { Text(text = label) },
                selected = index == selectedTab,
                onClick = { selectedTab = index },
            )
        }
    }
}

/* ==================================================================== */
/* Admin stats                                                          */
/* ==================================================================== */

@Composable
fun AdminStatsScreen(
    viewModel: AdminStatsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Admin dashboard", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(16.dp))

        state.error?.let { AppError(message = it); Spacer(modifier = Modifier.height(12.dp)) }

        if (state.loading) {
            AppLoading(modifier = Modifier.fillMaxWidth().height(300.dp))
        } else {
            val s = state.stats
            if (s != null) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    StatCard(label = "Users", value = s.users.total.toString(), sub = "${s.users.verified} verified · ${s.users.pendingKyc} KYC", modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    StatCard(label = "Contributions", value = s.contributions.count.toString(), sub = "₦${s.contributions.total} total", modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    StatCard(label = "Payments", value = s.payments.completed.toString(), sub = "${s.payments.failed} failed", modifier = Modifier.weight(1f))
                }
                Spacer(modifier = Modifier.height(16.dp))

                SectionHeader2(title = "Recent payments", onSeeAll = {})
                if (s.recentPayments.isEmpty()) {
                    AppEmptyState(title = "No recent payments")
                } else {
                    LazyColumn(modifier = Modifier.fillMaxWidth()) {
                        items(s.recentPayments, key = { it.id }) { p ->
                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(text = p.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                    Text(text = p.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Spacer(modifier = Modifier.weight(1f))
                                Text(text = formatNgn(p.amount), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                                AppBadge(text = p.status.capitalize(), tone = BadgeTone.Default)
                            }
                            Divider()
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader2(title: String, onSeeAll: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        AppButton(onClick = onSeeAll, variant = ButtonVariant.Ghost, label = "View all")
    }
    Spacer(modifier = Modifier.height(10.dp))
}

/* ==================================================================== */
/* Admin users                                                          */
/* ==================================================================== */

@Composable
fun AdminUsersScreen(
    viewModel: AdminUsersViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val navController = LocalNavController.current
    var search by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Users", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(16.dp))

        AppTextField(label = "Search users…", value = search, onValueChange = { search = it })
        Spacer(modifier = Modifier.height(16.dp))

        state.error?.let { AppError(message = it); Spacer(modifier = Modifier.height(12.dp)) }

        if (state.loading) {
            AppLoading(modifier = Modifier.fillMaxWidth().height(300.dp))
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(state.users, key = { it.id }) { u ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = u.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text(text = u.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(text = "BVN ending ${u.bvnLast4 ?: "—"} · ${u.role.capitalize()} · ${u.status.capitalize()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Column(horizontalArrangement = Arrangement.End, modifier = Modifier.weight(0.3f)) {
                            if (u.status == "active") {
                                AppButton(onClick = { viewModel.setUserStatus(u.id, "suspended") }, variant = ButtonVariant.Outlined, label = "Suspend")
                            } else {
                                AppButton(onClick = { viewModel.setUserStatus(u.id, "active") }, variant = ButtonVariant.Outlined, label = "Activate")
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            val promote = u.role == "user"
                            AppButton(onClick = { if (promote) viewModel.setUserRole(u.id, "admin") else viewModel.setUserRole(u.id, "user") }, variant = ButtonVariant.Ghost, label = if (promote) "Promote to admin" else "Demote to user")
                        }
                    }
                    Divider()
                }
            }
            state.pagination?.let { p ->
                if (p.totalPages > 1) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        AppButton(onClick = { viewModel.load(page = state.pagination?.page?.minus(1) ?: 1, q = search.takeIf { it.isNotBlank() }) }, variant = ButtonVariant.Ghost, label = "← Newer")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Page ${p.page} of ${p.totalPages}", style = MaterialTheme.typography.bodySmall)
                        Spacer(modifier = Modifier.width(8.dp))
                        AppButton(onClick = { viewModel.load(page = state.pagination?.page?.plus(1) ?: 1, q = search.takeIf { it.isNotBlank() }) }, variant = ButtonVariant.Ghost, label = "Older →")
                    }
                }
            }
        }
    }
}

/* ==================================================================== */
/* Admin KYC queue                                                      */
/* ==================================================================== */

@Composable
fun AdminKycScreen(
    viewModel: AdminKycViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "KYC queue", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(16.dp))

        state.error?.let { AppError(message = it); Spacer(modifier = Modifier.height(12.dp)) }

        if (state.loading) {
            AppLoading(modifier = Modifier.fillMaxWidth().height(300.dp))
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(state.queue, key = { it.id }) { v ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = v.user.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text(text = v.user.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(text = "Submitted ${formatDate(v.createdAt)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        AppButton(onClick = { /* navigate to detail */ }, label = "Review")
                    }
                    Divider()
                }
            }
        }
    }
}

@Composable
fun AdminKycDetailScreen(
    verificationId: String,
    viewModel: AdminKycViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val navController = LocalNavController.current

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Verification review", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(16.dp))

        if (state.loadingDetail) {
            AppLoading(modifier = Modifier.fillMaxWidth().height(300.dp))
        } else {
            val d = state.detail
            if (d != null) {
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(0.5f)) {
                        Text(text = d.user.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(text = d.user.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(text = "BVN ending ${d.user.bvnLast4 ?: "—"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(12.dp))
                        AppBadge(text = d.verification.status.capitalize(), tone = BadgeTone.Default)
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(0.5f)) {
                        AsyncImage(model = Uri.parse(d.media.face), contentDescription = "KYC face", modifier = Modifier.fillMaxWidth().height(160.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "Facial photo", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
                d.verification.rejectReason?.let {
                    Text(text = "Reject reason: $it", style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(12.dp))
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    AppButton(onClick = { viewModel.approve(d.verification.id) }, label = "Approve")
                    AppButton(onClick = { /* open reject dialog */ }, variant = ButtonVariant.Outlined, label = "Reject")
                }
                AppButton(onClick = { navController.popBackStack() }, variant = ButtonVariant.Ghost, label = "Back to queue")
            }
        }
    }
}

/* ==================================================================== */
/* Admin payments                                                       */
/* ==================================================================== */

@Composable
fun AdminPaymentsScreen(
    viewModel: AdminPaymentsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var rejectReason by remember { mutableStateOf("") }
    var rejectingId by remember { mutableStateOf<String?>(null) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Payments", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(16.dp))

        state.error?.let { AppError(message = it); Spacer(modifier = Modifier.height(12.dp)) }

        if (state.loading) {
            AppLoading(modifier = Modifier.fillMaxWidth().height(300.dp))
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(state.payments, key = { it.id }) { p ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = p.user?.name ?: "—", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text(text = p.label ?: "Contribution", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(text = "${formatNgn(p.amount)} · ${p.status.capitalize()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Column(horizontalArrangement = Arrangement.End) {
                            if (p.proofStatus == "unreviewed") {
                                AppButton(onClick = { viewModel.approveProof(p.id, null) }, label = "Approve")
                                Spacer(modifier = Modifier.height(8.dp))
                                AppButton(onClick = { rejectingId = p.id }, variant = ButtonVariant.Outlined, label = "Reject")
                            }
                        }
                    }
                    Divider()
                }
            }
        }

        rejectingId?.let { id ->
            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                Text(text = "Reject proof", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))
                AppTextField(label = "Reason", value = rejectReason, onValueChange = { rejectReason = it }, maxLines = 3, singleLine = false)
                Spacer(modifier = Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.End) {
                    AppButton(onClick = { viewModel.rejectProof(id, rejectReason); rejectingId = null }, label = "Reject")
                    Spacer(modifier = Modifier.width(8.dp))
                    AppButton(onClick = { rejectingId = null }, variant = ButtonVariant.Ghost, label = "Cancel")
                }
            }
        }
    }
}

/* ==================================================================== */
/* Admin emails & audit                                                 */
/* ==================================================================== */

@Composable
fun AdminEmailsScreen(
    viewModel: AdminOutboxViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Email outbox", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(16.dp))
        if (state.loading) AppLoading(modifier = Modifier.fillMaxWidth().height(300.dp))
        else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(state.emails, key = { it.id }) { e ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = e.subject, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text(text = e.to, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(text = formatDate(e.createdAt), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Divider()
                }
            }
        }
    }
}

@Composable
fun AdminAuditScreen(
    viewModel: AdminOutboxViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(text = "Audit log", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(16.dp))
        if (state.loading) AppLoading(modifier = Modifier.fillMaxWidth().height(300.dp))
        else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(state.audit, key = { it.id }) { a ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = a.action, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text(text = "${a.actor} on ${a.entity ?: "—"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(text = formatDate(a.createdAt), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Divider()
                }
            }
        }
    }
}
