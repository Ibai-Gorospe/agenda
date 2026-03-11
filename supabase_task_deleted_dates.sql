-- Ejecuta esto en el SQL Editor de Supabase (una sola vez)
-- Migracion: recordar ocurrencias recurrentes borradas para no recrearlas

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_dates jsonb DEFAULT '[]'::jsonb;

UPDATE tasks
SET deleted_dates = '[]'::jsonb
WHERE deleted_dates IS NULL;

ALTER TABLE tasks ALTER COLUMN deleted_dates SET NOT NULL;
