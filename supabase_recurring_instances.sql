-- Ejecuta esto en el SQL Editor de Supabase (una sola vez)
-- Migracion: guardar serie y fecha prevista original de cada instancia recurrente

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS series_id text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date text;

UPDATE tasks
SET
  series_id = COALESCE(series_id, id),
  scheduled_date = COALESCE(scheduled_date, date)
WHERE series_id IS NULL OR scheduled_date IS NULL;

ALTER TABLE tasks ALTER COLUMN series_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN scheduled_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_user_series_scheduled_idx
  ON tasks (user_id, series_id, scheduled_date);
