package com.akawo.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.combine
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.unit.dp
import com.akawo.app.R

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFC9A227), // akawo gold
    secondary = Color(0xFFC9A227),
    surface = Color(0xFF0E1912),
    background = Color(0xFF0B140D),
    onPrimary = Color(0xFF0B140D),
    onSecondary = Color(0xFF0B140D),
    onSurface = Color(0xFFFFFFFF),
    onBackground = Color(0xFFFFFFFF),
    error = Color(0xFFB3261E),
    surfaceVariant = Color(0xFF15251C),
    outline = Color(0xFF3A4E42),
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFFC9A227),
    secondary = Color(0xFFC9A227),
    surface = Color(0xFFFFFFFF),
    background = Color(0xFFF5F7F6),
    onPrimary = Color(0xFF0B140D),
    onSecondary = Color(0xFF0B140D),
    onSurface = Color(0xFF111A15),
    onBackground = Color(0xFF111A15),
    error = Color(0xFFB3261E),
    surfaceVariant = Color(0xFFE4E9E6),
    outline = Color(0xFFC9D4CE),
)

@Composable
fun AkawoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val context = LocalContext.current
    SideEffect {
        // Dynamic colour on Android 12+ would go here; we keep a fixed brand palette.
    }
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content,
    )
}

val Typography = Typography(
    displayLarge = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold, fontSize = 32.sp),
    displayMedium = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold, fontSize = 28.sp),
    headlineLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 18.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    bodyLarge = TextStyle(fontSize = 16.sp),
    bodyMedium = TextStyle(fontSize = 14.sp),
    bodySmall = TextStyle(fontSize = 12.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.Medium, fontSize = 14.sp),
)

val Shapes = Shapes(
    small = 8.dp,
    medium = 12.dp,
    large = 16.dp,
)
