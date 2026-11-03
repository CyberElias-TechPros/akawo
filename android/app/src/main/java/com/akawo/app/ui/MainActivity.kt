package com.akawo.app.ui

import android.os.Bundle
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsCompat.Type.systemBars
import androidx.core.view.WindowInsetsCompat.Type.statusBars
import androidx.hilt.navigation.compose.hiltViewModel
import com.akawo.app.ui.nav.NavGraph
import com.akawo.app.ui.theme.AkawoTheme
import com.akawo.app.ui.util.DeepLinkHolder
import com.akawo.app.ui.viewmodel.AuthViewModel
import com.akawo.app.ui.viewmodel.SplashViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val authViewModel: AuthViewModel by viewModels<AuthViewModel>()
    private val splashViewModel: SplashViewModel by hiltViewModel()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        WindowInsetsCompat.setSystemBarsColor(
            android.graphics.Color.TRANSPARENT,
            systemBars,
            statusBars,
        )

        // Seed deep-link handling for email magic links (verify / reset).
        DeepLinkHolder.intent.value = intent

        setContent {
            AkawoTheme {
                NavGraph(authViewModel = authViewModel)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        DeepLinkHolder.intent.value = intent
    }
}
