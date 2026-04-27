import { supabase } from "@/integrations/supabase/client";

const ACHIEVEMENT_CHECKS: { key: string; check: (userId: string) => Promise<boolean> }[] = [
  {
    key: "iniciante",
    check: async (userId) => {
      const { data } = await supabase.from("profiles").select("onboarding_completed").eq("user_id", userId).maybeSingle();
      return !!data?.onboarding_completed;
    },
  },
  {
    key: "leitor_voraz",
    check: async (userId) => {
      const { data } = await supabase.from("study_sessions").select("duration_minutes").eq("user_id", userId);
      const totalHours = (data || []).reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60;
      return totalHours >= 50;
    },
  },
  {
    key: "entendimento_pleno",
    check: async (userId) => {
      const { data } = await supabase.from("study_sessions").select("comprehension_rating").eq("user_id", userId).eq("comprehension_rating", 5);
      return (data || []).length >= 10;
    },
  },
  {
    key: "mestre_materia",
    check: async (userId) => {
      const { data: subjects } = await supabase.from("user_subjects").select("id").eq("user_id", userId);
      if (!subjects || subjects.length === 0) return false;
      for (const sub of subjects) {
        const { data: topics } = await supabase.from("topics").select("completed").eq("user_id", userId).eq("subject_id", sub.id);
        if (topics && topics.length > 0 && topics.every(t => t.completed)) return true;
      }
      return false;
    },
  },
  {
    key: "esforcado",
    check: async (userId) => {
      const { data } = await supabase.from("study_sessions").select("started_at").eq("user_id", userId);
      if (!data || data.length === 0) return false;
      const dates = [...new Set(data.map(s => s.started_at.split("T")[0]))].sort();
      let maxStreak = 1, streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) { streak++; maxStreak = Math.max(maxStreak, streak); }
        else { streak = 1; }
      }
      return maxStreak >= 7;
    },
  },
  {
    key: "anotador",
    check: async (userId) => {
      const { count } = await supabase.from("user_notes").select("*", { count: "exact", head: true }).eq("user_id", userId);
      return (count || 0) >= 50;
    },
  },
  {
    key: "polimata",
    check: async (userId) => {
      const { data } = await supabase.from("study_sessions").select("subject_id").eq("user_id", userId);
      const unique = new Set((data || []).map(s => s.subject_id).filter(Boolean));
      return unique.size >= 5;
    },
  },
  {
    key: "conquistador",
    check: async (userId) => {
      const { count } = await supabase.from("topics").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true);
      return (count || 0) >= 100;
    },
  },
  {
    key: "maratonista",
    check: async (userId) => {
      const { data } = await supabase.from("study_sessions").select("duration_minutes").eq("user_id", userId);
      return (data || []).some(s => (s.duration_minutes || 0) >= 240);
    },
  },
  {
    key: "questionador",
    check: async (userId) => {
      const { count } = await supabase.from("question_attempts").select("*", { count: "exact", head: true }).eq("user_id", userId);
      return (count || 0) >= 200;
    },
  },
  {
    key: "precisao",
    check: async (userId) => {
      const { data } = await supabase.from("question_attempts").select("is_correct").eq("user_id", userId);
      if (!data || data.length < 50) return false;
      const correct = data.filter(a => a.is_correct).length;
      return (correct / data.length) * 100 >= 80;
    },
  },
  {
    key: "revisor",
    check: async (userId) => {
      const { count } = await supabase.from("spaced_reviews").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true);
      return (count || 0) >= 20;
    },
  },
];

export async function checkAchievements(userId: string): Promise<string[]> {
  const { data: existing } = await supabase.from("user_achievements").select("achievement_key").eq("user_id", userId);
  const unlockedKeys = new Set((existing || []).map(a => a.achievement_key));
  const newlyUnlocked: string[] = [];

  for (const ac of ACHIEVEMENT_CHECKS) {
    if (unlockedKeys.has(ac.key)) continue;
    try {
      const passed = await ac.check(userId);
      if (passed) {
        await supabase.from("user_achievements").insert({ user_id: userId, achievement_key: ac.key });
        newlyUnlocked.push(ac.key);
      }
    } catch (e) {
      console.error(`Achievement check failed for ${ac.key}:`, e);
    }
  }

  return newlyUnlocked;
}
