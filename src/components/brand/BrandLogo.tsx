import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BRAND_UPDATED_EVENT, defaultBrandSettings, getBrandSettings, type BrandLogoVariant } from "@/lib/brand";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: keyof typeof defaultBrandSettings.sizes;
  tone?: "auto" | "dark" | "light";
  responsiveHeight?: string;
  className?: string;
  imgClassName?: string;
  showTagline?: boolean;
}

const detectDarkTheme = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

const BrandLogo = ({
  variant = "wordmark",
  size = "nav",
  tone = "auto",
  responsiveHeight,
  className,
  imgClassName,
  showTagline = false,
}: BrandLogoProps) => {
  const [brand, setBrand] = useState(getBrandSettings);
  const [failed, setFailed] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(detectDarkTheme);

  useEffect(() => {
    const update = () => {
      setBrand(getBrandSettings());
      setFailed(false);
      setIsDarkTheme(detectDarkTheme());
    };
    window.addEventListener(BRAND_UPDATED_EVENT, update);
    window.addEventListener("storage", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener(BRAND_UPDATED_EVENT, update);
      window.removeEventListener("storage", update);
      observer.disconnect();
    };
  }, []);

  const height = brand.sizes[size];
  const resolvedTone = tone === "auto" ? (isDarkTheme ? "dark" : "light") : tone;
  const src = variant === "mark" ? brand.markSrc : resolvedTone === "dark" ? brand.wordmarkSrc : brand.wordmarkLightSrc;
  const logoHeight = responsiveHeight ?? height;

  return (
    <span className={cn("inline-flex items-center gap-2 min-w-0", className)} aria-label={brand.name}>
      <img
        src={failed ? brand.fallbackSvg : src}
        alt={brand.name}
        width={variant === "mark" ? height : undefined}
        height={height}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn(
          "shrink-0 object-contain drop-shadow-[0_0_14px_hsl(var(--primary)/0.18)]",
          variant === "mark" ? "aspect-square" : "max-w-full",
          imgClassName,
        )}
        style={{ height: logoHeight, maxHeight: logoHeight }}
      />
      {failed && variant === "wordmark" && (
        <strong className="font-display text-lg text-foreground">
          Study.<span className="text-primary">AI</span>
        </strong>
      )}
      {showTagline && <span className="sr-only">{brand.tagline}</span>}
    </span>
  );
};

export default BrandLogo;