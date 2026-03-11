-- Ejecuta esto en el SQL Editor de Supabase (una sola vez)
-- Migracion: estado real de ocurrencia y politica de arrastre

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rollover_mode text DEFAULT 'carry';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS state text DEFAULT 'open';

UPDATE tasks
SET state = CASE
  WHEN done = true THEN 'done'
  ELSE 'open'
END
WHERE state IS NULL;

UPDATE tasks
SET rollover_mode = CASE
  WHEN category = 'gym' THEN 'anchor'
  ELSE 'carry'
END
WHERE rollover_mode IS NULL;

ALTER TABLE tasks ALTER COLUMN rollover_mode SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN state SET NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_user_state_rollover_idx
  ON tasks (user_id, state, rollover_mode);
