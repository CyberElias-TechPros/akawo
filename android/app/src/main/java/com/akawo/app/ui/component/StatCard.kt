package com.akawo.app.ui.component

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.akawo.app.ui.theme.AkawoTheme
import com.akawo.app.ui.util.formatNgnCompact

@Composable
fun StatCard(
    label: String,
    value: String,
    sub: String? = null,
    tone: StatTone = StatTone.Default,
    modifier: Modifier = Modifier,
) {
    val accent = when (tone) {
        StatTone.Gold -> Color(0xFFC9A227)
        StatTone.Forest -> Color(0xFF1B6B3C)
        StatTone.Bad -> Color(0xFFB3261E)
        StatTone.Default -> MaterialTheme.colorScheme.primary
    }
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = MaterialTheme.shapes.medium,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = androidx.compose.ui.text.FontWeight.Bold,
                    color = accent,
                ),
            )
            sub?.let {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

enum class StatTone { Default, Gold, Forest, Bad }
