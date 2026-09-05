package com.tracker.spese.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "FainanceFile")
public class FainanceFilePlugin extends Plugin {
    private static final int MAX_JSON_BACKUP_BYTES = 32 * 1024 * 1024;

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
    public void pickJson(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "application/json",
                "text/json",
                "text/plain",
                "application/octet-stream"
        });
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "pickJsonResult");
    }

    @ActivityCallback
    private void pickJsonResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK ||
                result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        Uri uri = result.getData().getData();
        ContentResolver resolver = getContext().getContentResolver();
        try {
            try {
                resolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {}

            byte[] bytes = readJsonDocument(resolver, uri);
            JSObject response = new JSObject();
            response.put("cancelled", false);
            response.put("name", displayName(resolver, uri));
            response.put("mimeType", String.valueOf(resolver.getType(uri)));
            response.put("size", bytes.length);
            response.put("dataBase64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Non riesco a leggere il backup JSON selezionato: " + error.getMessage(), error);
        }
    }

    private byte[] readJsonDocument(ContentResolver resolver, Uri uri) throws Exception {
        InputStream input = resolver.openInputStream(uri);
        if (input == null) throw new Exception("stream non disponibile");
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            int total = 0;
            while ((count = input.read(buffer)) >= 0) {
                total += count;
                if (total > MAX_JSON_BACKUP_BYTES) {
                    throw new Exception("file superiore al limite di 32 MB");
                }
                output.write(buffer, 0, count);
            }
            if (total == 0) throw new Exception("file vuoto");
            return output.toByteArray();
        } finally {
            try { input.close(); } catch (Exception ignored) {}
        }
    }

    private String displayName(ContentResolver resolver, Uri uri) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return "backup.json";
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
