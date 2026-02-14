
-- Create study calendar blocks table for the monthly planner grid
CREATE TABLE public.study_calendar_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  material_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_calendar_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own calendar blocks"
ON public.study_calendar_blocks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar blocks"
ON public.study_calendar_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar blocks"
ON public.study_calendar_blocks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar blocks"
ON public.study_calendar_blocks FOR DELETE USING (auth.uid() = user_id);

-- Index for fast date range queries
CREATE INDEX idx_calendar_blocks_user_date ON public.study_calendar_blocks(user_id, block_date);

-- Timestamp trigger
CREATE TRIGGER update_calendar_blocks_updated_at
BEFORE UPDATE ON public.study_calendar_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
