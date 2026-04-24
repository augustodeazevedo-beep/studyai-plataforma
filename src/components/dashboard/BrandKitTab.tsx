import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/brand/BrandLogo";
import {
  BRAND_ALLOWED_IMAGE_TYPES,
  BRAND_MAX_UPLOAD_SIZE_BYTES,
  BRAND_OPTIMIZED_IMAGE_QUALITY,
  BRAND_OPTIMIZED_IMAGE_TYPE,
  defaultBrandSettings,
  formatBrandFileSize,
  getBrandSettings,
  resetBrandSettings,
  saveBrandSettings,
  type BrandLogoSettings,
} from "@/lib/brand";
import { Palette, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const optimizeRasterImage = (file: File, maxWidth: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Não foi possível otimizar a imagem."));
        return;
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(BRAND_OPTIMIZED_IMAGE_TYPE, BRAND_OPTIMIZED_IMAGE_QUALITY));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Arquivo de imagem inválido."));
    };
    image.src = objectUrl;
  });

const sanitizeSvg = async (file: File): Promise<string> => {
  const svg = await file.text();
  if (/<script|on\w+=|javascript:/i.test(svg)) {
    throw new Error("SVG recusado por conter conteúdo potencialmente inseguro.");
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const BrandKitTab = () => {
  const [brand, setBrand] = useState<BrandLogoSettings>(getBrandSettings);
  const { toast } = useToast();

  useEffect(() => setBrand(getBrandSettings()), []);

  const updateSize = (key: keyof BrandLogoSettings["sizes"], value: string) => {
    const size = Math.max(20, Math.min(96, Number(value) || defaultBrandSettings.sizes[key]));
    setBrand((current) => ({ ...current, sizes: { ...current.sizes, [key]: size } }));
  };

  const updateFile = async (key: "wordmarkSrc" | "markSrc", file?: File) => {
    if (!file) return;
    if (!BRAND_ALLOWED_IMAGE_TYPES.includes(file.type as (typeof BRAND_ALLOWED_IMAGE_TYPES)[number])) {
      toast({ title: "Formato não suportado", description: "Use PNG, JPG, WebP ou SVG." });
      return;
    }
    if (file.size > BRAND_MAX_UPLOAD_SIZE_BYTES) {
      toast({ title: "Arquivo muito grande", description: `O limite é ${formatBrandFileSize(BRAND_MAX_UPLOAD_SIZE_BYTES)}.` });
      return;
    }

    try {
      const optimizedSrc = file.type === "image/svg+xml" ? await sanitizeSvg(file) : await optimizeRasterImage(file, key === "wordmarkSrc" ? 960 : 512);
      setBrand((current) => ({ ...current, [key]: optimizedSrc }));
      toast({ title: "Logo otimizado", description: file.type === "image/svg+xml" ? "SVG validado e salvo." : "Imagem convertida para WebP otimizado." });
    } catch (error) {
      toast({ title: "Não foi possível processar", description: error instanceof Error ? error.message : "Tente outro arquivo." });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold flex items-center gap-2">
        <Palette className="h-5 w-5 text-primary" /> Brand Kit
      </h2>

      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Identidade da plataforma</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Nome da marca</Label><Input value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Assinatura curta</Label><Input value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} /></div>
          <div className="space-y-2"><Label>Logo horizontal</Label><Input type="file" accept={BRAND_ALLOWED_IMAGE_TYPES.join(",")} onChange={(e) => updateFile("wordmarkSrc", e.target.files?.[0])} /><p className="text-xs text-muted-foreground">PNG, JPG, WebP ou SVG até {formatBrandFileSize(BRAND_MAX_UPLOAD_SIZE_BYTES)}. Raster vira WebP otimizado.</p></div>
          <div className="space-y-2"><Label>Símbolo / botão</Label><Input type="file" accept={BRAND_ALLOWED_IMAGE_TYPES.join(",")} onChange={(e) => updateFile("markSrc", e.target.files?.[0])} /><p className="text-xs text-muted-foreground">PNG, JPG, WebP ou SVG até {formatBrandFileSize(BRAND_MAX_UPLOAD_SIZE_BYTES)}. Raster vira WebP otimizado.</p></div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Tamanhos responsivos</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(brand.sizes).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label className="capitalize">{key.replace("sidebarCollapsed", "sidebar mini")}</Label>
              <Input type="number" min={20} max={96} value={value} onChange={(e) => updateSize(key as keyof BrandLogoSettings["sizes"], e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Pré-visualização</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-4"><BrandLogo variant="wordmark" size="nav" /></div>
          <div className="rounded-lg border border-border bg-sidebar p-4"><BrandLogo variant="mark" size="sidebarCollapsed" /></div>
          <div className="rounded-lg border border-border bg-muted p-4"><BrandLogo variant="wordmark" size="footer" /></div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="glow flex-1" onClick={() => { saveBrandSettings(brand); toast({ title: "Brand Kit salvo" }); }}><Save className="h-4 w-4 mr-2" />Salvar Brand Kit</Button>
        <Button variant="outline" className="flex-1" onClick={() => { resetBrandSettings(); setBrand(defaultBrandSettings); toast({ title: "Brand Kit restaurado" }); }}><RotateCcw className="h-4 w-4 mr-2" />Restaurar padrão</Button>
      </div>
    </div>
  );
};

export default BrandKitTab;