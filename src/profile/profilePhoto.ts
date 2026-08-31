function profilePhotoExtension(file: File): string {
  const name = String((file as any)?.name || "").toLowerCase();
  const match = name.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function profilePhotoLooksLikeImage(file: File): boolean {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return ["jpg", "jpeg", "png", "webp", "gif", "bmp", "jfif", "avif", "heic", "heif"].includes(profilePhotoExtension(file));
}

async function fileToDataUrl(file: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("PROFILE_PHOTO_READ_ERROR"));
    reader.readAsDataURL(file);
  });
}

async function decodeProfileImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  const bitmapFactory = (globalThis as any).createImageBitmap;
  if (typeof bitmapFactory === "function") {
    try {
      const bitmap = await bitmapFactory(file, { imageOrientation: "from-image" } as any);
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => { try { bitmap.close?.(); } catch {} } };
      }
    } catch {
      // Browser decoder fallback below.
    }
  }

  const dataUrl = await fileToDataUrl(file);
  const img = document.createElement("img");
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("PROFILE_PHOTO_DECODE_ERROR"));
    img.src = dataUrl;
  });
  const width = Number(img.naturalWidth || img.width || 0);
  const height = Number(img.naturalHeight || img.height || 0);
  if (!width || !height) throw new Error("PROFILE_PHOTO_DECODE_ERROR");
  return { source: img, width, height };
}

function canvasDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  // JPEG is deliberately used for maximum WebView/browser compatibility.
  return canvas.toDataURL("image/jpeg", quality);
}

export async function resizeProfilePhoto(file: File, maxSide = 256, quality = 0.76): Promise<string> {
  if (!file || !profilePhotoLooksLikeImage(file)) throw new Error("PROFILE_PHOTO_INVALID");
  if (Number(file.size || 0) > 15 * 1024 * 1024) throw new Error("PROFILE_PHOTO_TOO_LARGE");
  if (typeof document === "undefined") throw new Error("PROFILE_PHOTO_BROWSER_REQUIRED");

  let decoded: Awaited<ReturnType<typeof decodeProfileImage>> | null = null;
  try {
    decoded = await decodeProfileImage(file);
    const sourceWidth = decoded.width;
    const sourceHeight = decoded.height;
    const side = Math.max(1, Math.min(sourceWidth, sourceHeight));
    const sx = Math.max(0, (sourceWidth - side) / 2);
    const sy = Math.max(0, (sourceHeight - side) / 2);
    const outSide = Math.max(64, Math.min(Number(maxSide || 256), side));

    const canvas = document.createElement("canvas");
    canvas.width = outSide;
    canvas.height = outSide;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("PROFILE_PHOTO_CANVAS_ERROR");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, outSide, outSide);
    ctx.drawImage(decoded.source, sx, sy, side, side, 0, 0, outSide, outSide);

    let q = Math.max(0.45, Math.min(0.88, Number(quality || 0.76)));
    let data = canvasDataUrl(canvas, q);
    // Keep the Firestore profile document compact. ~130k characters is safely below document limits.
    while (data.length > 130000 && q > 0.48) {
      q = Math.max(0.48, q - 0.08);
      data = canvasDataUrl(canvas, q);
    }
    if (!data || data.indexOf("data:image/") !== 0) throw new Error("PROFILE_PHOTO_ENCODE_ERROR");
    if (data.length > 190000) throw new Error("PROFILE_PHOTO_RESULT_TOO_LARGE");
    return data;
  } catch (error: any) {
    const ext = profilePhotoExtension(file);
    if (ext === "heic" || ext === "heif" || /heic|heif/i.test(String(file.type || ""))) {
      throw new Error("PROFILE_PHOTO_HEIC_UNSUPPORTED");
    }
    throw error;
  } finally {
    try { decoded?.close?.(); } catch {}
  }
}
