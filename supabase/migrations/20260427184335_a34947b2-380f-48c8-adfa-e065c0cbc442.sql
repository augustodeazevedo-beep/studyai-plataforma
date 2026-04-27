CREATE OR REPLACE FUNCTION public.normalize_study_name(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(
    trim(
      regexp_replace(
        translate(
          coalesce(input, ''),
          'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
          'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$$;

CREATE UNIQUE INDEX IF NOT EXISTS user_subjects_user_normalized_name_uidx
ON public.user_subjects (user_id, public.normalize_study_name(name));

CREATE UNIQUE INDEX IF NOT EXISTS topics_user_subject_normalized_name_uidx
ON public.topics (user_id, subject_id, public.normalize_study_name(name));

CREATE UNIQUE INDEX IF NOT EXISTS study_plan_user_subject_uidx
ON public.study_plan (user_id, subject_id)
WHERE subject_id IS NOT NULL;