package com.akawo.app.ui.component

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.akawo.app.ui.theme.AkawoTheme

@Composable
fun AppTextField(
    label: String,
    hint: String? = null,
    value: String,
    onValueChange: (String) -> Unit,
    error: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    singleLine: Boolean = true,
    maxLines: Int = 1,
) {
    var showPassword by remember { mutableStateOf(!password) }
    val visualTransformation = if (password && showPassword) VisualTransformation.None else VisualTransformation.Password

    TextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(text = label) },
        placeholder = { hint?.let { Text(text = it) } },
        supportingText = { error?.let { Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) } },
        textStyle = MaterialTheme.typography.bodyLarge,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled,
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
            imeAction = if (singleLine) androidx.compose.ui.text.input.ImeAction.Done else null,
        ),
        visualTransformation = visualTransformation,
        singleLine = singleLine,
        maxLines = maxLines,
        colors = TextFieldDefaults.textFieldColors(
            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            disabledContainerColor = Color(0xFFE4E9E6),
            cursorColor = MaterialTheme.colorScheme.primary,
        ),
        leadingIcon = if (password) {
            IconButton(
                onClick = { showPassword = !showPassword },
                icon = {
                    val iconRes = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility
                    androidx.compose.material3.Icon(imageVector = iconRes, contentDescription = null)
                },
                contentDescription = if (showPassword) "Hide password" else "Show password",
            )
        } else null,
    )
}
