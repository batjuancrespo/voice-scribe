-- Migration: Add variants support to template_fields
-- Run this in Supabase SQL Editor

ALTER TABLE template_fields 
ADD COLUMN IF NOT EXISTS variants TEXT[] DEFAULT '{}';

-- Allow NULLs? No, default to empty array is better.
-- But existing rows might need default. The DEFAULT clause handles new inserts.
-- Existing rows will get default value if we don't specify valid default for existing?
-- In Postgres adding column with default updates existing rows unless it's very old version.
