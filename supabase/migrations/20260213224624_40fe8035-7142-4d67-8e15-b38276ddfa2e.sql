
-- 1. Create topics table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own topics" ON public.topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE USING (auth.uid() = user_id);

-- 2. Create ai_coaching_history table
CREATE TABLE public.ai_coaching_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_coaching_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own coaching" ON public.ai_coaching_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coaching" ON public.ai_coaching_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own coaching" ON public.ai_coaching_history FOR DELETE USING (auth.uid() = user_id);

-- 3. Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  reminder_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

-- 5. Alter study_sessions: add new columns
ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS material_name TEXT,
  ADD COLUMN IF NOT EXISTS pages_start INTEGER,
  ADD COLUMN IF NOT EXISTS pages_end INTEGER,
  ADD COLUMN IF NOT EXISTS comprehension_rating INTEGER;
