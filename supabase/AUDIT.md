# Supabase Audit

## Estado detectado en este repositorio

- El esquema operativo no esta versionado en `supabase/migrations`; hoy vive sobre todo en scripts SQL sueltos en la raiz:
  - `supabase_setup.sql`
  - `supabase_migration.sql`
  - `supabase_recurring_instances.sql`
  - `supabase_task_state_rollover.sql`
  - `supabase_task_deleted_dates.sql`
  - `supabase_weight_logs.sql`
  - `supabase_user_settings.sql`
  - `supabase_email_notifications.sql`
- Existe una migration baseline en `supabase/migrations/20260311040222_baseline_agenda_schema.sql`, pero esta vacia.
- `supabase/config.toml` apunta a `./seed.sql` y ese archivo no existia en el repo.
- No hay forma de verificar desde este repositorio si la baseline vacia ya fue registrada en remoto porque el CLI de Supabase no esta instalado en este entorno.

## Esquema real inferido desde el repo

### Tabla `tasks`

Fuente actual: `supabase_setup.sql` mas los scripts incrementales de recurrencias/estado/borrados.

Campos esperados por la app:

- `id text primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `date text not null`
- `text text not null`
- `time text`
- `reminder text default '0'`
- `done boolean default false`
- `position integer default 0`
- `category text`
- `recurrence text`
- `priority text`
- `notes text`
- `subtasks jsonb default '[]'::jsonb`
- `rollover_mode text default 'carry'`
- `state text default 'open'`
- `series_id text not null`
- `scheduled_date text not null`
- `deleted_dates jsonb default '[]'::jsonb`
- `created_at timestamptz default now()`

Indices incrementales detectados:

- `tasks_user_series_scheduled_idx`
- `tasks_user_state_rollover_idx`

RLS detectado:

- policy unica para que cada usuario gestione solo sus tareas.

### Tabla `weight_logs`

Fuente actual: `supabase_weight_logs.sql`.

- `id uuid default gen_random_uuid() primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `date text not null`
- `weight_kg numeric(5,2) not null`
- `created_at timestamptz default now()`
- `unique(user_id, date)`

### Tabla `user_settings`

Fuente actual: `supabase_user_settings.sql`.

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `weight_goal_kg numeric(5,2)`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Observacion: `updated_at` no tiene trigger de mantenimiento.

### Tabla `email_notification_log`

Fuente actual: `supabase_email_notifications.sql`.

- `id uuid default gen_random_uuid() primary key`
- `task_id text not null`
- `notified_date text not null`
- `sent_at timestamptz default now()`
- `unique(task_id, notified_date)`

RLS detectado:

- RLS activado sin policies, por lo que en la practica queda reservado a `service_role` para la Edge Function.

## Riesgos concretos

### Alto riesgo

- Rellenar o reescribir la baseline vacia sin confirmar antes el historial remoto puede dejar el repo y produccion desalineados.
- Seguir aplicando SQL manual fuera de `supabase/migrations` hace dificil saber que se ha ejecutado realmente en cada entorno.

### Riesgo medio

- La app y la Edge Function dependen de logica y columnas nuevas (`state`, `rollover_mode`, `series_id`, `scheduled_date`, `deleted_dates`) que hoy no tienen una cadena de versionado fiable.
- La logica de recurrencias esta duplicada entre cliente y Edge Function; cualquier cambio futuro puede divergir.

### Riesgo bajo

- `supabase/config.toml` referenciaba un seed inexistente.
- El esquema usa varios `text` donde seria mas robusto usar `date`, `time` y constraints, pero eso no debe tocarse en una fase segura sin plan de migracion de datos.

## Estrategia segura para dejar la BD bien versionada

1. Congelar el estado actual del repo.
2. Verificar el historial remoto antes de editar migrations:
   - Consultar `supabase_migrations.schema_migrations`.
   - Confirmar si `20260311040222_baseline_agenda_schema.sql` llego a ejecutarse en remoto.
3. Segun el resultado:
   - Si la baseline vacia nunca se aplico en remoto: reemplazarla por una baseline real y mover los SQL sueltos a migrations versionadas antes del primer despliegue con CLI.
   - Si la baseline vacia ya se aplico en remoto: no tocar ese archivo; crear una nueva migration de consolidacion no destructiva que recree exactamente el esquema faltante con `IF NOT EXISTS`, backfills e indices.
4. Una vez confirmado el punto anterior:
   - Mover cada script SQL suelto a `supabase/migrations` con timestamps ordenados o generar una migration consolidada mas una de limpieza.
   - Dejar el README y el flujo operativo basados en `supabase db push`/`db reset`, no en pegar SQL manualmente.
5. Solo despues de tener versionado estable:
   - Evaluar mejoras de esquema mas profundas como tipos `date/time`, constraints y indices adicionales.

## Cambios aplicados en esta fase

- No se ha tocado ninguna migration sensible ni se ha cambiado el esquema productivo.
- Se ha anadido `supabase/seed.sql` vacio para que la configuracion local no apunte a un archivo inexistente.
