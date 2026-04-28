CREATE TABLE IF NOT EXISTS public.predict_cycle_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  level TEXT NOT NULL,
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.predict_cycle_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_predict_cycle_logs_user_created
ON public.predict_cycle_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_predict_cycle_logs_correlation
ON public.predict_cycle_logs (correlation_id);

CREATE POLICY "Users can view their own prediction logs"
ON public.predict_cycle_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prediction logs"
ON public.predict_cycle_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage prediction logs"
ON public.predict_cycle_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);