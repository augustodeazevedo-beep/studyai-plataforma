
-- Create table for user subjects/disciplines with self-assessment
CREATE TABLE public.user_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  knowledge_level INT NOT NULL DEFAULT 1 CHECK (knowledge_level >= 1 AND knowledge_level <= 5),
  weight NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own subjects"
ON public.user_subjects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects"
ON public.user_subjects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects"
ON public.user_subjects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects"
ON public.user_subjects FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_subjects_updated_at
BEFORE UPDATE ON public.user_subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
