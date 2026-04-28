ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS relevance_score numeric NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS incidence_score numeric NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS comprehension_score numeric NOT NULL DEFAULT 3;

UPDATE public.topics t
SET
  relevance_score = COALESCE(us.weight, 3),
  incidence_score = COALESCE(us.incidence, 3),
  comprehension_score = COALESCE(us.knowledge_level, 3)
FROM public.user_subjects us
WHERE t.subject_id = us.id
  AND t.user_id = us.user_id
  AND (t.relevance_score = 3 AND t.incidence_score = 3 AND t.comprehension_score = 3);