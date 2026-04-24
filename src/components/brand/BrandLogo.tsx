import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BRAND_UPDATED_EVENT, defaultBrandSettings, getBrandSettings, type BrandLogoVariant } from "@/lib/brand";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: keyof typeof defaultBrandSettings.sizes;
  className?: string;
  imgClassName?: string;
  showTagline?: boolean;
}

const BrandLogo = ({ variant = "wordmark", size = "nav", className, imgClassName, showTagline = false }: BrandLogoProps) => {
  const [brand, setBrand] = useState(getBrandSettings);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const update = () => {
      setBrand(getBrandSettings());
      setFailed(false);
    };
    window.addEventListener(BRAND_UPDATED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(BRAND_UPDATED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const height = brand.sizes[size];
  const src = variant === "mark" ? brand.markSrc : brand.wordmarkSrc;

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
        style={{ height, maxHeight: height }}
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