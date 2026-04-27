
-- Add incidence column to user_subjects for G-Force algorithm
ALTER TABLE public.user_subjects ADD COLUMN IF NOT EXISTS incidence integer NOT NULL DEFAULT 3;

-- Add comment
COMMENT ON COLUMN public.user_subjects.incidence IS 'Historical exam frequency score (1-5) for G-Force algorithm';
