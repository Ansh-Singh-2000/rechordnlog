import imageCompression from "browser-image-compression";

export interface CompressedImageResult {
  file: File;
  width: number;
  height: number;
  fileSizeKB: number;
  originalSizeKB: number;
  mimeType: string;
  originalFileTimestamp: string | null;
  device: string;
}

export function detectDeviceString(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;

  let os = "Unknown OS";
  if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = "Safari";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Edg/i.test(ua)) browser = "Edge";

  return `${os} / ${browser}`;
}

export function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

function supportsWebP(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * Compresses an image client-side before upload to minimize Vercel Blob free-tier storage.
 * Targets max 1600px on the longest side, WebP (or JPEG fallback) at 0.80 quality, ~200-350KB.
 */
export async function compressImageForUpload(
  inputFile: File
): Promise<CompressedImageResult> {
  const originalSizeKB = Math.max(1, Math.round(inputFile.size / 1024));
  const originalFileTimestamp = inputFile.lastModified
    ? new Date(inputFile.lastModified).toISOString()
    : null;

  const targetMime = supportsWebP() ? "image/webp" : "image/jpeg";
  const targetExt = targetMime === "image/webp" ? "webp" : "jpg";

  let compressedBlob: Blob = inputFile;
  try {
    compressedBlob = await imageCompression(inputFile, {
      maxSizeMB: 0.35,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      initialQuality: 0.8,
      fileType: targetMime,
      preserveExif: false,
    });
  } catch {
    // Fallback without web worker if CSP/browser blocks worker
    try {
      compressedBlob = await imageCompression(inputFile, {
        maxSizeMB: 0.35,
        maxWidthOrHeight: 1600,
        useWebWorker: false,
        initialQuality: 0.8,
        fileType: targetMime,
        preserveExif: false,
      });
    } catch {
      compressedBlob = inputFile;
    }
  }

  const baseName = inputFile.name.replace(/\.[^/.]+$/, "") || "capture";
  const finalMime = compressedBlob.type || targetMime;
  const finalFile = new File([compressedBlob], `${baseName}.${targetExt}`, {
    type: finalMime,
    lastModified: inputFile.lastModified || Date.now(),
  });

  const { width, height } = await getImageDimensions(finalFile);
  const fileSizeKB = Math.max(1, Math.round(finalFile.size / 1024));

  return {
    file: finalFile,
    width,
    height,
    fileSizeKB,
    originalSizeKB,
    mimeType: finalMime,
    originalFileTimestamp,
    device: detectDeviceString(),
  };
}

export function formatLocalDateParts(date: Date): {
  localDate: string;
  localTime: string;
  timezone: string;
  isoTimestamp: string;
} {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return {
    localDate: `${year}-${month}-${day}`,
    localTime: `${hours}:${minutes}:${seconds}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    isoTimestamp: date.toISOString(),
  };
}
