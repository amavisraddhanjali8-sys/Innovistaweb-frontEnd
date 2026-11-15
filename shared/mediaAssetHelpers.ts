export type MediaAssetKind = "IMAGE" | "VIDEO" | "DOCUMENT";
export type MediaSourceType = "UPLOAD" | "EXTERNAL_URL" | "PRESET";

export interface MediaAssetPayload {
  kind: MediaAssetKind;
  sourceType: MediaSourceType;
  title: string;
  originalName: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSizeBytes: number | null;
  altText: string;
  entityScope: string;
}

export function inferMediaKindFromUrlOrMime(url: string, mimeType = ""): MediaAssetKind {
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.includes("pdf") || mime.includes("cad") || mime.includes("octet-stream")) {
    return "DOCUMENT";
  }

  const clean = (url || "").split("?")[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg|ogv)$/.test(clean)) return "VIDEO";
  if (/\.(pdf|dwg|dxf|doc|docx|xls|xlsx|zip)$/.test(clean)) return "DOCUMENT";
  return "IMAGE";
}

export function inferSourceTypeFromUrl(url: string): MediaSourceType {
  const trimmed = (url || "").trim();
  if (trimmed.startsWith("/uploads/")) return "UPLOAD";
  if (/^https?:\/\//i.test(trimmed)) return "EXTERNAL_URL";
  return "PRESET";
}

export function isValidMediaPublicUrl(url: string): boolean {
  const trimmed = (url || "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("/assets/")) return true;
  if (trimmed.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeMediaAssetInput(raw: {
  publicUrl?: string;
  url?: string;
  kind?: string;
  sourceType?: string;
  title?: string;
  originalName?: string;
  storageKey?: string;
  mimeType?: string;
  fileSizeBytes?: number | null;
  altText?: string;
  entityScope?: string;
}): { valid: true; data: MediaAssetPayload } | { valid: false; error: string } {
  const publicUrl = String(raw.publicUrl ?? raw.url ?? "").trim();
  if (!isValidMediaPublicUrl(publicUrl)) {
    return {
      valid: false,
      error: "Provide a valid uploaded file path (/uploads/...) or http(s) media URL.",
    };
  }

  const mimeType = String(raw.mimeType || "").trim();
  const inferredKind = inferMediaKindFromUrlOrMime(publicUrl, mimeType);
  const rawKind = String(raw.kind || "").toUpperCase();
  const kind: MediaAssetKind =
    rawKind === "IMAGE" || rawKind === "VIDEO" || rawKind === "DOCUMENT"
      ? rawKind
      : inferredKind;

  const rawSource = String(raw.sourceType || "").toUpperCase();
  const sourceType: MediaSourceType =
    rawSource === "UPLOAD" || rawSource === "EXTERNAL_URL" || rawSource === "PRESET"
      ? rawSource
      : inferSourceTypeFromUrl(publicUrl);

  const rawName = String(raw.originalName || raw.title || "").trim();
  const derivedName = rawName || publicUrl.split("/").pop()?.split("?")[0] || "media-asset";

  return {
    valid: true,
    data: {
      kind,
      sourceType,
      title: String(raw.title || derivedName).trim(),
      originalName: derivedName,
      storageKey: String(
        raw.storageKey || (sourceType === "UPLOAD" ? publicUrl.replace(/^\/+/, "") : "")
      ).trim(),
      publicUrl,
      mimeType,
      fileSizeBytes:
        typeof raw.fileSizeBytes === "number" && Number.isFinite(raw.fileSizeBytes)
          ? Math.max(0, Math.round(raw.fileSizeBytes))
          : null,
      altText: String(raw.altText || raw.title || derivedName).trim(),
      entityScope: String(raw.entityScope || "general").trim() || "general",
    },
  };
}
