# Agenda

**Tu tiempo, tu orden** — PWA de gestion de tareas personal con soporte offline, vistas de calendario y seguimiento de peso.

## Funcionalidades

- **Tareas**: crear, editar, eliminar, duplicar, mover entre dias, subtareas, notas
- **Recurrencia**: diaria, L-V, dias personalizados, mensual (auto-crea la siguiente al completar)
- **Categorias**: Personal, Trabajo, Salud, Estudio, Hogar, Entreno (gym)
- **Prioridad**: Alta, Media, Baja con indicadores de color
- **Vistas**: Dia (con drag & drop), Semana, Mes, Ano, Peso
- **Busqueda global**: Ctrl+K
- **Modo oscuro**: toggle en header, respeta preferencia del sistema
- **Offline-first**: cola de operaciones en localStorage, sincroniza al volver online
- **Notificaciones**: recordatorios via Notification API del navegador + emails programados
- **Seguimiento de peso**: registro diario, grafico de 30 dias con media movil, objetivo
- **Estadisticas**: tareas completadas, racha, comparativa semanal, por categoria, mejor dia
- **PWA**: instalable como app, standalone mode, service worker con auto-update

## Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 |
| Build | Vite 5 + vite-plugin-pwa |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Drag & Drop | @dnd-kit |
| Despliegue | Vercel |

## Estructura del proyecto

```
src/
  App.jsx              # Componente raiz, estado y logica principal
  theme.js             # Design tokens con CSS custom properties (light/dark)
  constants.js         # Categorias, prioridades, meses/dias en espanol
  helpers.js           # Utilidades de fecha, recurrencia, IDs
  supabase.js          # Cliente Supabase
  api/
    tasks.js           # CRUD de tareas
    notifications.js   # Notificaciones del navegador
    weightLogs.js      # Registros de peso
  hooks/
    useOfflineQueue.js # Cola offline con localStorage
    useSwipeNav.js     # Navegacion por gestos tactiles
    useFocusTrap.js    # Trampa de foco para modales
  components/
    DayView.jsx        # Vista de dia con drag-drop y filtros
    WeekView.jsx       # Vista de semana
    MonthView.jsx      # Calendario mensual
    YearView.jsx       # Vista anual
    WeightView.jsx     # Seguimiento de peso con grafico SVG
    TaskModal.jsx      # Modal crear/editar tarea
    SearchModal.jsx    # Busqueda global
    StatsView.jsx      # Estadisticas
    LoginScreen.jsx    # Autenticacion
    ToastContainer.jsx # Notificaciones in-app
    ...
supabase/
  functions/
    send-reminders/    # Edge function para emails de recordatorio
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de produccion
npm run build

# Preview del build
npm run preview
```

### Variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Sistema de temas

Los colores se definen como CSS custom properties en `theme.js`. Los componentes usan `T.xxx` que resuelve a `var(--xxx)`, adaptandose automaticamente al modo claro/oscuro.

La preferencia se guarda en localStorage (`agenda-dark`) y respeta `prefers-color-scheme` del sistema como valor inicial.
