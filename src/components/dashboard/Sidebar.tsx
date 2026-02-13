import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, CalendarCheck, HelpCircle, Layers,
  FolderOpen, StickyNote, BarChart3, Timer, Settings, LogOut, Menu, X, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export type TabKey =
  | "overview" | "plan" | "reviews" | "questions" | "flashcards"
  | "materials" | "notes" | "progress" | "timer" | "settings";

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  userName: string;
}

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { key: "plan", label: "Plano de Estudos", icon: BookOpen },
  { key: "reviews", label: "Revisões", icon: CalendarCheck },
  { key: "questions", label: "Questões", icon: HelpCircle },
  { key: "flashcards", label: "Flashcards", icon: Layers },
  { key: "materials", label: "Materiais", icon: FolderOpen },
  { key: "notes", label: "Anotações", icon: StickyNote },
  { key: "progress", label: "Progresso", icon: BarChart3 },
  { key: "timer", label: "Cronômetro", icon: Timer },
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
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col z-40 transition-transform duration-300",
          "lg:translate-x-0 lg:static",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <img src="/logo-cognos.png" alt="COGNOS" className="h-7" />
          <span className="font-display text-base font-bold">
            COGNOS <span className="text-sidebar-primary">Study.AI</span>
          </span>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto p-3">
          {nav}
        </div>

        {/* User & logout */}
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
