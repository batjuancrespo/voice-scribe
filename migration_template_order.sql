-- Add display_order column to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS display_order BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()); 
-- Default to timestamp so existing templates have an order (roughly creation time)

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_templates_display_order ON templates(display_order);
