-- ============================================================
-- Tabla de log de notificaciones por email
-- Rastrea qué avisos se han enviado para evitar duplicados.
-- Para tareas recurrentes, (task_id, notified_date) es único,
-- así cada ocurrencia recibe su propia notificación.
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

CREATE TABLE email_notification_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id text NOT NULL,
  notified_date text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(task_id, notified_date)
);

CREATE INDEX idx_email_notif_task_date ON email_notification_log(task_id, notified_date);

-- RLS activado sin policies = solo accesible via service_role (Edge Function).
ALTER TABLE email_notification_log ENABLE ROW LEVEL SECURITY;
