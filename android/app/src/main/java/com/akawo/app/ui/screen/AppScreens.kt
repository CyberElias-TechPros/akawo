package com.akawo.app.ui.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.LocalNavController
import androidx.navigation.compose.navArgument
import androidx.navigation.compose.navDeepLink
import com.akawo.app.R
import com.akawo.app.ui.component.*
import com.akawo.app.ui.nav.Routes
import com.akawo.app.ui.theme.AkawoTheme
import com.akawo.app.ui.util.*
import com.akawo.app.ui.viewmodel.*
import java.io.File

/* ==================================================================== */
/* App tab shell + bottom navigation                                    */
/* ==================================================================== */

@Composable
fun AppTabScreen(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    navController: NavHostController = LocalNavController.current,
    content: @Composable () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.weight(1f)) {
            content()
        }
        BottomNavigation(
            selectedTabIndex = selectedTab,
            onTabSelected = { tab ->
                onTabSelected(tab)
                when (tab) {
                    0 -> navController.navigate(Routes.Dashboard) { singleTop = true }
                    1 -> navController.navigate(Routes.Contributions) { singleTop = true }
                    2 -> navController.navigate(Routes.Verification) { singleTop = true }
                    3 -> navController.navigate(Routes.Notifications) { singleTop = true }
                    4 -> navController.navigate(Routes.Profile) { singleTop = true }
                }
            },
            backgroundColor = MaterialTheme.colorScheme.surface,
        ) {
            val tabs = listOf(
                Pair("Dashboard", Icons.Default.Dashboard),
                Pair("Contributions", Icons.Default.AttachMoney),
                Pair("Verification", Icons.Default.VerifiedUser),
                Pair("Notifications", Icons.Default.NotificationsNone),
                Pair("Profile", Icons.Default.Person),
            )
            tabs.forEachIndexed { index, (label, icon) ->
                BottomNavigationItem(
                    icon = { IconButton(onClick = {}, enabled = false) { androidx.compose.material3.Icon(imageVector = icon, contentDescription = null) } },
                    label = { Text(text = label) },
                    selected = index == selectedTab,
                    onClick = { onTabSelected(index) },
                )
            }
        }
    }
}

/* ==================================================================== */
/* Admin shell                                                          */
/* ==================================================================== */

