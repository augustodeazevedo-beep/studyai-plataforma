CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL;

ALTER TABLE public.spaced_reviews
ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_topic ON public.study_sessions(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_spaced_reviews_user_topic ON public.spaced_reviews(user_id, topic_id);

CREATE TABLE IF NOT EXISTS public.topic_review_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  forgetting_risk numeric NOT NULL DEFAULT 0,
  comprehension_score numeric NOT NULL DEFAULT 0,
  intensity_score numeric NOT NULL DEFAULT 0,
  psyche_score numeric NOT NULL DEFAULT 60,
  interval_days integer NOT NULL DEFAULT 1,
  last_studied_at timestamp with time zone,
  last_reviewed_at timestamp with time zone,
  next_review_at date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  recommendation text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.topic_review_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topic review schedules"
ON public.topic_review_schedules FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own topic review schedules"
ON public.topic_review_schedules FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic review schedules"
ON public.topic_review_schedules FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic review schedules"
ON public.topic_review_schedules FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS topic_review_schedules_user_topic_uidx
ON public.topic_review_schedules(user_id, topic_id)
WHERE topic_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS topic_review_schedules_user_subject_uidx
ON public.topic_review_schedules(user_id, subject_id)
WHERE topic_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_topic_review_schedules_due
ON public.topic_review_schedules(user_id, next_review_at, forgetting_risk DESC);

CREATE TRIGGER update_topic_review_schedules_updated_at
BEFORE UPDATE ON public.topic_review_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.public_source_audits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.user_subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  source_url text,
  source_title text NOT NULL DEFAULT 'Fonte pública',
  source_note text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT 'edital_processing',
  copyright_assessment text NOT NULL DEFAULT 'Fonte pública registrada apenas como referência; conteúdo integral não é reproduzido.',
  storage_notes text NOT NULL DEFAULT 'A plataforma armazena metadados, resumo e pontuações, não cópia integral de obras protegidas.',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.public_source_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own public source audits"
ON public.public_source_audits FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own public source audits"
ON public.public_source_audits FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_public_source_audits_user_created
ON public.public_source_audits(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.content_audit_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'continuous_security_copyright',
  status text NOT NULL DEFAULT 'completed',
  summary text NOT NULL DEFAULT '',
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  protections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.content_audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content audit reports"
ON public.content_audit_reports FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own content audit reports"
ON public.content_audit_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_content_audit_reports_user_created
ON public.content_audit_reports(user_id, created_at DESC);