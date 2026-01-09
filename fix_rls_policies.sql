-- FIX: Add missing DELETE policies for learning_stats and vocabulary
-- Run this in your Supabase SQL Editor

-- 1. Enable DELETE for learning_stats
CREATE POLICY "Users can delete their own learning stats"
    ON learning_stats FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Verify vocabulary policies (just in case)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vocabulary' AND policyname = 'Users can delete their own vocabulary'
    ) THEN
        CREATE POLICY "Users can delete their own vocabulary"
            ON vocabulary FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;
