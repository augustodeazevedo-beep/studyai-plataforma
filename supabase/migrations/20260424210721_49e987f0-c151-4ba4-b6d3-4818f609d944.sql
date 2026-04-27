CREATE TABLE IF NOT EXISTS public.planner_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  subject_id UUID NULL,
  before_state JSONB NULL,
  after_state JSONB NULL,
  explanation TEXT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own planner audit logs"
ON public.planner_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own planner audit logs"
ON public.planner_audit_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_planner_audit_logs_user_created
ON public.planner_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_audit_logs_subject
ON public.planner_audit_logs (user_id, subject_id, created_at DESC);

ALTER TABLE public.study_calendar_blocks
  ADD COLUMN IF NOT EXISTS block_type TEXT NOT NULL DEFAULT 'study',
  ADD COLUMN IF NOT EXISTS cognitive_load TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_study_calendar_blocks_user_type_date
ON public.study_calendar_blocks (user_id, block_type, block_date);