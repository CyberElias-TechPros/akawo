package com.akawo.app.ui.util

import android.content.Context
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

/** Copy a content URI (camera/gallery) into a temp File so it can be multipart-uploaded. */
fun uriToFile(context: Context, uri: Uri, preferredName: String): File? {
    return try {
        val outFile = File(context.cacheDir, preferredName)
        context.contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(outFile).use { output ->
                input.copyTo(output)
            }
        }
        if (outFile.length() > 0) outFile else null
    } catch (_: Exception) {
        null
    }
}
