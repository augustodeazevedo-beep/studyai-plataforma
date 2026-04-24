-- Restrict deletion of role records to admins only
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Harden queue helper functions with fixed search_path
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$ SELECT pgmq.delete(queue_name, message_id); $$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$ SELECT msg_id, read_ct, message FROM pgmq.read(queue_name, vt, batch_size); $$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$ SELECT pgmq.send(queue_name, payload); $$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$$;

-- Validate achievements against real user progress before allowing unlocks
CREATE OR REPLACE FUNCTION public.validate_achievement(_user_id uuid, _achievement_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sessions_count integer := 0;
  total_minutes integer := 0;
  subjects_count integer := 0;
  flashcards_count integer := 0;
  questions_count integer := 0;
  correct_questions_count integer := 0;
  notes_count integer := 0;
  reviews_completed_count integer := 0;
  checkins_count integer := 0;
  profile_complete boolean := false;
  has_night_session boolean := false;
  has_early_session boolean := false;
  max_streak integer := 0;
BEGIN
  IF _user_id IS NULL OR _achievement_key IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = _user_id AND achievement_key = _achievement_key
  ) THEN
    RETURN false;
  END IF;

  SELECT count(*), coalesce(sum(coalesce(duration_minutes, 0)), 0)
  INTO sessions_count, total_minutes
  FROM public.study_sessions
  WHERE user_id = _user_id;

  SELECT count(*) INTO subjects_count
  FROM public.user_subjects
  WHERE user_id = _user_id;

  SELECT count(*) INTO flashcards_count
  FROM public.flashcards
  WHERE user_id = _user_id;

  SELECT count(*), count(*) FILTER (WHERE is_correct)
  INTO questions_count, correct_questions_count
  FROM public.question_attempts
  WHERE user_id = _user_id;

  SELECT count(*) INTO notes_count
  FROM public.user_notes
  WHERE user_id = _user_id;

  SELECT count(*) INTO reviews_completed_count
  FROM public.spaced_reviews
  WHERE user_id = _user_id AND completed = true;

  SELECT count(*) INTO checkins_count
  FROM public.psyche_checkins
  WHERE user_id = _user_id;

  SELECT coalesce(onboarding_completed, false)
  INTO profile_complete
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;

  SELECT exists (
    SELECT 1 FROM public.study_sessions
    WHERE user_id = _user_id AND extract(hour FROM started_at) >= 22
  ) INTO has_night_session;

  SELECT exists (
    SELECT 1 FROM public.study_sessions
    WHERE user_id = _user_id AND extract(hour FROM started_at) < 7
  ) INTO has_early_session;

  WITH session_days AS (
    SELECT DISTINCT started_at::date AS day
    FROM public.study_sessions
    WHERE user_id = _user_id
  ), grouped AS (
    SELECT day, day - (row_number() OVER (ORDER BY day))::integer AS grp
    FROM session_days
  ), streaks AS (
    SELECT count(*)::integer AS streak
    FROM grouped
    GROUP BY grp
  )
  SELECT coalesce(max(streak), 0) INTO max_streak FROM streaks;

  RETURN CASE _achievement_key
    WHEN 'first_session' THEN sessions_count >= 1
    WHEN 'study_streak_3' THEN max_streak >= 3
    WHEN 'study_streak_7' THEN max_streak >= 7
    WHEN 'study_streak_30' THEN max_streak >= 30
    WHEN 'hours_10' THEN total_minutes >= 600
    WHEN 'hours_50' THEN total_minutes >= 3000
    WHEN 'hours_100' THEN total_minutes >= 6000
    WHEN 'hours_500' THEN total_minutes >= 30000
    WHEN 'subjects_5' THEN subjects_count >= 5
    WHEN 'subjects_10' THEN subjects_count >= 10
    WHEN 'flashcards_50' THEN flashcards_count >= 50
    WHEN 'flashcards_200' THEN flashcards_count >= 200
    WHEN 'questions_100' THEN questions_count >= 100
    WHEN 'questions_500' THEN questions_count >= 500
    WHEN 'perfect_score' THEN questions_count >= 10 AND correct_questions_count = questions_count
    WHEN 'night_owl' THEN has_night_session
    WHEN 'early_bird' THEN has_early_session
    WHEN 'first_note' THEN notes_count >= 1
    WHEN 'notes_10' THEN notes_count >= 10
    WHEN 'notes_50' THEN notes_count >= 50
    WHEN 'first_review' THEN reviews_completed_count >= 1
    WHEN 'reviews_20' THEN reviews_completed_count >= 20
    WHEN 'onboarding_complete' THEN profile_complete
    WHEN 'psyche_first_checkin' THEN checkins_count >= 1
    ELSE false
  END;
END;
$$;