export const MAX_PROJECT_IMAGES = 3;

export function sanitizeProjectImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of images) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    cleaned.push(trimmed);
    if (cleaned.length >= MAX_PROJECT_IMAGES) break;
  }

  return cleaned;
}

export function countValidProjectImages(images: unknown): number {
  if (!Array.isArray(images)) return 0;
  const seen = new Set<string>();
  for (const item of images) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed) seen.add(trimmed);
  }
  return seen.size;
}

export function validateProjectImageInput(images: unknown): {
  valid: boolean;
  count: number;
  max: number;
  sanitized: string[];
  error?: string;
} {
  const rawCount = countValidProjectImages(images);
  const sanitized = sanitizeProjectImages(images);
  if (rawCount > MAX_PROJECT_IMAGES) {
    return {
      valid: false,
      count: rawCount,
      max: MAX_PROJECT_IMAGES,
      sanitized,
      error: `Maximum ${MAX_PROJECT_IMAGES} images allowed per project.`,
    };
  }

  return {
    valid: true,
    count: sanitized.length,
    max: MAX_PROJECT_IMAGES,
    sanitized,
  };
}
