DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own study materials'
  ) THEN
    CREATE POLICY "Users can update own study materials"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'study-materials'
      AND (auth.uid())::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'study-materials'
      AND (auth.uid())::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;