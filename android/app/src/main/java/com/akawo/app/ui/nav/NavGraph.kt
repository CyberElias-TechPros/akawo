package com.akawo.app.ui.nav

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.LocalNavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.navArgument
import androidx.navigation.compose.navDeepLink
import androidx.navigation.compose.navType
import com.akawo.app.R
import com.akawo.app.ui.screen.*
import com.akawo.app.ui.theme.AkawoTheme
import com.akawo.app.ui.util.DeepLinkHolder
import com.akawo.app.ui.viewmodel.AuthViewModel
import com.akawo.app.ui.viewmodel.AuthViewModel.SessionState

@Composable
fun NavGraph(authViewModel: AuthViewModel) {
    val navController = rememberNavController()
    val session by authViewModel.session.collectAsState()
    val isAdmin by authViewModel.isAdmin.collectAsState()
    val deepLink by DeepLinkHolder.intent.asStateFlow().collectAsState()

    LaunchedEffect(deepLink) {
        deepLink?.let { navController.handleDeepLink(it) }
    }

    AkawoTheme {
        NavHost(navController = navController, startDestination = Routes.Root) {

            /* ---------------------------------------------------------- */
/* Public: splash                                                       */
/* ---------------------------------------------------------- */
            composable(Routes.Root) {
                SplashScreen(
                    onSignedIn = {
                        navController.navigate(Routes.Dashboard) {
                            popUpTo(Routes.Root) { inclusive = true }
                        }
                    },
                    onNotSignedIn = {
                        navController.navigate(Routes.Login) {
                            popUpTo(Routes.Root) { inclusive = true }
                        }
                    },
                )
            }

            /* ---------------------------------------------------------- */
/* Public: auth                                                         */
/* ---------------------------------------------------------- */
            composable(Routes.Login) {
                LoginScreen(
                    viewModel = hiltViewModel(),
                    onRegister = { navController.navigate(Routes.Register) },
                    onForgot = { navController.navigate(Routes.ForgotPassword) },
                )
            }
            composable(Routes.Register) {
                RegisterScreen(
                    viewModel = hiltViewModel(),
                    onLogin = { navController.navigate(Routes.Login) },
                )
            }
            composable(Routes.ForgotPassword) {
                ForgotPasswordScreen(
                    viewModel = hiltViewModel(),
                    onLogin = { navController.navigate(Routes.Login) },
                )
            }
            composable(
                Routes.ResetPassword,
                arguments = listOf(navArgument("token") { nullable = true }),
                deepLinks = listOf(
                    navDeepLink { pattern = "akawo://reset?token={token}" },
                ),
            ) {
                val token = currentBackStackEntryAsState()?.arguments?.getString("token")
                ResetPasswordScreen(
                    viewModel = hiltViewModel(),
                    token = token,
                    onLogin = { navController.navigate(Routes.Login) },
                )
            }
            composable(
                Routes.VerifyEmail,
                arguments = listOf(navArgument("token") { nullable = true }),
                deepLinks = listOf(
                    navDeepLink { pattern = "akawo://verify?token={token}" },
                ),
            ) {
                val token = currentBackStackEntryAsState()?.arguments?.getString("token")
                VerifyEmailScreen(
                    viewModel = hiltViewModel(),
                    token = token,
                    onDashboard = {
                        navController.navigate(Routes.Dashboard) {
                            popUpTo(Routes.Root) { inclusive = true }
                        }
                    },
                )
            }

            /* ---------------------------------------------------------- */
/* Protected: app                                                       */
/* ---------------------------------------------------------- */
            composable(Routes.Dashboard) {
                requireSignedIn(session, navController) {
                    AppTabScreen(selectedTab = 0, navController = navController) {
                        DashboardScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.Contributions) {
                requireSignedIn(session, navController) {
                    AppTabScreen(selectedTab = 1, navController = navController) {
                        ContributionsScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(
                Routes.ContributionPay,
                arguments = listOf(navArgument("id") { nullable = true }),
            ) {
                requireSignedIn(session, navController) {
                    val id = currentBackStackEntryAsState()?.arguments?.getString("id")
                    AppTabScreen(selectedTab = 0, navController = navController) {
                        ContributionPayScreen(contributionId = id ?: "", viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.Verification) {
                requireSignedIn(session, navController) {
                    AppTabScreen(selectedTab = 2, navController = navController) {
                        VerificationScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.History) {
                requireSignedIn(session, navController) {
                    AppTabScreen(selectedTab = 3, navController = navController) {
                        HistoryScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.Profile) {
                requireSignedIn(session, navController) {
                    AppTabScreen(selectedTab = 4, navController = navController) {
                        val user = (session as? SessionState.SignedIn)?.user
                            ?: placeholderUser
                        ProfileScreen(viewModel = hiltViewModel(), user = user)
                    }
                }
            }
            composable(Routes.Notifications) {
                requireSignedIn(session, navController) {
                    AppTabScreen(selectedTab = 3, navController = navController) {
                        NotificationsScreen(viewModel = hiltViewModel())
                    }
                }
            }

            /* ---------------------------------------------------------- */
/* Protected: admin                                                     */
/* ---------------------------------------------------------- */
            composable(Routes.Admin) {
                requireAdmin(session, isAdmin, navController) {
                    AdminShell(navController = navController) {
                        AdminStatsScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.AdminUsers) {
                requireAdmin(session, isAdmin, navController) {
                    AdminShell(navController = navController) {
                        AdminUsersScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.AdminVerifications) {
                requireAdmin(session, isAdmin, navController) {
                    AdminShell(navController = navController) {
                        AdminKycScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(
                Routes.AdminVerificationDetail,
                arguments = listOf(navArgument("id") { nullable = true }),
            ) {
                requireAdmin(session, isAdmin, navController) {
                    val id = currentBackStackEntryAsState()?.arguments?.getString("id") ?: ""
                    AdminShell(navController = navController) {
                        AdminKycDetailScreen(verificationId = id, viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.AdminPayments) {
                requireAdmin(session, isAdmin, navController) {
                    AdminShell(navController = navController) {
                        AdminPaymentsScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.AdminEmails) {
                requireAdmin(session, isAdmin, navController) {
                    AdminShell(navController = navController) {
                        AdminEmailsScreen(viewModel = hiltViewModel())
                    }
                }
            }
            composable(Routes.AdminAudit) {
                requireAdmin(session, isAdmin, navController) {
                    AdminShell(navController = navController) {
                        AdminAuditScreen(viewModel = hiltViewModel())
                    }
                }
            }
        }
    }
}

/** Shows content only when signed in; otherwise routes to login. */
@Composable
private fun requireSignedIn(
    session: SessionState,
    navController: NavHostController,
    content: @Composable () -> Unit,
) {
    when (session) {
        is SessionState.Loading -> {
            androidx.compose.material3.Surface(modifier = fillMaxSize()) {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = androidx.compose.ui.Modifier.align(androidx.compose.ui.Alignment.Center)
                )
            }
        }
        is SessionState.SignedOut -> {
            LaunchedEffect(Unit) {
                navController.navigate(Routes.Login) {
                    popUpTo(Routes.Root) { inclusive = true }
                }
            }
            androidx.compose.material3.Surface(modifier = fillMaxSize()) {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = androidx.compose.ui.Modifier.align(androidx.compose.ui.Alignment.Center)
                )
            }
        }
        is SessionState.SignedIn -> content()
    }
}

/** Shows content only when signed in as admin; otherwise routes to dashboard. */
@Composable
private fun requireAdmin(
    session: SessionState,
    admin: Boolean,
    navController: NavHostController,
    content: @Composable () -> Unit,
) {
    when (session) {
        is SessionState.Loading -> {
            androidx.compose.material3.Surface(modifier = fillMaxSize()) {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = androidx.compose.ui.Modifier.align(androidx.compose.ui.Alignment.Center)
                )
            }
        }
        is SessionState.SignedOut -> {
            LaunchedEffect(Unit) {
                navController.navigate(Routes.Login) {
                    popUpTo(Routes.Root) { inclusive = true }
                }
            }
            androidx.compose.material3.Surface(modifier = fillMaxSize()) {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = androidx.compose.ui.Modifier.align(androidx.compose.ui.Alignment.Center)
                )
            }
        }
        is SessionState.SignedIn -> {
            if (!admin) {
                LaunchedEffect(Unit) {
                    navController.navigate(Routes.Dashboard) { singleTop = true }
                }
                androidx.compose.material3.Surface(modifier = fillMaxSize()) {
                    androidx.compose.material3.Text(
                        text = "Admin access required.",
                        modifier = androidx.compose.ui.Modifier.align(androidx.compose.ui.Alignment.Center),
                        style = androidx.compose.material3.MaterialTheme.typography.bodyLarge,
                    )
                }
            } else {
                content()
            }
        }
    }
}

/** Placeholder user for the profile screen until profile data is threaded through. */
private val placeholderUser = com.akawo.app.data.model.User(
    id = "",
    name = "User",
    email = "",
    phone = null,
    emailVerified = false,
    isVerified = false,
    role = "user",
    status = "active",
    createdAt = "",
    lastLoginAt = null,
)
