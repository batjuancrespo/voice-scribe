-- ============================================================
-- FIX: Reparar el guardado de correcciones en `vocabulary`
--
-- Sintoma: al aplicar/guardar una correccion, la app hace
--   upsert(vocabulary, on_conflict = user_id, original)
-- y Postgres responde 400 42P10:
--   "there is no unique or exclusion constraint matching the
--    ON CONFLICT specification"
-- porque la tabla nunca tuvo una UNIQUE (user_id, original).
--
-- Este script (orden OBLIGATORIO):
--   1) Diagnostico: muestra duplicados existentes
--   2) Elimina duplicados conservando la fila mas reciente
--   3) Crea la constraint UNIQUE que la app necesita
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

-- 1) Ver duplicados actuales (informativo)
SELECT user_id, original, COUNT(*) AS copias
FROM public.vocabulary
GROUP BY user_id, original
HAVING COUNT(*) > 1;

-- 2) Quedarse solo con la fila MAS RECENTE de cada (user_id, original)
DELETE FROM public.vocabulary
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, original
                   ORDER BY created_at DESC
               ) AS rn
        FROM public.vocabulary
    ) t
    WHERE rn > 1
);

-- 3) Crear la constraint que el upsert de la app necesita
ALTER TABLE public.vocabulary
    ADD CONSTRAINT vocabulary_user_id_original_unique
    UNIQUE (user_id, original);
