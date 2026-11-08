// WhatsApp-style media download: fetch the file as a blob so the browser
// saves a real copy instead of navigating to the URL. Falls back to
// opening the URL in a new tab when fetch/CORS is unavailable.

const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "application/pdf": "pdf",
};

const extFor = (mimeType) => {
  if (mimeType && EXTENSIONS[mimeType]) return EXTENSIONS[mimeType];
  const fallback = mimeType?.split("/")[1]?.split(/[;#]/)[0];
  return fallback ? fallback.replace("quicktime", "mov") : "bin";
};

const LABELS = ["image|photo", "video|video", "audio|audio"];

const labelFor = (mimeType) => {
  for (const [prefix, label] of LABELS.map((l) => l.split("|"))) {
    if (mimeType?.startsWith(prefix)) return label;
  }
  return "file";
};

export const mediaFileName = (mimeType) =>
  `zing-${labelFor(mimeType)}-${Date.now()}.${extFor(mimeType)}`;

export async function downloadMedia(url, { mimeType, filename } = {}) {
  if (!url) return;

  const name = filename || mediaFileName(mimeType);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error("downloadMedia failed, opening in a new tab:", err);
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
