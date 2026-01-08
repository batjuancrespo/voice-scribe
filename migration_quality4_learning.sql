-- Quality 4.0: Auto-Learning Database Schema
-- Migration: Add correction tracking and learning statistics

-- Table: correction_history
-- Stores every correction made by users for learning analysis
CREATE TABLE IF NOT EXISTS correction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    confidence FLOAT,
    applied BOOLEAN DEFAULT FALSE,
    auto_applied BOOLEAN DEFAULT FALSE,
    context_before TEXT,
    context_after TEXT,
    correction_type TEXT, -- 'word', 'phrase', 'punctuation'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: learning_stats
-- Aggregated statistics for frequent error patterns
CREATE TABLE IF NOT EXISTS learning_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    error_pattern TEXT NOT NULL,
    correction TEXT NOT NULL,
    frequency INT DEFAULT 1,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    auto_learned BOOLEAN DEFAULT FALSE,
    context_hints JSONB, -- Store common contexts where this appears
    UNIQUE(user_id, error_pattern, correction)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_correction_history_user ON correction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_correction_history_created ON correction_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_stats_user ON learning_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_stats_frequency ON learning_stats(user_id, frequency DESC);
CREATE INDEX IF NOT EXISTS idx_learning_stats_pattern ON learning_stats(error_pattern);

-- Enable Row Level Security
ALTER TABLE correction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own correction history"
    ON correction_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own corrections"
    ON correction_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own learning stats"
    ON learning_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
    ON learning_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
    ON learning_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- Function: Increment learning stats frequency
CREATE OR REPLACE FUNCTION increment_learning_stat(
    p_user_id UUID,
    p_error_pattern TEXT,
    p_correction TEXT,
    p_context JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO learning_stats (user_id, error_pattern, correction, frequency, context_hints)
    VALUES (p_user_id, p_error_pattern, p_correction, 1, p_context)
    ON CONFLICT (user_id, error_pattern, correction)
    DO UPDATE SET
        frequency = learning_stats.frequency + 1,
        last_seen = NOW(),
        context_hints = COALESCE(p_context, learning_stats.context_hints);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
