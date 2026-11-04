package com.akawo.app.ui.screen

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
import com.akawo.app.R
import com.akawo.app.ui.component.*
import com.akawo.app.ui.theme.AkawoTheme
import com.akawo.app.ui.util.*
import com.akawo.app.ui.viewmodel.AuthViewModel
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun LoginScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onRegister: () -> Unit,
    onForgot: () -> Unit,
) {
    val state by viewModel.state.collectAsState()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        Text(text = "Welcome back", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Enter your details to continue to your savings.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(24.dp))

        AppTextField(
            label = "Email address",
            hint = "e.g. chinedu@akawo.dev",
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Email,
            value = email,
            onValueChange = { email = it },
            error = null,
        )
        Spacer(modifier = Modifier.height(12.dp))
        AppTextField(
            label = "Password",
            hint = "••••••••",
            password = true,
            value = password,
            onValueChange = { password = it },
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            AppButton(onClick = onForgot, variant = ButtonVariant.Ghost, label = "Forgot password?")
        }
        Spacer(modifier = Modifier.height(20.dp))

        state.error?.let {
            AppError(message = it)
            Spacer(modifier = Modifier.height(12.dp))
        }

        AppButton(
            onClick = { viewModel.login(email, password) },
            label = if (state.resource is com.akawo.app.ui.state.Resource.Loading) "Signing in…" else "Sign in",
            fullWidth = true,
            enabled = email.isNotEmpty() && password.isNotEmpty(),
        )
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text = "New to Akawo? ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            AppButton(onClick = onRegister, variant = ButtonVariant.Ghost, label = "Create an account")
        }
    }
}

@Composable
fun RegisterScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onLogin: () -> Unit,
) {
    val state by viewModel.state.collectAsState()
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var bvn by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        Text(text = "Create your account", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "It takes about a minute. You’ll need your Bank Verification Number (BVN).",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(24.dp))

        AppTextField(label = "Full name", value = name, onValueChange = { name = it })
        Spacer(modifier = Modifier.height(12.dp))
        AppTextField(label = "Email address", hint = "e.g. chinedu@akawo.dev", keyboardType = androidx.compose.ui.text.input.KeyboardType.Email, value = email, onValueChange = { email = it })
        Spacer(modifier = Modifier.height(12.dp))
        AppTextField(
            label = "BVN",
            hint = "e.g. 22190000000",
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Number,
            value = bvn,
            onValueChange = { bvn = it.filter { it.isDigit() }.take(11) },
        )
        Spacer(modifier = Modifier.height(12.dp))
        AppTextField(label = "Password", hint = "10+ chars, upper, lower, number, symbol", password = true, value = password, onValueChange = { password = it })
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "BVN must be 11 digits.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(20.dp))

        state.error?.let {
            AppError(message = it)
            Spacer(modifier = Modifier.height(12.dp))
        }

        val formValid = name.isNotBlank() && email.isNotEmpty() && isValidBvn(bvn) && isValidPassword(password)
        AppButton(
            onClick = {
                if (formValid) viewModel.register(name.trim(), email.trim(), password, bvn.trim())
            },
            label = if (state.resource is com.akawo.app.ui.state.Resource.Loading) "Creating your account…" else "Create account",
            fullWidth = true,
            enabled = formValid,
        )
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text = "Already have an account? ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            AppButton(onClick = onLogin, variant = ButtonVariant.Ghost, label = "Sign in")
        }
    }
}

@Composable
fun ForgotPasswordScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onLogin: () -> Unit,
) {
    val state by viewModel.state.collectAsState()
    var email by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()),
    ) {
        Text(text = "Reset password", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = "We’ll send a reset link to your email.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(24.dp))

        AppTextField(label = "Email address", hint = "e.g. chinedu@akawo.dev", keyboardType = androidx.compose.ui.text.input.KeyboardType.Email, value = email, onValueChange = { email = it })
        Spacer(modifier = Modifier.height(20.dp))

        state.error?.let {
            AppError(message = it)
            Spacer(modifier = Modifier.height(12.dp))
        }

        AppButton(
            onClick = { if (isValidEmail(email)) viewModel.forgotPassword(email.trim()) },
            label = if (state.resource is com.akawo.app.ui.state.Resource.Loading) "Sending…" else "Send reset link",
            fullWidth = true,
            enabled = isValidEmail(email),
        )
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text = "Remember your password? ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            AppButton(onClick = onLogin, variant = ButtonVariant.Ghost, label = "Sign in")
        }
    }
}

@Composable
fun ResetPasswordScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    token: String? = null,
    onLogin: () -> Unit,
) {
    val state by viewModel.state.collectAsState()
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()),
    ) {
        Text(text = "Reset password", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = "Create a new password for your account.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(24.dp))

        AppTextField(label = "New password", hint = "8+ chars, letter and number", password = true, value = password, onValueChange = { password = it })
        Spacer(modifier = Modifier.height(12.dp))
        AppTextField(label = "Confirm new password", password = true, value = confirm, onValueChange = { confirm = it })
        Spacer(modifier = Modifier.height(20.dp))

        state.error?.let {
            AppError(message = it)
            Spacer(modifier = Modifier.height(12.dp))
        }

        val valid = token != null && isValidPassword(password) && password == confirm
        AppButton(
            onClick = { if (valid) viewModel.resetPassword(token!!, password) },
            label = if (state.resource is com.akawo.app.ui.state.Resource.Loading) "Resetting…" else "Reset password",
            fullWidth = true,
            enabled = valid,
        )
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text = "Remember your password? ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            AppButton(onClick = onLogin, variant = ButtonVariant.Ghost, label = "Sign in")
        }
    }
}

@Composable
fun VerifyEmailScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    token: String? = null,
    onDashboard: () -> Unit,
    navController: androidx.navigation.NavHostController = androidx.navigation.compose.LocalNavController.current,
) {
    val state by viewModel.state.collectAsState()

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = "Verify email", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = token?.let { "A verification link was opened for your account." } ?: "Check your inbox for the verification link.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(24.dp))

        state.error?.let {
            AppError(message = it)
            Spacer(modifier = Modifier.height(12.dp))
        }

        AppButton(
            onClick = {
                token?.let { viewModel.verifyEmail(it) }
                onDashboard()
            },
            label = if (state.resource is com.akawo.app.ui.state.Resource.Loading) "Verifying…" else "Continue to dashboard",
            fullWidth = true,
        )
    }
}

