# Agenda

PWA personal de tareas con calendario, soporte offline, seguimiento de peso y recordatorios.

## Resumen

Agenda esta pensada para uso diario desde movil o escritorio:

- Gestion de tareas por dia, semana, mes y ano
- Drag and drop para reordenar tareas
- Tareas recurrentes, prioridades, categorias, notas y subtareas
- Cola offline con sincronizacion al volver la conexion
- Busqueda global y estadisticas de productividad
- Seguimiento de peso con objetivo, grafica y metricas
- Autenticacion con Supabase y modo invitado
- PWA instalable con auto update
- Recordatorios en navegador y emails programados con Supabase Edge Functions

## Stack

| Capa | Tecnologia |
| --- | --- |
| UI | React 18 |
| Build | Vite 5 |
| PWA | `vite-plugin-pwa` |
| Backend | Supabase |
| Drag and drop | `@dnd-kit` |
| Testing | Vitest + Testing Library |
| Deploy | Vercel |

## Funcionalidades

### Tareas

- Crear, editar, duplicar, mover y eliminar tareas
- Reordenacion manual por drag and drop
- Prioridades `high`, `medium`, `low`
- Categorias predefinidas: personal, trabajo, salud, estudio, hogar y gym
- Subtareas y notas
- Checklist expandible en tarjeta con marcado inline de subtareas
- Filtro por categoria en vista diaria
- Busqueda global con `Ctrl + K`

### Recurrencia

- Diaria
- Laborables
- Dias personalizados
- Mensual
- Creacion automatica de la siguiente ocurrencia al completar
- Materializacion automatica de la ocurrencia de hoy aunque la de ayer siga pendiente
- Las tareas atrasadas movidas a hoy conservan su fecha prevista original
- Politica por tarea para decidir si una recurrencia perdida se arrastra o queda anclada a su fecha
- Estados de ocurrencia `open`, `done` y `skipped`

### Navegacion y vistas

- Vista de dia
- Vista semanal
- Vista mensual
- Vista anual
- Vista de peso
- Navegacion tactil en vista diaria
- Shortcut PWA `/?action=new-task`

### Offline y sincronizacion

- Cola en `localStorage`
- Las operaciones offline se sincronizan al recuperar la red
- Cobertura para crear, editar, completar, mover, reordenar y borrar

### Peso y estadisticas

- Registro diario de peso
- Objetivo de peso
- Grafica SVG con media movil
- Minimo, media, maximo, variacion semanal y mensual
- Estadisticas de tareas completadas, pendientes, racha y productividad por dia

### Notificaciones

- Recordatorios locales con Notification API
- Emails programados mediante una Edge Function

## Requisitos

- Node.js 18 o superior
- Un proyecto de Supabase
- Opcional: cuenta de Resend si quieres emails de recordatorio

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

Si PowerShell bloquea `npm`, usa `npm.cmd`.

### 2. Configurar variables de entorno del frontend

Copia `.env.example` a `.env` y rellena tus claves:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Crear tablas y politicas en Supabase

Ejecuta estos scripts en el SQL Editor de Supabase, en este orden:

1. `supabase_setup.sql`
   Crea la tabla `tasks` y activa RLS.
2. `supabase_migration.sql`
   Anade la columna `position` y recalcula el orden inicial.
3. `supabase_recurring_instances.sql`
   Anade `series_id` y `scheduled_date` para distinguir instancias recurrentes atrasadas de la tarea del dia actual.
4. `supabase_task_state_rollover.sql`
   Anade `state` y `rollover_mode` para separar tareas abiertas, hechas y omitidas, y definir si una recurrencia se arrastra o queda anclada.
5. `supabase_task_deleted_dates.sql`
   Anade `deleted_dates` para recordar ocurrencias recurrentes borradas y evitar que se regeneren solas.
6. `supabase_weight_logs.sql`
   Crea `weight_logs`.
7. `supabase_user_settings.sql`
   Crea `user_settings` para el objetivo de peso.
8. `supabase_email_notifications.sql`
   Crea `email_notification_log` para evitar duplicados en emails.

### 4. Desarrollo local

```bash
npm run dev
```

La app arranca con Vite en modo desarrollo.

## Scripts disponibles

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run test:run
```

## Tests

La suite actual cubre utilidades, hooks de navegacion y toasts, logica offline, vista de peso y estadisticas.

Ejecucion recomendada:

```bash
npm run test:run
```

## Edge Function de emails

La funcion esta en `supabase/functions/send-reminders/index.ts`.

Se apoya en estas variables de entorno dentro de Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`

La funcion:

- Busca tareas pendientes con recordatorio activo
- Resuelve recurrencias para hoy y para avisos de 1 dia antes sin duplicar instancias de una misma serie
- Evita duplicados usando `email_notification_log`
- Envia emails via Resend

## Estructura del proyecto

```text
src/
  App.jsx
  constants.js
  helpers.js
  main.jsx
  supabase.js
  theme.js
  api/
    notifications.js
    tasks.js
    weightLogs.js
  components/
    DayView.jsx
    LoginScreen.jsx
    MonthView.jsx
    MoveTaskPicker.jsx
    PendingTasksSelector.jsx
    SearchModal.jsx
    SortableTask.jsx
    SortableWorkoutTask.jsx
    StatsView.jsx
    TaskModal.jsx
    ToastContainer.jsx
    WeekView.jsx
    WeightView.jsx
    YearView.jsx
  hooks/
    useAuth.js
    useFocusTrap.js
    useKeyboardShortcuts.js
    useNavigation.js
    useOfflineQueue.js
    useSwipeNav.js
    useTaskManager.js
    useTheme.js
    useToast.js
  test/
    *.test.js
    *.test.jsx

supabase/
  functions/
    send-reminders/
      index.ts
```

## Flujo de datos

- `useAuth` gestiona sesion y modo invitado.
- `useTaskManager` concentra la logica de tareas, sincronizacion y cola offline.
- `tasks.js` y `weightLogs.js` encapsulan acceso a Supabase.
- `WeightView` y `StatsView` calculan metricas en cliente.
- `vite-plugin-pwa` genera `manifest.webmanifest` y service worker.

## Deploy

- `vercel.json` reescribe todas las rutas a `/` para soportar la SPA.
- `npm run build` genera `dist/`.
- La PWA se construye junto al bundle de Vite.

## Estado actual

Verificacion local mas reciente:

- `npm run test:run`: OK
- `npm run build`: OK
