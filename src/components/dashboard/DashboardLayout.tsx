import { ReactNode } from "react";
import Sidebar, { TabKey } from "./Sidebar";
import { Sparkles } from "lucide-react";
import WelcomeBanner from "./WelcomeBanner";

const QUOTES = [
  "Persistência transforma sonho em realidade.",
  "Cada hora de estudo te aproxima da aprovação.",
  "Disciplina é a ponte entre metas e conquistas.",
  "O sucesso é a soma de pequenos esforços repetidos.",
  "A dor do estudo é temporária, a aprovação é permanente.",
];

interface DashboardLayoutProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  userName: string;
  children: ReactNode;
}

const DashboardLayout = ({ activeTab, onTabChange, onLogout, userName, children }: DashboardLayoutProps) => {
  const quote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onLogout={onLogout} userName={userName} />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="flex items-center justify-end gap-2 px-6 py-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground italic">"{quote}"</span>
        </div>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <WelcomeBanner userName={userName} />
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
