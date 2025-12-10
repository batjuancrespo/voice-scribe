-- Script to add category column to existing templates table
-- Run this in Supabase SQL Editor if you already have the table created

ALTER TABLE templates ADD COLUMN IF NOT EXISTS category text DEFAULT 'General';

-- Update existing templates to have a default category
UPDATE templates SET category = 'General' WHERE category IS NULL;
