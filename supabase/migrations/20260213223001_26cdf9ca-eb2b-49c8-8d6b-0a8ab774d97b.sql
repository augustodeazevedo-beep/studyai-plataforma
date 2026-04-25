
-- 1. study_sessions
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id);

-- 2. study_plan
CREATE TABLE public.study_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  priority_score NUMERIC DEFAULT 0,
  relevance NUMERIC DEFAULT 0,
  incidence NUMERIC DEFAULT 0,
  accuracy NUMERIC DEFAULT 0,
  performance NUMERIC DEFAULT 0,
  gap_score NUMERIC DEFAULT 0,
  recommended_hours_weekly NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.study_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plan" ON public.study_plan FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plan" ON public.study_plan FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plan" ON public.study_plan FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plan" ON public.study_plan FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_study_plan_updated_at BEFORE UPDATE ON public.study_plan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. spaced_reviews
CREATE TABLE public.spaced_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT false,
  performance_rating INTEGER DEFAULT 0,
  next_review_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.spaced_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reviews" ON public.spaced_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.spaced_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.spaced_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.spaced_reviews FOR DELETE USING (auth.uid() = user_id);

-- 4. questions
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  difficulty INTEGER NOT NULL DEFAULT 3,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own questions" ON public.questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own questions" ON public.questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions" ON public.questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own questions" ON public.questions FOR DELETE USING (auth.uid() = user_id);

-- 5. question_attempts
CREATE TABLE public.question_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attempts" ON public.question_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON public.question_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. flashcards
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 3,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_at TIMESTAMP WITH TIME ZONE,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own flashcards" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flashcards" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcards" ON public.flashcards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flashcards" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

-- 7. user_notes
CREATE TABLE public.user_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notes" ON public.user_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.user_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.user_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.user_notes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON public.user_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. study_materials
CREATE TABLE public.study_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  material_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own materials" ON public.study_materials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own materials" ON public.study_materials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own materials" ON public.study_materials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own materials" ON public.study_materials FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for study materials
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', false);
CREATE POLICY "Users can upload own materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own materials files" ON storage.objects FOR SELECT USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own materials files" ON storage.objects FOR DELETE USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
