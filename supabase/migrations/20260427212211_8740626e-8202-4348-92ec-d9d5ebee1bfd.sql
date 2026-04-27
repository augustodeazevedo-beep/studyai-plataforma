ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS study_minutes_by_day JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.profiles
SET study_minutes_by_day = (
  SELECT COALESCE(jsonb_object_agg(day_key, GREATEST(0, ROUND(COALESCE(daily_hours, 0) * 60))::integer), '{}'::jsonb)
  FROM unnest(COALESCE(study_days, ARRAY[]::text[])) AS day_key
)
WHERE study_minutes_by_day = '{}'::jsonb
  AND study_days IS NOT NULL
  AND array_length(study_days, 1) > 0;