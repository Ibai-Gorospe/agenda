-- Ejecuta esto en el SQL Editor de Supabase (una sola vez)

create table tasks (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  text text not null,
  time text,
  reminder text default '0',
  done boolean default false,
  created_at timestamp with time zone default now()
);

-- Seguridad: cada usuario solo ve sus propias tareas
alter table tasks enable row level security;

create policy "Users can manage their own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
