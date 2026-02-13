import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Brain } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import type { TabKey } from "@/components/dashboard/Sidebar";
import OverviewTab from "@/components/dashboard/OverviewTab";
import StudyPlanTab from "@/components/dashboard/StudyPlanTab";
import ReviewsTab from "@/components/dashboard/ReviewsTab";
import QuestionsTab from "@/components/dashboard/QuestionsTab";
import FlashcardsTab from "@/components/dashboard/FlashcardsTab";
import MaterialsTab from "@/components/dashboard/MaterialsTab";
import NotesTab from "@/components/dashboard/NotesTab";
import ProgressTab from "@/components/dashboard/ProgressTab";
import StudyTimerTab from "@/components/dashboard/StudyTimerTab";
import SettingsTab from "@/components/dashboard/SettingsTab";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "overview";

  const setActiveTab = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    const checkOnboarding = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();
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

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Brain className="h-6 w-6 animate-pulse text-primary" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Estudante";

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab userId={user.id} />;
      case "plan": return <StudyPlanTab userId={user.id} />;
      case "reviews": return <ReviewsTab userId={user.id} />;
      case "questions": return <QuestionsTab userId={user.id} />;
      case "flashcards": return <FlashcardsTab userId={user.id} />;
      case "materials": return <MaterialsTab userId={user.id} />;
      case "notes": return <NotesTab userId={user.id} />;
      case "progress": return <ProgressTab userId={user.id} />;
      case "timer": return <StudyTimerTab userId={user.id} />;
      case "settings": return <SettingsTab userId={user.id} />;
      default: return <OverviewTab userId={user.id} />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      userName={displayName}
    >
      {renderTab()}
    </DashboardLayout>
  );
};

export default Dashboard;
