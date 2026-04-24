import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SRS_INTERVALS = [1, 3, 7, 15, 30];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { subject_id, performance_rating } = await req.json();

    // Get last review for this subject
    const { data: lastReview } = await supabase
      .from("spaced_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("subject_id", subject_id)
      .order("review_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Determine next interval
    let currentIntervalIndex = 0;
    if (lastReview) {
      const lastInterval = lastReview.interval_days;
      currentIntervalIndex = SRS_INTERVALS.indexOf(lastInterval);
      if (currentIntervalIndex === -1) currentIntervalIndex = 0;

      // Adjust based on performance (1-5 scale)
      if (performance_rating >= 4) {
        currentIntervalIndex = Math.min(currentIntervalIndex + 1, SRS_INTERVALS.length - 1);
      } else if (performance_rating <= 2) {
        currentIntervalIndex = Math.max(currentIntervalIndex - 1, 0);
      }
    }

    const nextInterval = SRS_INTERVALS[currentIntervalIndex];
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + nextInterval);

    const { error: insertError } = await supabase.from("spaced_reviews").insert({
      user_id: user.id,
      subject_id,
      review_date: nextDate.toISOString().split("T")[0],
      interval_days: nextInterval,
      completed: false,
      performance_rating: performance_rating || 0,
      next_review_date: nextDate.toISOString().split("T")[0],
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, next_review_date: nextDate.toISOString().split("T")[0], interval_days: nextInterval }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-reviews error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
