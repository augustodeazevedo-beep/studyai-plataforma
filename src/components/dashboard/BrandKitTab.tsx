import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/brand/BrandLogo";
import { defaultBrandSettings, getBrandSettings, resetBrandSettings, saveBrandSettings, type BrandLogoSettings } from "@/lib/brand";
import { Palette, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BrandKitTab = () => {
  const [brand, setBrand] = useState<BrandLogoSettings>(getBrandSettings);
  const { toast } = useToast();

  useEffect(() => setBrand(getBrandSettings()), []);

  const updateSize = (key: keyof BrandLogoSettings["sizes"], value: string) => {
    const size = Math.max(20, Math.min(96, Number(value) || defaultBrandSettings.sizes[key]));
    setBrand((current) => ({ ...current, sizes: { ...current.sizes, [key]: size } }));
  };

  const updateFile = (key: "wordmarkSrc" | "markSrc", file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBrand((current) => ({ ...current, [key]: String(reader.result) }));
    reader.readAsDataURL(file);
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
          <div className="space-y-2"><Label>Logo horizontal</Label><Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => updateFile("wordmarkSrc", e.target.files?.[0])} /></div>
          <div className="space-y-2"><Label>Símbolo / botão</Label><Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => updateFile("markSrc", e.target.files?.[0])} /></div>
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