import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Check, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReviewsTabProps { userId: string }

const ReviewsTab = ({ userId }: ReviewsTabProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchReviews = async () => {
    const [reviewsRes, subjectsRes] = await Promise.all([
      supabase.from("spaced_reviews").select("*").eq("user_id", userId).order("review_date"),
      supabase.from("user_subjects").select("*").eq("user_id", userId),
    ]);
    setReviews(reviewsRes.data || []);
    setSubjects(subjectsRes.data || []);
  };

  useEffect(() => { fetchReviews(); }, [userId]);

  const completeReview = async (reviewId: string, subjectId: string, rating: number) => {
    await supabase.from("spaced_reviews").update({ completed: true, performance_rating: rating }).eq("id", reviewId);
    // Generate next review
    await supabase.functions.invoke("generate-reviews", { body: { subject_id: subjectId, performance_rating: rating } });
    toast({ title: "Revisão concluída! ✅" });
    fetchReviews();
  };

  const today = new Date().toISOString().split("T")[0];
  const pending = reviews.filter((r) => !r.completed && r.review_date <= today);
  const upcoming = reviews.filter((r) => !r.completed && r.review_date > today).slice(0, 10);
  const completed = reviews.filter((r) => r.completed).slice(0, 10);
  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />Revisões Espaçadas</h2>

      <Card className="glass border-primary/20">
        <CardHeader><CardTitle className="text-base">Pendentes hoje ({pending.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma revisão pendente! 🎉</p>
          ) : pending.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="font-medium text-sm">{getSubjectName(r.subject_id)}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => completeReview(r.id, r.subject_id, rating)}
                  >
                    <Star className={cn("h-4 w-4", rating <= 3 ? "text-warning" : "text-primary")} />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Próximas revisões</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma agendada</p> : (
              <ul className="space-y-2">
                {upcoming.map((r) => (
                  <li key={r.id} className="flex justify-between text-sm p-2 rounded bg-muted/20">
                    <span>{getSubjectName(r.subject_id)}</span>
                    <span className="text-muted-foreground">{r.review_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Concluídas recentemente</CardTitle></CardHeader>
          <CardContent>
            {completed.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma revisão concluída</p> : (
              <ul className="space-y-2">
                {completed.map((r) => (
                  <li key={r.id} className="flex justify-between text-sm p-2 rounded bg-muted/20">
                    <span className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />{getSubjectName(r.subject_id)}</span>
                    <span className="text-muted-foreground">⭐ {r.performance_rating}/5</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReviewsTab;
