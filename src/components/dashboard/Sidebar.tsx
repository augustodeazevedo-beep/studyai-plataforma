import { cn } from "@/lib/utils";
import {
  CalendarDays, Shield, BarChart3, BookOpen, History,
  Sparkles, Brain, MessageCircle, Trophy, Settings, LogOut, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export type TabKey =
  | "planner" | "arsenal" | "analysis" | "notebooks" | "history"
  | "predictor" | "coach" | "professor" | "achievements" | "settings";

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  userName: string;
}

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof CalendarDays; ai?: boolean }[] = [
  { key: "planner", label: "Planner", icon: CalendarDays },
  { key: "arsenal", label: "Arsenal", icon: Shield },
  { key: "analysis", label: "Análise", icon: BarChart3 },
  { key: "notebooks", label: "Cadernos", icon: BookOpen },
  { key: "history", label: "Histórico", icon: History },
  { key: "predictor", label: "Previsor.IA", icon: Sparkles, ai: true },
  { key: "coach", label: "Coach.IA", icon: Brain, ai: true },
  { key: "professor", label: "Professor.IA", icon: MessageCircle, ai: true },
  { key: "achievements", label: "Conquistas", icon: Trophy },
  { key: "settings", label: "Configurações", icon: Settings },
];

const Sidebar = ({ activeTab, onTabChange, onLogout, userName }: SidebarProps) => {
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1 flex-1">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => { onTabChange(item.key); setOpen(false); }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
            activeTab === item.key
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.ai && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">IA</span>
          )}
        </button>
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
          "fixed top-0 left-0 h-full w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col z-40 transition-transform duration-300",
          "lg:translate-x-0 lg:static",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <img src="/logo-cognos.png" alt="COGNOS" className="h-7" />
          <span className="font-display text-base font-bold">
            COGNOS <span className="text-sidebar-primary">Study.AI</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {nav}
        </div>

        <div className="border-t border-sidebar-border p-3 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <Brain className="h-4 w-4 text-sidebar-primary" />
            <span className="text-sm text-sidebar-foreground truncate">{userName}</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
