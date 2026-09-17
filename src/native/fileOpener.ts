// FIX 2.1.1 — Apertura dei file su dispositivo, senza dipendere da un plugin nativo
// che non esiste.
//
// Il codice chiamava FainanceFileNative.openFile(), registrato con
// registerPlugin('FainanceFile'). registerPlugin restituisce sempre un proxy, quindi
// il metodo risultava presente anche quando non era implementato lato Android: la
// chiamata falliva con l'errore Capacitor "Unimplemented". Prima quell'errore veniva
// inghiottito e mostrato come "Nessuna app disponibile per aprire questo documento",
// che era falso e mandava fuori strada. Il telefono non provava nemmeno a cercare
// un'app, perche' la richiesta non gli arrivava.
//
// Qui l'apertura e' costruita su @capacitor/filesystem e
// @capacitor-community/file-opener:
//   1. il contenuto viene scritto in un file nella cache dell'app
//   2. il sistema apre direttamente il file con l'app associata al MIME type
//
// Il plugin FainanceFile viene comunque tentato per primo: se su iOS e' implementato,
// continua a funzionare come prima. Solo in caso di "Unimplemented" si passa ai
// plugin ufficiali.
//
// Gli import sono dinamici: sul web quei moduli non servono e non finiscono nel
// chunk iniziale.

function isNativeRuntime(): boolean {
  try {
    const capacitor =
      typeof window !== "undefined" ? (window as any).Capacitor : null;
    return !!(
      capacitor &&
      capacitor.isNativePlatform &&
      capacitor.isNativePlatform()
    );
  } catch (_error) {
    return false;
  }
}

function isUnimplemented(error: any): boolean {
  const code = String((error && (error.code || error.message)) || "");
  return /unimplemented|not implemented|unavailable/i.test(code);
}

/** Nome file accettabile per il filesystem Android e iOS. */
function safeFileName(name: string, fallbackExtension?: string): string {
  let clean = String(name || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) clean = "documento";
  if (clean.length > 80) clean = clean.slice(-80);
  if (fallbackExtension && clean.indexOf(".") < 0) {
    clean = clean + "." + fallbackExtension;
  }
  return clean;
}

function base64FromDataUrl(dataUrl: string): string {
  const value = String(dataUrl || "");
  const comma = value.indexOf(",");
  return comma >= 0 ? value.slice(comma + 1) : value;
}

function extensionFromMime(mimeType: string): string {
  const map: any = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/json": "json",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[String(mimeType || "").toLowerCase()] || "";
}

export interface OpenFileRequest {
  dataUrl: string;
  fileName: string;
  mimeType: string;
}

/**
 * Apre un file sul dispositivo. Solleva se nessun percorso riesce: chi chiama deve
 * mostrare un messaggio, perche' un'apertura fallita in silenzio e' indistinguibile
 * da un tocco non registrato.
 */
export async function openFileWithSystem(
  request: OpenFileRequest,
): Promise<void> {
  const fileName = safeFileName(
    request.fileName,
    extensionFromMime(request.mimeType),
  );

  if (!isNativeRuntime()) {
    // Sul web basta un link di download: il browser decide cosa farne.
    const link = document.createElement("a");
    link.href = request.dataUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // 1) Plugin proprietario, se implementato su questa piattaforma.
  try {
    const core: any = await import("@capacitor/core");
    const plugin: any = core.registerPlugin("FainanceFile");
    if (plugin && plugin.openFile) {
      await plugin.openFile({
        dataUrl: request.dataUrl,
        fileName,
        mimeType: request.mimeType,
      });
      return;
    }
  } catch (error) {
    // Un "Unimplemented" e' atteso: si prosegue con i plugin ufficiali. Qualunque
    // altro errore viene comunque ritentato per la stessa via, perche' il percorso
    // alternativo e' indipendente.
    if (!isUnimplemented(error)) {
      console.warn("FainanceFile.openFile non utilizzabile", error);
    }
  }

  // 2) Scrittura nella cache dell'app e apertura con l'app predefinita di sistema.
  // Non usare Share: Share apre il foglio di condivisione, non il viewer del file.
  const filesystem: any = await import("@capacitor/filesystem");
  const core: any = await import("@capacitor/core");
  const opener: any = core.registerPlugin("FileOpener");
  const directory = filesystem.Directory.Cache;

  await filesystem.Filesystem.writeFile({
    path: fileName,
    data: base64FromDataUrl(request.dataUrl),
    directory,
    recursive: true,
  });

  const target = await filesystem.Filesystem.getUri({
    path: fileName,
    directory,
  });
  const uri = String((target && target.uri) || "");
  if (!uri) throw new Error("file-uri-unavailable");
  if (!opener || !opener.open) {
    throw new Error("file-opener-unavailable");
  }

  await opener.open({
    filePath: uri,
    contentType: request.mimeType || undefined,
    openWithDefault: true,
  });

}

/**
 * Copia testo negli appunti. Anche qui il plugin proprietario puo' non essere
 * implementato, quindi si ricade sulle API standard.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  const value = String(text || "");
  if (!value) return;

  if (isNativeRuntime()) {
    try {
      const core: any = await import("@capacitor/core");
      const plugin: any = core.registerPlugin("FainanceFile");
      if (plugin && plugin.copyText) {
        await plugin.copyText({ text: value });
        return;
      }
    } catch (error) {
      if (!isUnimplemented(error)) {
        console.warn("FainanceFile.copyText non utilizzabile", error);
      }
    }
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch (_error) {}

  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.left = "-9999px";
  area.style.top = "0";
  area.setAttribute("readonly", "");
  document.body.appendChild(area);
  area.focus();
  area.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(area);
  if (!copied) throw new Error("copy-failed");
}
