CREATE TABLE IF NOT EXISTS public.pdf_processing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  submission_id UUID NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  safe_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_processing_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pdf_processing_logs_user_submission
ON public.pdf_processing_logs (user_id, submission_id, created_at DESC);

CREATE POLICY "Users can create own pdf processing logs"
ON public.pdf_processing_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own pdf processing logs"
ON public.pdf_processing_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

UPDATE storage.buckets
SET public = false
WHERE id = 'study-materials';

DROP POLICY IF EXISTS "Users can upload own materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own materials files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own materials files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own study materials" ON storage.objects;

CREATE POLICY "Users can upload own study materials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'study-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own study materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'study-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own study materials"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'study-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own study materials without changing owner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'study-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'study-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
);