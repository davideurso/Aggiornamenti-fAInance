package com.tracker.spese.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

@CapacitorPlugin(name = "FainanceDrivePicker")
public class FainanceDrivePickerPlugin extends Plugin {

    private static final String MIME_GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
    private static final String MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final String MIME_XLS = "application/vnd.ms-excel";
    private static final String MIME_CSV = "text/csv";
    private static final String MIME_TSV = "text/tab-separated-values";
    private static final String MIME_HTML = "text/html";
    private static final String MIME_PDF = "application/pdf";

    private static class ExportResult {
        byte[] bytes;
        String mime;
        ExportResult(byte[] bytes, String mime) {
            this.bytes = bytes;
            this.mime = mime;
        }
    }

    @PluginMethod
    public void pickSpreadsheet(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);

        // Non usare CATEGORY_OPENABLE e non applicare filtri MIME rigidi:
        // i Fogli Google nativi sono documenti virtuali e Drive li disabilita/opacizza
        // quando il picker richiede solo file apribili direttamente.
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "pickSpreadsheetResult");
    }

    @ActivityCallback
    private void pickSpreadsheetResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }

        Uri uri = result.getData().getData();
        ContentResolver resolver = getContext().getContentResolver();
        try {
            try {
                resolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {}

            String originalMime = resolver.getType(uri);
            String exportMime = "";
            byte[] bytes;
            String name = getDisplayName(uri);
            if (name == null || name.trim().length() == 0) name = "file";

            boolean virtualDocument = isVirtualDocument(uri);
            boolean nativeGoogleSheet = MIME_GOOGLE_SHEET.equals(originalMime) || virtualDocument || hasSpreadsheetExportType(resolver, uri);
            String authority = uri.getAuthority();
            String extraDiag = " [provider=" + authority + " virtual=" + virtualDocument + " flags=" + getDocumentFlags(uri) + " origMime=" + originalMime + "]";
            if (originalMime != null && originalMime.toLowerCase().contains("shortcut")) {
                throw new Exception("Hai selezionato una scorciatoia Drive (collegamento), non il Foglio Google vero e proprio. Apri Drive, vai al file originale (non a un collegamento/stella) e selezionalo da lì." + extraDiag);
            }

            if (nativeGoogleSheet) {
                ExportResult exported;
                try {
                    exported = readVirtualSpreadsheetDocument(resolver, uri);
                } catch (Exception exportFailed) {
                    throw new Exception(exportFailed.getMessage() + extraDiag);
                }
                bytes = exported.bytes;
                exportMime = exported.mime == null ? "" : exported.mime;
                name = withExtensionForMime(name, exportMime, bytes);
            } else {
                try {
                    bytes = readNormalDocument(resolver, uri);
                } catch (Exception normalReadFailed) {
                    // Alcuni documenti virtuali (es. Fogli Google) non vengono rilevati come tali
                    // (getType/flag non affidabili su certe versioni di Drive) e openInputStream
                    // fallisce con FileNotFoundException. In questo caso ritentiamo come export.
                    ExportResult exported;
                    try {
                        exported = readVirtualSpreadsheetDocument(resolver, uri);
                    } catch (Exception exportFailed) {
                        throw new Exception(exportFailed.getMessage() + extraDiag);
                    }
                    bytes = exported.bytes;
                    exportMime = exported.mime == null ? "" : exported.mime;
                    name = withExtensionForMime(name, exportMime, bytes);
                    nativeGoogleSheet = true;
                }
            }

            if (isPdf(bytes)) {
                throw new Exception("Drive ha fornito una preview PDF e non dati tabellari");
            }

            JSObject ret = new JSObject();
            ret.put("cancelled", false);
            ret.put("name", name);
            ret.put("mimeType", originalMime == null ? "" : originalMime);
            ret.put("exportMimeType", exportMime);
            ret.put("isGoogleSheetNative", nativeGoogleSheet);
            ret.put("dataBase64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Non riesco a leggere il file selezionato da Drive: " + e.getMessage());
        }
    }

    private String withExtensionForMime(String name, String mime, byte[] bytes) {
        String lower = name.toLowerCase();
        String m = mime == null ? "" : mime.toLowerCase();
        if ((m.contains("spreadsheetml.sheet") || isZip(bytes)) && !lower.endsWith(".xlsx")) return name + ".xlsx";
        if ((m.contains("csv") || m.contains("comma-separated")) && !lower.endsWith(".csv")) return name + ".csv";
        if (m.contains("tab-separated") && !lower.endsWith(".tsv")) return name + ".tsv";
        if (m.contains("html") && !(lower.endsWith(".html") || lower.endsWith(".htm"))) return name + ".html";
        return name;
    }

    private byte[] readNormalDocument(ContentResolver resolver, Uri uri) throws Exception {
        InputStream input = resolver.openInputStream(uri);
        if (input == null) throw new Exception("stream non disponibile");
        return readAll(input);
    }

    private ExportResult readVirtualSpreadsheetDocument(ContentResolver resolver, Uri uri) throws Exception {
        List<String> candidates = buildExportCandidates(resolver, uri);
        ArrayList<String> diag = new ArrayList<>();
        boolean onlyPdf = false;
        for (String mime : candidates) {
            try {
                byte[] b = readTypedVirtualDocument(resolver, uri, mime);
                if (isPdf(b)) {
                    onlyPdf = true;
                    diag.add(mime + "=PDF(" + b.length + "b)");
                    continue;
                }
                validateExportBytes(b, mime);
                return new ExportResult(b, normalizeMimeFromBytes(mime, b));
            } catch (Exception ex) {
                diag.add(mime + "=ERR:" + ex.getMessage());
            }
        }
        String[] streamTypes = null;
        try { streamTypes = resolver.getStreamTypes(uri, "*/*"); } catch (Exception ignored) {}
        String available = streamTypes == null ? "nessuno" : joinStrings(streamTypes);
        String diagStr = " [diag: dichiarati=" + available + " | tentativi=" + joinStrings(diag.toArray(new String[0])) + "]";
        if (onlyPdf || (available.toLowerCase().contains("pdf") && !hasUsableSpreadsheetStream(streamTypes))) {
            throw new Exception("Drive espone questo Foglio Google al selettore Android solo come PDF, non come tabella importabile. Esportalo da Drive come .xlsx o .csv oppure usa un file Excel/CSV reale." + diagStr);
        }
        throw new Exception("Drive non espone un formato tabellare importabile per questo Foglio Google. Formati disponibili: " + available + diagStr);
    }

    private List<String> buildExportCandidates(ContentResolver resolver, Uri uri) {
        ArrayList<String> out = new ArrayList<>();
        HashSet<String> seen = new HashSet<>();

        String[] streamTypes = null;
        try {
            streamTypes = resolver.getStreamTypes(uri, "*/*");
        } catch (Exception ignored) {}

        // Usa prima i formati che il provider Drive dichiara davvero disponibili.
        if (streamTypes != null) {
            for (String mime : streamTypes) {
                if (isPreferredTableMime(mime)) addCandidate(out, seen, mime);
            }
            for (String mime : streamTypes) {
                if (isSupportedTableMime(mime)) addCandidate(out, seen, mime);
            }
        }

        // resolver.getStreamTypes() su molte versioni dell'app Google Drive restituisce
        // null o una lista incompleta anche quando l'export in xlsx/csv è disponibile:
        // è un comportamento noto e inconsistente del provider, non un'assenza reale del
        // formato. Per questo proviamo SEMPRE in modo esplicito xlsx e poi csv, anche se
        // non dichiarati, prima di arrenderci al tentativo generico "*/*" (che spesso
        // restituisce solo l'anteprima PDF).
        addCandidate(out, seen, MIME_XLSX);
        addCandidate(out, seen, MIME_CSV);

        // Ultimo tentativo generico: se il provider restituisce un flusso tabellare lo accettiamo,
        // se restituisce PDF viene scartato da validateExportBytes().
        addCandidate(out, seen, "*/*");
        return out;
    }

    private void addCandidate(ArrayList<String> out, HashSet<String> seen, String mime) {
        if (mime == null) return;
        String m = mime.trim();
        if (m.length() == 0) return;
        if (m.toLowerCase().contains("pdf")) return;
        if (seen.add(m.toLowerCase())) out.add(m);
    }

    private boolean isPreferredTableMime(String mime) {
        if (mime == null) return false;
        String m = mime.toLowerCase();
        if (m.contains("pdf")) return false;
        return m.contains("spreadsheetml.sheet") ||
                m.contains("csv") ||
                m.contains("comma-separated") ||
                m.contains("tab-separated") ||
                m.equals("text/plain") ||
                m.contains("html");
    }

    private boolean isSupportedTableMime(String mime) {
        if (mime == null) return false;
        String m = mime.toLowerCase();
        if (m.contains("pdf")) return false;
        return m.contains("spreadsheetml.sheet") ||
                m.contains("vnd.ms-excel") ||
                m.contains("csv") ||
                m.contains("comma-separated") ||
                m.contains("tab-separated") ||
                m.equals("text/plain") ||
                m.contains("html");
    }

    private boolean hasSpreadsheetExportType(ContentResolver resolver, Uri uri) {
        String[] streamTypes = null;
        try {
            streamTypes = resolver.getStreamTypes(uri, "*/*");
        } catch (Exception ignored) {}
        if (streamTypes == null) return false;
        for (String mime : streamTypes) {
            if (isSupportedTableMime(mime)) return true;
        }
        return false;
    }

    private boolean hasUsableSpreadsheetStream(String[] streamTypes) {
        if (streamTypes == null) return false;
        for (String mime : streamTypes) {
            if (isSupportedTableMime(mime)) return true;
        }
        return false;
    }

    private String joinStrings(String[] values) {
        if (values == null || values.length == 0) return "nessuno";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < values.length; i++) {
            if (i > 0) b.append(", ");
            b.append(values[i]);
        }
        return b.toString();
    }

    private byte[] readTypedVirtualDocument(ContentResolver resolver, Uri uri, String exportMime) throws Exception {
        AssetFileDescriptor afd = resolver.openTypedAssetFileDescriptor(uri, exportMime, null);
        if (afd == null) throw new Exception("export non disponibile per " + exportMime);
        InputStream input = afd.createInputStream();
        if (input == null) throw new Exception("stream export non disponibile");
        try {
            return readAll(input);
        } finally {
            try { afd.close(); } catch (Exception ignored) {}
        }
    }

    private void validateExportBytes(byte[] bytes, String requestedMime) throws Exception {
        if (bytes == null || bytes.length == 0) throw new Exception("export vuoto per " + requestedMime);
        if (isPdf(bytes)) throw new Exception("export PDF non utilizzabile per " + requestedMime);
        String m = requestedMime == null ? "" : requestedMime.toLowerCase();
        if (m.contains("spreadsheetml.sheet") && !isZip(bytes)) {
            throw new Exception("export Excel non valido per " + requestedMime);
        }
        if ("*/*".equals(m) && !isZip(bytes)) {
            String head = headText(bytes).trim().toLowerCase();
            boolean textTable = head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("<table") || head.indexOf(",") >= 0 || head.indexOf(";") >= 0 || head.indexOf("\t") >= 0;
            if (!textTable) throw new Exception("stream generico non tabellare");
        }
    }

    private String normalizeMimeFromBytes(String requestedMime, byte[] bytes) {
        if (isZip(bytes)) return MIME_XLSX;
        String head = headText(bytes).trim().toLowerCase();
        if (head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("<table")) return MIME_HTML;
        return requestedMime == null ? "" : requestedMime;
    }

    private String headText(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return "";
        int len = Math.min(bytes.length, 256);
        try { return new String(bytes, 0, len, "UTF-8"); } catch (Exception e) { return ""; }
    }

    private boolean isPdf(byte[] bytes) {
        return bytes != null && bytes.length >= 4 && bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46;
    }

    private boolean isZip(byte[] bytes) {
        return bytes != null && bytes.length >= 2 && bytes[0] == 0x50 && bytes[1] == 0x4B;
    }

    private byte[] readAll(InputStream input) throws Exception {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int n;
            while ((n = input.read(buffer)) >= 0) {
                out.write(buffer, 0, n);
            }
            return out.toByteArray();
        } finally {
            try { input.close(); } catch (Exception ignored) {}
        }
    }

    private String getDisplayName(Uri uri) {
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) return cursor.getString(idx);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return null;
    }

    private boolean isVirtualDocument(Uri uri) {
        if (!DocumentsContract.isDocumentUri(getContext(), uri)) return false;
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(uri, new String[]{DocumentsContract.Document.COLUMN_FLAGS}, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_FLAGS);
                int flags = idx >= 0 ? cursor.getInt(idx) : 0;
                return (flags & DocumentsContract.Document.FLAG_VIRTUAL_DOCUMENT) != 0;
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return false;
    }

    private String getDocumentFlags(Uri uri) {
        if (!DocumentsContract.isDocumentUri(getContext(), uri)) return "n/a(not-doc-uri)";
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(uri, new String[]{DocumentsContract.Document.COLUMN_FLAGS}, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_FLAGS);
                int flags = idx >= 0 ? cursor.getInt(idx) : -1;
                return String.valueOf(flags);
            }
            return "n/a(no-cursor)";
        } catch (Exception e) {
            return "err:" + e.getMessage();
        } finally {
            if (cursor != null) cursor.close();
        }
    }
}
