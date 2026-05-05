import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import type { TabKey } from "@/components/dashboard/Sidebar";
import PlannerTab from "@/components/dashboard/PlannerTab";
import ArsenalTab from "@/components/dashboard/ArsenalTab";
import AnalysisTab from "@/components/dashboard/AnalysisTab";
import NotebooksTab from "@/components/dashboard/NotebooksTab";
import HistoryTab from "@/components/dashboard/HistoryTab";
import PredictorTab from "@/components/dashboard/PredictorTab";
import CoachTab from "@/components/dashboard/CoachTab";
import ProfessorTab from "@/components/dashboard/ProfessorTab";
import AchievementsTab from "@/components/dashboard/AchievementsTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import TutorialTab from "@/components/dashboard/TutorialTab";
import PsycheTab from "@/components/dashboard/PsycheTab";
import PerformanceTab from "@/components/dashboard/PerformanceTab";
import CronogramaOABTab from "@/components/dashboard/CronogramaOABTab";
import BrandLogo from "@/components/brand/BrandLogo";
import { toast } from "sonner";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "planner";

  const setActiveTab = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    let cancelled = false;

    const checkOnboarding = async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Não foi possível verificar seu onboarding agora.");
        setLoading(false);
        return;
      }
      if (data && !data.onboarding_completed) {
        navigate("/onboarding");
        return;
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkOnboarding(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkOnboarding(session.user.id);
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <BrandLogo variant="mark" size="sidebarCollapsed" imgClassName="animate-pulse" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Estudante";

  const renderTab = () => {
    switch (activeTab) {
      case "planner": return <PlannerTab userId={user.id} />;
      case "arsenal": return <ArsenalTab userId={user.id} />;
      case "analysis": return <AnalysisTab userId={user.id} />;
      case "notebooks": return <NotebooksTab userId={user.id} />;
      case "history": return <HistoryTab userId={user.id} />;
      case "predictor": return <PredictorTab userId={user.id} />;
      case "coach": return <CoachTab userId={user.id} />;
      case "professor": return <ProfessorTab userId={user.id} />;
      case "psyche": return <PsycheTab userId={user.id} />;
      case "performance": return <PerformanceTab userId={user.id} />;
      case "achievements": return <AchievementsTab userId={user.id} />;
      case "settings": return <SettingsTab userId={user.id} />;
      case "tutorial": return <TutorialTab userId={user.id} />;
      case "cronograma_oab": return <CronogramaOABTab userId={user.id} />;
      default: return <PlannerTab userId={user.id} />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      userName={displayName}
    >
      <div>{renderTab()}</div>
    </DashboardLayout>
  );
};

export default Dashboard;
