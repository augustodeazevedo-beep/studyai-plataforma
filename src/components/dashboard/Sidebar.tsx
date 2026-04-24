import { cn } from "@/lib/utils";
import {
  CalendarDays, Shield, BarChart3, BookOpen, History,
  Sparkles, Brain, MessageCircle, Trophy, Settings, LogOut, Menu, X,
  ChevronLeft, HelpCircle, Palette, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import BrandLogo from "@/components/brand/BrandLogo";

export type TabKey =
  | "planner" | "arsenal" | "analysis" | "notebooks" | "history"
  | "predictor" | "coach" | "professor" | "psyche" | "achievements" | "settings" | "tutorial" | "brand-kit";

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  userName: string;
}

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof CalendarDays; ai?: boolean; separator?: string }[] = [
  { key: "psyche", label: "Bem-Estar", icon: Heart, separator: "Preparação" },
  { key: "arsenal", label: "Arsenal", icon: Shield },
  { key: "planner", label: "Planner", icon: CalendarDays, separator: "Execução" },
  { key: "notebooks", label: "Cadernos", icon: BookOpen },
  { key: "analysis", label: "Análise", icon: BarChart3, separator: "Inteligência" },
  { key: "coach", label: "Coach.IA", icon: Brain, ai: true },
  { key: "professor", label: "Professor.IA", icon: MessageCircle, ai: true },
  { key: "predictor", label: "Previsor.IA", icon: Sparkles, ai: true },
  { key: "history", label: "Histórico", icon: History, separator: "Acompanhamento" },
  { key: "achievements", label: "Conquistas", icon: Trophy },
  { key: "tutorial", label: "Tutorial", icon: HelpCircle },
];

const Sidebar = ({ activeTab, onTabChange, onLogout, userName }: SidebarProps) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const nav = (
    <nav className="flex flex-col gap-0.5 flex-1">
      {NAV_ITEMS.map((item) => (
        <div key={item.key}>
          {item.separator && !collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 pt-3 pb-1">
              {item.separator}
            </p>
          )}
          {item.separator && collapsed && <div className="my-1 mx-2 border-t border-border/30" />}
          <button
            onClick={() => { onTabChange(item.key); setOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full",
              collapsed && "justify-center px-2",
              activeTab === item.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {!collapsed && item.ai && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">IA</span>
            )}
          </button>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-sidebar-background flex flex-col z-40 transition-all duration-300",
          "lg:translate-x-0 lg:static",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16 hidden lg:flex" : "w-64"
        )}
      >
        <div className={cn("flex items-center gap-2 px-4 h-16", collapsed && "px-2 justify-center")}>
          <BrandLogo variant={collapsed ? "mark" : "wordmark"} size={collapsed ? "sidebarCollapsed" : "sidebar"} imgClassName={collapsed ? "w-10" : "max-w-[168px]"} />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {nav}
        </div>

        {/* Collapse toggle */}
        <div className="hidden lg:flex justify-end px-2 py-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={collapsed ? "Expandir" : "Recolher"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        <div className="p-3 space-y-2">
          {/* Theme toggle */}
          <button
            onClick={() => {
              const html = document.documentElement;
              const currentDark = html.classList.contains("dark");
              if (currentDark) {
                html.classList.remove("dark");
                localStorage.setItem("theme", "light");
                setIsDark(false);
              } else {
                html.classList.add("dark");
                localStorage.setItem("theme", "dark");
                setIsDark(true);
              }
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
              collapsed && "justify-center px-2",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            title={collapsed ? "Alternar Tema" : undefined}
          >
            <Palette className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Alternar Tema</span>}
          </button>
          {/* Settings button */}
          <button
            onClick={() => { onTabChange("settings"); setOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
              collapsed && "justify-center px-2",
              activeTab === "settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            title={collapsed ? "Configurações" : undefined}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Configurações</span>}
          </button>
          <button
            onClick={() => { onTabChange("brand-kit"); setOpen(false); }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
              collapsed && "justify-center px-2",
              activeTab === "brand-kit"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            title={collapsed ? "Brand Kit" : undefined}
          >
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Brand Kit</span>}
          </button>
          <div className={cn("flex items-center gap-2 px-3 py-2", collapsed && "justify-center px-2")}>
            <Brain className="h-4 w-4 text-sidebar-primary flex-shrink-0" />
            {!collapsed && <span className="text-sm text-sidebar-foreground truncate">{userName}</span>}
          </div>
          <button
            onClick={onLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Sair" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
