-- Ejecuta esto en el SQL Editor de Supabase (una sola vez)
-- Migracion: Añadir columna position para reordenar tareas

ALTER TABLE tasks ADD COLUMN position integer DEFAULT 0;

-- Rellenar posiciones existentes segun el orden actual (por hora)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, date
      ORDER BY COALESCE(time, '99:99'), created_at
    ) - 1 AS pos
  FROM tasks
)
UPDATE tasks
SET position = ranked.pos
FROM ranked
WHERE tasks.id = ranked.id;
