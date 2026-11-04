package com.akawo.app.ui.component

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.akawo.app.ui.theme.AkawoTheme

@Composable
fun AppBadge(
    text: String,
    tone: BadgeTone = BadgeTone.Default,
    modifier: Modifier = Modifier,
) {
    val (container, content) = when (tone) {
        BadgeTone.Ok -> Pair(Color(0xFF1B6B3C), Color.White)
        BadgeTone.Bad -> Pair(Color(0xFFB3261E), Color.White)
        BadgeTone.Warn -> Pair(Color(0xFFB45309), Color.White)
        BadgeTone.Gold -> Pair(Color(0xFFFDF3DC), Color(0xFF4A3A00))
        BadgeTone.Default -> Pair(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurface)
    }
    Badge(
        modifier = modifier,
        containerColor = container,
        contentColor = content,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = androidx.compose.ui.text.FontWeight.Bold),
        )
    }
}

enum class BadgeTone { Ok, Bad, Warn, Gold, Default }
