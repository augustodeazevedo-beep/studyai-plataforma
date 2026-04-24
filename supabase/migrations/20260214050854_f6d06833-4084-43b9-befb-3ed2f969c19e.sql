
-- Drop and recreate FKs with ON DELETE CASCADE for subject_id references
ALTER TABLE public.topics DROP CONSTRAINT IF EXISTS topics_subject_id_fkey;
ALTER TABLE public.topics ADD CONSTRAINT topics_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;

ALTER TABLE public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_subject_id_fkey;
ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE SET NULL;

ALTER TABLE public.study_plan DROP CONSTRAINT IF EXISTS study_plan_subject_id_fkey;
ALTER TABLE public.study_plan ADD CONSTRAINT study_plan_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;

ALTER TABLE public.flashcards DROP CONSTRAINT IF EXISTS flashcards_subject_id_fkey;
ALTER TABLE public.flashcards ADD CONSTRAINT flashcards_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE SET NULL;

ALTER TABLE public.spaced_reviews DROP CONSTRAINT IF EXISTS spaced_reviews_subject_id_fkey;
ALTER TABLE public.spaced_reviews ADD CONSTRAINT spaced_reviews_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;

ALTER TABLE public.study_materials DROP CONSTRAINT IF EXISTS study_materials_subject_id_fkey;
ALTER TABLE public.study_materials ADD CONSTRAINT study_materials_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE SET NULL;

ALTER TABLE public.study_calendar_blocks DROP CONSTRAINT IF EXISTS study_calendar_blocks_subject_id_fkey;
ALTER TABLE public.study_calendar_blocks ADD CONSTRAINT study_calendar_blocks_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_subject_id_fkey;
ALTER TABLE public.questions ADD CONSTRAINT questions_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE SET NULL;

ALTER TABLE public.question_attempts DROP CONSTRAINT IF EXISTS question_attempts_question_id_fkey;
ALTER TABLE public.question_attempts ADD CONSTRAINT question_attempts_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE public.user_notes DROP CONSTRAINT IF EXISTS user_notes_subject_id_fkey;
ALTER TABLE public.user_notes ADD CONSTRAINT user_notes_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE SET NULL;

-- Add banca column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banca text;

-- Update storage bucket with file size limit (50MB)
UPDATE storage.buckets 
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp']
WHERE id = 'study-materials';
