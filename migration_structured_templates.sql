-- Migration: Add structured templates support
-- Run this in Supabase SQL Editor

-- 1. Create template_fields table
CREATE TABLE IF NOT EXISTS template_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    default_text TEXT NOT NULL,
    section TEXT NOT NULL, -- 'TECNICA', 'HALLAZGOS', 'CONCLUSION', etc.
    display_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add template_type to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'simple';

-- 'simple' = texto plano actual (backward compatible)
-- 'structured' = nuevo sistema con fields

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_order ON template_fields(template_id, display_order);

-- 4. Enable RLS on template_fields
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for template_fields
CREATE POLICY "Users can view their own template fields"
    ON template_fields FOR SELECT
    USING (
        template_id IN (
            SELECT id FROM templates WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own template fields"
    ON template_fields FOR INSERT
    WITH CHECK (
        template_id IN (
            SELECT id FROM templates WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own template fields"
    ON template_fields FOR UPDATE
    USING (
        template_id IN (
            SELECT id FROM templates WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own template fields"
    ON template_fields FOR DELETE
    USING (
        template_id IN (
            SELECT id FROM templates WHERE user_id = auth.uid()
        )
    );

-- 6. Create example structured template (TC Abdomen)
-- This will be inserted via the app, but here's the structure as reference:
/*
INSERT INTO templates (name, category, template_type, user_id)
VALUES ('TC Abdomen Estructurado', 'TAC', 'structured', auth.uid())
RETURNING id;

-- Then insert fields with that template_id:
INSERT INTO template_fields (template_id, field_name, default_text, section, display_order) VALUES
(template_id, 'Hígado', 'de morfología, tamaño y densidad normales. Sin LOEs.', 'HALLAZGOS', 1),
(template_id, 'Vesícula biliar', 'sin alteraciones.', 'HALLAZGOS', 2),
(template_id, 'Vía biliar', 'sin dilatación.', 'HALLAZGOS', 3),
(template_id, 'Páncreas', 'de morfología y tamaño normales. Sin LOEs.', 'HALLAZGOS', 4),
(template_id, 'Bazo', 'de morfología y tamaño normales.', 'HALLAZGOS', 5),
(template_id, 'Riñones', 'de morfología y tamaño normales. Nefrograma simétrico.', 'HALLAZGOS', 6),
(template_id, 'Glándulas suprarrenales', 'sin alteraciones.', 'HALLAZGOS', 7),
(template_id, 'Aorta y grandes vasos', 'sin alteraciones significativas.', 'HALLAZGOS', 8),
(template_id, 'Adenopatías', 'no se observan adenopatías significativas.', 'HALLAZGOS', 9),
(template_id, 'Líquido libre', 'no se observa.', 'HALLAZGOS', 10);
*/
