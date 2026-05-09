import { LayoutGrid, Check, ExternalLink, Scale, FileText, Briefcase, Search, Wallet, GraduationCap, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type App = {
  name: string;
  url: string;
  description: string;
  Icon: LucideIcon;
  active?: boolean;
};

const APPS: App[] = [
  { name: "Inventaria", url: "https://inventariaai.lovable.app", description: "Planejamento patrimonial e sucessório", Icon: Scale },
  { name: "Peticiona", url: "https://peticionaai-byadvocacyai.lovable.app", description: "Petições, minutas e contratos", Icon: FileText },
  { name: "Advoga", url: "https://advogaai-byadvocacy.lovable.app", description: "Gestão de processos e escritório", Icon: Briefcase },
  { name: "Prospect", url: "https://prospectai-byadvocacyai.lovable.app", description: "Prospecção e inteligência de clientes", Icon: Search },
  { name: "Fin", url: "https://finai-byadvocacyia.lovable.app", description: "Gestão financeira do escritório", Icon: Wallet },
  { name: "Study", url: "https://studyai-plataforma.lovable.app", description: "Pesquisa jurídica e estudos", Icon: GraduationCap, active: true },
];

const AppsLauncher = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Apps</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl p-3">
        <div className="px-2 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Ecossistema
          </p>
          <p className="text-base font-display font-bold">
            Advocacy<span className="text-primary">.AI</span>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {APPS.map(({ name, url, description, Icon, active }) => {
            const content = (
              <>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary/15 text-primary" : "bg-muted/50 text-foreground/80"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="truncate">
                      {name}<span className="text-primary">.AI</span>
                    </span>
                    {active ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
              </>
            );
            const baseClasses = "flex items-center gap-3 rounded-lg border px-2.5 py-2 transition-colors";
            if (active) {
              return (
                <div
                  key={name}
                  className={`${baseClasses} border-primary/40 bg-primary/10`}
                  aria-current="page"
                >
                  {content}
                </div>
              );
            }
            return (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${baseClasses} border-transparent hover:border-border hover:bg-muted/40`}
              >
                {content}
              </a>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppsLauncher;
