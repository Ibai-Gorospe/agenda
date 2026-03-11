-- Ejecuta esto en el SQL Editor de Supabase (una sola vez)

create table tasks (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  text text not null,
  time text,
  reminder text default '0',
  done boolean default false,
  position integer default 0,
  category text,
  recurrence text,
  priority text,
  notes text,
  subtasks jsonb default '[]'::jsonb,
  rollover_mode text default 'carry',
  state text default 'open',
  series_id text not null,
  scheduled_date text not null,
  deleted_dates jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

-- Seguridad: cada usuario solo ve sus propias tareas
alter table tasks enable row level security;

create policy "Users can manage their own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
