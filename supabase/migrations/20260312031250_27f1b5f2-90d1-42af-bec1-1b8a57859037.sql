
-- Table for psyche/well-being profiles and anamnesis
CREATE TABLE public.psyche_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Anamnesis data
  has_neurodivergence BOOLEAN DEFAULT false,
  neurodivergence_type TEXT, -- TDAH, TEA, Dislexia, etc.
  neurodivergence_notes TEXT,
  stress_level INTEGER DEFAULT 3, -- 1-5
  anxiety_level INTEGER DEFAULT 3, -- 1-5
  sleep_quality INTEGER DEFAULT 3, -- 1-5
  motivation_level INTEGER DEFAULT 3, -- 1-5
  focus_capacity INTEGER DEFAULT 3, -- 1-5
  -- Cognitive profile
  best_study_period TEXT DEFAULT 'morning', -- morning, afternoon, evening, night
  preferred_study_method TEXT, -- visual, auditory, kinesthetic, reading
  attention_span_minutes INTEGER DEFAULT 25,
  -- Periodic check-in
  current_mood INTEGER DEFAULT 3, -- 1-5
  mood_notes TEXT,
  last_checkin_at TIMESTAMPTZ,
  -- Anamnesis completion flag
  anamnesis_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.psyche_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own psyche profile" ON public.psyche_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own psyche profile" ON public.psyche_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own psyche profile" ON public.psyche_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Mood check-in log for tracking over time
CREATE TABLE public.psyche_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood INTEGER NOT NULL DEFAULT 3, -- 1-5
  stress INTEGER NOT NULL DEFAULT 3, -- 1-5
  energy INTEGER NOT NULL DEFAULT 3, -- 1-5
  focus INTEGER NOT NULL DEFAULT 3, -- 1-5
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.psyche_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.psyche_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins" ON public.psyche_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
