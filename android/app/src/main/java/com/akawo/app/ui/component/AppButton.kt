package com.akawo.app.ui.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.akawo.app.ui.theme.AkawoTheme

@Composable
fun AppButton(
    onClick: () -> Unit,
    enabled: Boolean = true,
    variant: ButtonVariant = ButtonVariant.Filled,
    label: String,
    busy: Boolean = false,
    modifier: Modifier = Modifier,
    fullWidth: Boolean = false,
) {
    val content = if (busy) {
        Row(
            modifier = Modifier.size(20.dp, 20.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CircularProgressIndicator(
                color = Color.White,
                strokeWidth = 2.dp,
            )
        }
    } else {
        Text(text = label, style = MaterialTheme.typography.labelLarge)
    }

    when (variant) {
        ButtonVariant.Filled -> {
            Button(
                onClick = { if (enabled) onClick() },
                enabled = enabled && !busy,
                modifier = modifier.then(if (fullWidth) Modifier.fillMaxWidth() else Modifier),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (enabled) MaterialTheme.colorScheme.primary else Color(0xFFC9D4CE),
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            ) { content }
        }
        ButtonVariant.Outlined -> {
            OutlinedButton(
                onClick = { if (enabled) onClick() },
                enabled = enabled && !busy,
                modifier = modifier.then(if (fullWidth) Modifier.fillMaxWidth() else Modifier),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = Color.Transparent,
                    contentColor = if (enabled) MaterialTheme.colorScheme.primary else Color(0xFFC9D4CE),
                ),
            ) { content }
        }
        ButtonVariant.Ghost -> {
            TextButton(
                onClick = { if (enabled) onClick() },
                enabled = enabled && !busy,
                modifier = modifier.then(if (fullWidth) Modifier.fillMaxWidth() else Modifier),
                colors = ButtonDefaults.textButtonColors(
                    contentColor = if (enabled) MaterialTheme.colorScheme.primary else Color(0xFFC9D4CE),
                ),
            ) { content }
        }
    }
}

enum class ButtonVariant { Filled, Outlined, Ghost }

@Composable
fun IconButton(
    onClick: () -> Unit,
    enabled: Boolean = true,
    icon: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    contentDescription: String,
) {
    IconButton(
        onClick = { if (enabled) onClick() },
        enabled = enabled,
        modifier = modifier,
        colors = IconButtonDefaults.iconButtonColors(
            contentColor = if (enabled) MaterialTheme.colorScheme.onSurfaceVariant else Color(0xFFC9D4CE),
        ),
    ) {
        icon()
    }
}
