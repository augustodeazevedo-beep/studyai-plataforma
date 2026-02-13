import { ReactNode } from "react";
import Sidebar, { TabKey } from "./Sidebar";

interface DashboardLayoutProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  userName: string;
  children: ReactNode;
}

const DashboardLayout = ({ activeTab, onTabChange, onLogout, userName, children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onLogout={onLogout} userName={userName} />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
