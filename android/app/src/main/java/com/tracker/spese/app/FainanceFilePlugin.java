package com.tracker.spese.app;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "FainanceFile")
public class FainanceFilePlugin extends Plugin {
    @PluginMethod
    public void openFile(PluginCall call) {
        String dataUrl = call.getString("dataUrl", "");
        String requestedName = call.getString("fileName", "documento");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (dataUrl == null || !dataUrl.startsWith("data:") || !dataUrl.contains(",")) {
            call.reject("Documento non valido.");
            return;
        }

        try {
            int comma = dataUrl.indexOf(',');
            String header = dataUrl.substring(0, comma);
            String content = dataUrl.substring(comma + 1);
            byte[] bytes;
            if (header.contains(";base64")) {
                bytes = Base64.decode(content, Base64.DEFAULT);
            } else {
                bytes = Uri.decode(content).getBytes(StandardCharsets.UTF_8);
            }

            String safeName = sanitizeFileName(requestedName);
            File directory = new File(getContext().getCacheDir(), "opened_documents");
            if (!directory.exists() && !directory.mkdirs()) {
                call.reject("Non riesco a preparare il documento.");
                return;
            }
            File file = new File(directory, safeName);
            try (FileOutputStream output = new FileOutputStream(file, false)) {
                output.write(bytes);
                output.flush();
            }

            Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mimeType == null || mimeType.isEmpty() ? "application/octet-stream" : mimeType);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

            try {
                getActivity().startActivity(intent);
            } catch (ActivityNotFoundException firstError) {
                Intent fallback = new Intent(Intent.ACTION_VIEW);
                fallback.setDataAndType(uri, "*/*");
                fallback.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    getActivity().startActivity(fallback);
                } catch (ActivityNotFoundException secondError) {
                    call.reject("Nessuna app disponibile per aprire questo documento.");
                    return;
                }
            }

            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Non riesco ad aprire il documento.", error);
        }
    }


    @PluginMethod
    public void copyText(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.isEmpty()) {
            call.reject("Contenuto vuoto.");
            return;
        }
        try {
            ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null) {
                call.reject("Appunti di sistema non disponibili.");
                return;
            }
            clipboard.setPrimaryClip(ClipData.newPlainText("fAInance", text));
            JSObject result = new JSObject();
            result.put("copied", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Non riesco a copiare il contenuto.", error);
        }
    }

    private String sanitizeFileName(String value) {
        String name = value == null ? "documento" : value.trim();
        if (name.isEmpty()) name = "documento";
        name = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        if (name.length() > 120) name = name.substring(name.length() - 120);
        return name;
    }
}
