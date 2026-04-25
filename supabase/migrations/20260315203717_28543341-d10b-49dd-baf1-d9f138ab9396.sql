
-- STEP 1: Fix all RLS policies from TO public → TO authenticated
-- reminders
DROP POLICY IF EXISTS "Users can delete own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- topics
DROP POLICY IF EXISTS "Users can delete own topics" ON public.topics;
DROP POLICY IF EXISTS "Users can insert own topics" ON public.topics;
DROP POLICY IF EXISTS "Users can update own topics" ON public.topics;
DROP POLICY IF EXISTS "Users can view own topics" ON public.topics;
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own topics" ON public.topics FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- study_materials
DROP POLICY IF EXISTS "Users can delete own materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can insert own materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can update own materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can view own materials" ON public.study_materials;
CREATE POLICY "Users can delete own materials" ON public.study_materials FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own materials" ON public.study_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own materials" ON public.study_materials FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own materials" ON public.study_materials FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- study_calendar_blocks
DROP POLICY IF EXISTS "Users can create their own calendar blocks" ON public.study_calendar_blocks;
DROP POLICY IF EXISTS "Users can delete their own calendar blocks" ON public.study_calendar_blocks;
DROP POLICY IF EXISTS "Users can update their own calendar blocks" ON public.study_calendar_blocks;
DROP POLICY IF EXISTS "Users can view their own calendar blocks" ON public.study_calendar_blocks;
CREATE POLICY "Users can create their own calendar blocks" ON public.study_calendar_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own calendar blocks" ON public.study_calendar_blocks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own calendar blocks" ON public.study_calendar_blocks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own calendar blocks" ON public.study_calendar_blocks FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_subjects
DROP POLICY IF EXISTS "Users can delete own subjects" ON public.user_subjects;
DROP POLICY IF EXISTS "Users can insert own subjects" ON public.user_subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON public.user_subjects;
DROP POLICY IF EXISTS "Users can view own subjects" ON public.user_subjects;
CREATE POLICY "Users can delete own subjects" ON public.user_subjects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subjects" ON public.user_subjects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON public.user_subjects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subjects" ON public.user_subjects FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- study_sessions
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.study_sessions;
CREATE POLICY "Users can delete own sessions" ON public.study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own sessions" ON public.study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ai_coaching_history
DROP POLICY IF EXISTS "Users can delete own coaching" ON public.ai_coaching_history;
DROP POLICY IF EXISTS "Users can insert own coaching" ON public.ai_coaching_history;
DROP POLICY IF EXISTS "Users can view own coaching" ON public.ai_coaching_history;
CREATE POLICY "Users can delete own coaching" ON public.ai_coaching_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coaching" ON public.ai_coaching_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own coaching" ON public.ai_coaching_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- spaced_reviews
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.spaced_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.spaced_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.spaced_reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON public.spaced_reviews;
CREATE POLICY "Users can delete own reviews" ON public.spaced_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.spaced_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.spaced_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own reviews" ON public.spaced_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- flashcards
DROP POLICY IF EXISTS "Users can delete own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can insert own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can update own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can view own flashcards" ON public.flashcards;
CREATE POLICY "Users can delete own flashcards" ON public.flashcards FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flashcards" ON public.flashcards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcards" ON public.flashcards FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own flashcards" ON public.flashcards FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_notes
DROP POLICY IF EXISTS "Users can delete own notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can view own notes" ON public.user_notes;
CREATE POLICY "Users can delete own notes" ON public.user_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.user_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.user_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notes" ON public.user_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

-- study_plan
DROP POLICY IF EXISTS "Users can delete own plan" ON public.study_plan;
DROP POLICY IF EXISTS "Users can insert own plan" ON public.study_plan;
DROP POLICY IF EXISTS "Users can update own plan" ON public.study_plan;
DROP POLICY IF EXISTS "Users can view own plan" ON public.study_plan;
CREATE POLICY "Users can delete own plan" ON public.study_plan FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plan" ON public.study_plan FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plan" ON public.study_plan FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own plan" ON public.study_plan FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_achievements
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- question_attempts
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.question_attempts;
DROP POLICY IF EXISTS "Users can view own attempts" ON public.question_attempts;
CREATE POLICY "Users can insert own attempts" ON public.question_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own attempts" ON public.question_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- questions
DROP POLICY IF EXISTS "Users can delete own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can insert own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can view own questions" ON public.questions;
CREATE POLICY "Users can delete own questions" ON public.questions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions" ON public.questions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own questions" ON public.questions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "System creates profile on signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "System creates profile on signup" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR is_admin(auth.uid()));
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

-- STEP 3: Server-side achievement validation
CREATE OR REPLACE FUNCTION public.validate_achievement(_user_id uuid, _achievement_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _achievement_key IN (
    'first_session', 'study_streak_3', 'study_streak_7', 'study_streak_30',
    'hours_10', 'hours_50', 'hours_100', 'hours_500',
    'subjects_5', 'subjects_10',
    'flashcards_50', 'flashcards_200',
    'questions_100', 'questions_500',
    'perfect_score', 'night_owl', 'early_bird',
    'first_note', 'notes_10', 'notes_50',
    'first_review', 'reviews_20',
    'onboarding_complete', 'psyche_first_checkin'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = _user_id AND achievement_key = _achievement_key
  )
$$;

CREATE POLICY "Users can insert validated achievements" ON public.user_achievements
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.validate_achievement(auth.uid(), achievement_key)
);
