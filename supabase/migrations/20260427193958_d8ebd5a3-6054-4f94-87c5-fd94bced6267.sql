DO $$
DECLARE
  removed_count integer := 0;
BEGIN
  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY
          user_id,
          COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
          COALESCE(topic_id, '00000000-0000-0000-0000-000000000000'::uuid),
          review_date
        ORDER BY
          completed DESC,
          COALESCE(performance_rating, 0) DESC,
          created_at ASC,
          id ASC
      ) AS rn
    FROM public.spaced_reviews
  ), deleted AS (
    DELETE FROM public.spaced_reviews sr
    USING ranked r
    WHERE sr.id = r.id
      AND r.rn > 1
    RETURNING sr.id
  )
  SELECT count(*) INTO removed_count FROM deleted;

  INSERT INTO public.planner_audit_logs (
    user_id,
    event_type,
    event_source,
    explanation,
    after_state,
    metadata
  )
  SELECT
    grouped.user_id,
    'spaced_reviews_deduplicated',
    'database_migration',
    'Auditoria automática removeu revisões duplicadas para preservar a idempotência do recálculo.',
    jsonb_build_object('removed_total_global', removed_count),
    jsonb_build_object('scope', 'spaced_reviews_unique_user_subject_topic_date')
  FROM (
    SELECT DISTINCT user_id
    FROM public.spaced_reviews
    WHERE user_id IS NOT NULL
  ) grouped
  WHERE removed_count > 0;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS spaced_reviews_user_subject_topic_date_uidx
ON public.spaced_reviews (
  user_id,
  COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(topic_id, '00000000-0000-0000-0000-000000000000'::uuid),
  review_date
);

CREATE INDEX IF NOT EXISTS idx_spaced_reviews_user_due_pending
ON public.spaced_reviews(user_id, completed, review_date);

CREATE INDEX IF NOT EXISTS idx_spaced_reviews_user_subject_topic_date
ON public.spaced_reviews(user_id, subject_id, topic_id, review_date);