@Composable
fun AdminShell(
    navController: NavHostController = LocalNavController.current,
    content: @Composable () -> Unit,
) {
    var selectedTab by remember { mutableStateOf(0) }

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(text = "Admin console") },
            colors = TopAppBarDefaults.mediumTopAppBarColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ),
            elevation = 0.dp,
        )
        content()
        Spacer(modifier = Modifier.weight(1f))
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
}
    var selectedTab by remember { mutableStateOf(0) }

    BottomNavigation(
        selectedTabIndex = selectedTab,
        onTabSelected = { tab ->
            selectedTab = tab
            when (tab) {
                0 -> navController.navigate(Routes.Dashboard) { singleTop = true }
                1 -> navController.navigate(Routes.Contributions) { singleTop = true }
                2 -> navController.navigate(Routes.Verification) { singleTop = true }
                3 -> navController.navigate(Routes.Notifications) { singleTop = true }
                4 -> navController.navigate(Routes.Profile) { singleTop = true }
            }
        },
        backgroundColor = MaterialTheme.colorScheme.surface,
    ) {
        val tabs = listOf(
            Pair("Dashboard", Icons.Default.Dashboard),
            Pair("Contributions", Icons.Default.AttachMoney),
            Pair("Verification", Icons.Default.VerifiedUser),
            Pair("Notifications", Icons.Default.NotificationsNone),
            Pair("Profile", Icons.Default.Person),
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
/* Dashboard                                                            */
/* ==================================================================== */

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val navController = LocalNavController.current

    when (val resource = state.resource) {
        is com.akawo.app.ui.state.Resource.Loading -> AppLoading()
        is com.akawo.app.ui.state.Resource.Error -> AppError(message = resource.message ?: "Failed to load dashboard.")
        is com.akawo.app.ui.state.Resource.Success -> {
            val data = resource.data
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                Text(text = "Dashboard", style = MaterialTheme.typography.headlineLarge)
                Spacer(modifier = Modifier.height(8.dp))
                val firstName = (data.user?.name?.split(" ").firstOrNull() ?: "there")
                val hour = java.time.LocalTime.now(java.time.ZoneId.of("Africa/Lagos")).hour
                val greeting = when {
                    hour < 12 -> "Good morning"
                    hour < 17 -> "Good afternoon"
                    else -> "Good evening"
                }
                Text(text = "$greeting, $firstName", style = MaterialTheme.typography.titleLarge, fontWeight = androidx.compose.ui.text.FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "Here’s where your savings stand right now.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(16.dp))

                if (!data.verification.isVerified) {
                    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFDF3DC)), modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "Verify your identity to unlock full trust", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                            Spacer(modifier = Modifier.weight(1f))
                            AppButton(onClick = { navController.navigate(Routes.Verification) }, variant = ButtonVariant.Outlined, label = "Verify now")
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }
                if (!data.verification.emailVerified) {
                    Text(text = "Email not verified — check your inbox for the link (expires in 24 hours).", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // Stat cards
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    val s = data.summary
                    StatCard(label = "Total contributed", value = formatNgn(s?.totalContributed ?: 0.0), sub = "${s?.paidCount ?: 0} contribution${if (s?.paidCount == 1) "" else "s"} paid", tone = StatTone.Gold, modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    StatCard(label = "Pending amount", value = formatNgn(s?.pendingAmount ?: 0.0), sub = "${s?.pendingCount ?: 0} awaiting payment", modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    StatCard(label = "Monthly commitments", value = formatNgn(s?.monthlyTotal ?: 0.0), sub = "recurring, per month", modifier = Modifier.weight(1f))
                }
                Spacer(modifier = Modifier.height(20.dp))

                // Next contribution
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "Next contribution", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        data.nextContribution?.let { nc ->
                            AppButton(
                                onClick = { navController.navigate("${Routes.ContributionPay}/${nc.id}") },
                                variant = ButtonVariant.Filled,
                                label = if (nc.overdue) "Pay now — overdue" else "Pay now",
                            )
                        }
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        data.nextContribution?.let { nc ->
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text(text = nc.label ?: "Next contribution", style = MaterialTheme.typography.bodyLarge)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(text = "${formatNgn(nc.amount)} · due ${formatDate(nc.dueDate)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (nc.overdue) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    AppBadge(text = "Overdue", tone = BadgeTone.Bad)
                                }
                            }
                        } ?: run {
                            Text(text = "No pending contributions", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = "You’re all paid up. Start a new contribution whenever you’re ready.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            AppButton(onClick = { navController.navigate(Routes.Contributions) }, variant = ButtonVariant.Ghost, label = "New contribution")
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))

                // Recent contributions
                SectionHeader(title = "Recent contributions", subtitle = "Your last five, newest first.", onSeeAll = { navController.navigate(Routes.Contributions) })
                if (data.recentContributions.isEmpty()) {
                    AppEmptyState(title = "Nothing yet", body = "Create your first contribution.")
                } else {
                    LazyColumn(modifier = Modifier.fillMaxWidth()) {
                        items(data.recentContributions, key = { it.id }) { c ->
                            ContributionRow(contribution = c, onPay = { navController.navigate("${Routes.ContributionPay}/${c.id}") }, onEdit = { /* handled in Contributions screen */ })
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))

                // Recent payments
                SectionHeader(title = "Recent payments", subtitle = "How money moved in, most recent first.", onSeeAll = { navController.navigate(Routes.History) })
                if (data.recentPayments.isEmpty()) {
                    AppEmptyState(title = "No payments yet", body = "When you pay a contribution — by card or transfer proof — it will appear here.")
                } else {
                    LazyColumn(modifier = Modifier.fillMaxWidth()) {
                        items(data.recentPayments, key = { it.id }) { p ->
                            PaymentRow(payment = p)
                        }
                    }
                }

                // Admin shortcut
                if (data.user.role == "admin") {
                    Spacer(modifier = Modifier.height(20.dp))
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF082E16)), shape = MaterialTheme.shapes.large) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(text = "Admin console", style = MaterialTheme.typography.titleMedium, color = Color.White)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = "You have administrator access to Akawo.", style = MaterialTheme.typography.bodySmall, color = Color(0xFFB9D4C1))
                            Spacer(modifier = Modifier.height(12.dp))
                            AppButton(onClick = { navController.navigate(Routes.Admin) }, variant = ButtonVariant.Outlined, label = "Open admin", fullWidth = true)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, subtitle: String? = null, onSeeAll: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Column {
            Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            subtitle?.let {
                Spacer(modifier = Modifier.height(2.dp))
                Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        AppButton(onClick = onSeeAll, variant = ButtonVariant.Ghost, label = "View all")
    }
    Spacer(modifier = Modifier.height(10.dp))
}

@Composable
private fun ContributionRow(contribution: com.akawo.app.data.model.Contribution, onPay: () -> Unit, onEdit: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = contribution.label ?: "Contribution", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            Span(
                parts = listOf(
                    Span.TextPart(text = if (contribution.frequency == "monthly") "Monthly · " else ""),
                    Span.TextPart(text = if (contribution.status == "paid") "paid ${formatDate(contribution.paidAt)}" else "due ${formatDate(contribution.dueDate)}"),
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Column(horizontalArrangement = Arrangement.End, modifier = Modifier.weight(0.3f)) {
            Text(text = formatNgn(contribution.amount), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
            AppBadge(text = if (contribution.status == "paid") "Paid" else if (contribution.overdue) "Overdue" else "Pending", tone = if (contribution.status == "paid") BadgeTone.Ok else if (contribution.overdue) BadgeTone.Bad else BadgeTone.Warn)
            if (contribution.status == "pending") {
                AppButton(onClick = onPay, variant = ButtonVariant.Ghost, label = "Pay")
            }
        }
    }
    Divider()
}

@Composable
private fun Span(parts: List<SpanPart>, style: TextStyle, color: Color) {
    // Inline span fallback: render as one text with the first non-empty part.
    val text = parts.joinToString("") { it.text }
    Text(text = text, style = style, color = color)
}

private data class SpanPart(val text: String)

@Composable
private fun PaymentRow(payment: com.akawo.app.data.model.Payment) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = payment.label ?: "Payment", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            Text(text = "${payment.gateway} · ${timeAgo(payment.createdAt)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            payment.proofStatus?.let {
                Spacer(modifier = Modifier.height(2.dp))
                Text(text = "proof: $it${payment.proofNote?.let { " — $it" } ?: ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Column(horizontalArrangement = Arrangement.End) {
            Text(text = formatNgn(payment.amount), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
            AppBadge(text = when (payment.status) {
                "completed" -> "Completed"; "pending_verification" -> "Proof in review"; "failed" -> "Failed"; else -> "Pending"
            }, tone = when (payment.status) {
                "completed" -> BadgeTone.Ok; "failed" -> BadgeTone.Bad; else -> BadgeTone.Warn
            })
        }
    }
    Divider()
}

/* ==================================================================== */
/* Contributions                                                        */
/* ==================================================================== */

@Composable
fun ContributionsScreen(
    viewModel: ContributionsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val navController = LocalNavController.current

    var amount by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf("") }
    var label by remember { mutableStateOf("") }
    var frequency by remember { mutableStateOf("once") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        Text(text = "Your contributions", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = "Every amount you’ve committed to, in one place. Pay by card or upload transfer proof when you’re ready.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(20.dp))

        // New contribution form
        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "New contribution", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "Minimum ₦1.00 · maximum ₦10,000,000", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))

                state.error?.let {
                    AppError(message = it)
                    Spacer(modifier = Modifier.height(12.dp))
                }

                AppTextField(label = "Amount (₦)", hint = "e.g. 25000", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number, value = amount, onValueChange = { amount = it })
                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    AppTextField(label = "Due date", hint = todayIso(), keyboardType = androidx.compose.ui.text.input.KeyboardType.Text, value = dueDate, onValueChange = { dueDate = it }, modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    AppTextField(label = "Frequency", value = frequency, onValueChange = { frequency = it }, modifier = Modifier.weight(1f))
                }
                Spacer(modifier = Modifier.height(12.dp))
                AppTextField(label = "Label (optional)", hint = "e.g. School fees", value = label, onValueChange = { label = it })
                Spacer(modifier = Modifier.height(16.dp))

                AppButton(
                    onClick = {
                        val amt = amount.toDoubleOrNull()
                        if (amt == null || !isValidAmount(amount)) { return@AppButton }
                        viewModel.create(amt, dueDate.takeIf { it.isNotBlank() }, label.takeIf { it.isNotBlank() }, frequency)
                    },
                    label = if (state.creating) "Creating…" else "Create contribution",
                    fullWidth = true,
                    enabled = amount.toDoubleOrNull() != null && isValidAmount(amount),
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))

        // Filters
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            AppTextField(label = "Filter by label…", value = state.labelFilter, onValueChange = { viewModel.setLabelFilter(it) }, modifier = Modifier.weight(1f))
            Spacer(modifier = Modifier.width(8.dp))
            var statusMenuOpen by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(
                expanded = statusMenuOpen,
                onExpandedChange = { statusMenuOpen = it },
                modifier = Modifier.width(120.dp),
            ) {
                TextField(
                    value = when (state.statusFilter) {
                        "" -> "All statuses"; "pending" -> "Pending"; "paid" -> "Paid"; "failed" -> "Failed"; else -> state.statusFilter
                    },
                    onValueChange = {},
                    readOnly = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = TextFieldDefaults.textFieldColors(
                        backgroundColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedContainerColor = Color.Transparent,
                    ),
                )
                ExposedDropdownMenu(
                    expanded = statusMenuOpen,
                    onDismissRequest = { statusMenuOpen = false },
                ) {
                    DropdownMenuItem(text = { Text(text = "All statuses") }, onClick = { viewModel.setStatusFilter(""); statusMenuOpen = false })
                    DropdownMenuItem(text = { Text(text = "Pending") }, onClick = { viewModel.setStatusFilter("pending"); statusMenuOpen = false })
                    DropdownMenuItem(text = { Text(text = "Paid") }, onClick = { viewModel.setStatusFilter("paid"); statusMenuOpen = false })
                    DropdownMenuItem(text = { Text(text = "Failed") }, onClick = { viewModel.setStatusFilter("failed"); statusMenuOpen = false })
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        if (state.loading) {
            AppLoading(modifier = Modifier.fillMaxWidth().height(200.dp))
        } else if (state.list.isEmpty()) {
            AppEmptyState(title = "No contributions found", body = "Create a contribution above — pick an amount and a due date, and Akawo will keep the rhythm.")
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(state.list, key = { it.id }) { c ->
                    ContributionRow(
                        contribution = c,
                        onPay = { navController.navigate("${Routes.ContributionPay}/${c.id}") },
                        onEdit = {},
                    )
                    // Edit / delete chips
                    if (c.status == "pending" || c.status == "failed") {
                        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                            AppButton(onClick = { /* open edit */ }, variant = ButtonVariant.Ghost, label = "Edit")
                            Spacer(modifier = Modifier.width(8.dp))
                            AppButton(onClick = { viewModel.delete(c.id) }, variant = ButtonVariant.Ghost, label = "Delete")
                        }
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

/* ==================================================================== */
/* Contribution pay                                                       */
/* ==================================================================== */

@Composable
fun ContributionPayScreen(
    contributionId: String,
    viewModel: ContributionPayViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val navController = LocalNavController.current

    val contribution = state.contribution
    if (contribution == null) {
        AppLoading()
    } else {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
            Text(text = "Contribute", style = MaterialTheme.typography.headlineLarge)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = contribution.label ?: "Make a payment", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(text = "${formatNgn(contribution.amount)}${contribution.dueDate?.let { " · due ${formatDate(it)}" } ?: ""}${if (contribution.overdue) " — overdue, pay it today" else ""}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(20.dp))

            state.error?.let {
                AppError(message = it)
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (state.phase == ContributionPayViewModel.Phase.Done) {
                val p = state.payment
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = when {
                            p?.status == "completed" -> "Payment complete"
                            p?.status == "pending_verification" -> "Proof received"
                            else -> "Not this time"
                        }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = when {
                            p?.status == "completed" -> "Your contribution is now marked as paid. A receipt email is on its way."
                            p?.status == "pending_verification" -> "Our team will review your transfer screenshot and confirm it — you’ll be notified with the outcome."
                            else -> "The gateway could not process this card${p?.failureReason?.let { " ($it)" } ?: ""}. You can try again with a different card, or upload a bank transfer proof instead."
                        }, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        p?.let {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = "Reference: ${it.gatewayReference ?: "—"} · ${formatNgn(it.amount)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            if (contribution.status == "paid") {
                                AppButton(onClick = { navController.navigate(Routes.Dashboard) }, label = "Back to dashboard")
                            } else {
                                AppButton(onClick = { viewModel.reset() }, label = "Try again")
                                AppButton(onClick = { navController.navigate(Routes.Dashboard) }, variant = ButtonVariant.Ghost, label = "Later")
                            }
                        }
                    }
                }
            } else if (contribution.status == "paid") {
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "Already paid", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "This contribution was confirmed on ${formatDate(contribution.paidAt)}.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(16.dp))
                        AppButton(onClick = { navController.navigate(Routes.Dashboard) }, label = "Back to dashboard", fullWidth = true)
                    }
                }
            } else {
                var cardNumber by remember { mutableStateOf("") }
                var expiry by remember { mutableStateOf("") }
                var cvv by remember { mutableStateOf("") }
                var cardName by remember { mutableStateOf("") }
                var proofFile by remember { mutableStateOf<File?>(null) }
                var tab by remember { mutableStateOf("card") }

                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = MaterialTheme.shapes.medium) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "Pay ${formatNgn(contribution.amount)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "Two ways to settle. Both land in the same clean ledger.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(12.dp))

                        SegmentedButton(
                            selectedValues = setOf(tab),
                            onSelectionChange = { tab = it.first() },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            SegmentedButtonItem(value = "card") { Text(text = "Pay by card") }
                            SegmentedButtonItem(value = "proof") { Text(text = "Transfer proof") }
                        }
                        Spacer(modifier = Modifier.height(16.dp))

                        if (tab == "card") {
                            AppTextField(label = "Card number", hint = "5396 0000 0000 0000", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number, value = cardNumber, onValueChange = { cardNumber = it.filter { it.isDigit() || it.isWhitespace() }.take(23) })
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(modifier = Modifier.fillMaxWidth()) {
                                AppTextField(label = "Expiry (MM/YY)", hint = "12/28", value = expiry, onValueChange = { expiry = it.take(5) }, modifier = Modifier.weight(1f))
                                Spacer(modifier = Modifier.width(8.dp))
                                AppTextField(label = "CVV", hint = "123", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number, password = true, value = cvv, onValueChange = { cvv = it.filter { it.isDigit() }.take(4) }, modifier = Modifier.weight(1f))
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            AppTextField(label = "Name on card", hint = "CHINEDU OKAFOR", value = cardName, onValueChange = { cardName = it })
                            Spacer(modifier = Modifier.height(16.dp))
                            AppButton(
                                onClick = { viewModel.payByCard(cardNumber, expiry, cvv, cardName) },
                                label = if (state.loading) "Processing…" else "Pay ${formatNgn(contribution.amount)}",
                                fullWidth = true,
                                enabled = !state.loading,
                            )
                        } else {
                            ProofPicker(
                                file = proofFile,
                                onFileSelected = { proofFile = it },
                                onCapture = { /* handled by activity result */ },
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(text = "JPG, PNG, WEBP, HEIC or PDF · up to 8 MB", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = "Bank apps: copy the transfer confirmation screen. Our team reviews every proof and confirms the amount matches to the kobo.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(16.dp))
                            AppButton(
                                onClick = { if (proofFile != null) viewModel.uploadProof(proofFile!!) },
                                label = if (state.loading) "Uploading…" else "Upload proof for review",
                                fullWidth = true,
                                enabled = proofFile != null && !state.loading,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProofPicker(file: File?, onFileSelected: (File) -> Unit, onCapture: () -> Unit) {
    val label = file?.name ?: "Choose your transfer screenshot"
    val detail = if (file != null) "${(file.length() / 1024.0 / 1024.0).toString().take(4)} MB — click to replace" else "JPG, PNG, WEBP, HEIC or PDF · up to 8 MB"
    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F7F6)), shape = MaterialTheme.shapes.medium) {
        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = label, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(12.dp))
            AppButton(onClick = onCapture, variant = ButtonVariant.Outlined, label = "Choose file", fullWidth = true)
        }
    }
}
