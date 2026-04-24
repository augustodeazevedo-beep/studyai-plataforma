export type BrandLogoVariant = "wordmark" | "mark";

export const BRAND_ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
export const BRAND_MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;
export const BRAND_OPTIMIZED_IMAGE_TYPE = "image/webp";
export const BRAND_OPTIMIZED_IMAGE_QUALITY = 0.86;

export const formatBrandFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export interface BrandLogoSettings {
  name: string;
  tagline: string;
  wordmarkSrc: string;
  wordmarkLightSrc: string;
  markSrc: string;
  fallbackSvg: string;
  sizes: {
    nav: number;
    auth: number;
    sidebar: number;
    sidebarCollapsed: number;
    footer: number;
  };
}

export const BRAND_STORAGE_KEY = "studyai:brand-kit";
export const BRAND_UPDATED_EVENT = "studyai-brand-updated";

export const defaultBrandSettings: BrandLogoSettings = {
  name: "Study.AI",
  tagline: "Inteligência Pedagógica Adaptativa",
  wordmarkSrc: "/brand/studyai-wordmark-slogan.png",
  wordmarkLightSrc: "/brand/studyai-wordmark-light.webp",
  markSrc: "/brand/studyai-mark.webp",
  fallbackSvg: "/brand/studyai-mark.svg",
  sizes: {
    nav: 46,
    auth: 48,
    sidebar: 40,
    sidebarCollapsed: 38,
    footer: 28,
  },
};

export const getBrandSettings = (): BrandLogoSettings => {
  if (typeof window === "undefined") return defaultBrandSettings;

  try {
    const stored = window.localStorage.getItem(BRAND_STORAGE_KEY);
    if (!stored) return defaultBrandSettings;
    const parsed = JSON.parse(stored) as Partial<BrandLogoSettings>;
    return {
      ...defaultBrandSettings,
      ...parsed,
      sizes: { ...defaultBrandSettings.sizes, ...parsed.sizes },
    };
  } catch {
    return defaultBrandSettings;
  }
};

export const saveBrandSettings = (settings: BrandLogoSettings) => {
  window.localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(BRAND_UPDATED_EVENT));
};

export const resetBrandSettings = () => {
  window.localStorage.removeItem(BRAND_STORAGE_KEY);
  window.dispatchEvent(new Event(BRAND_UPDATED_EVENT));
};