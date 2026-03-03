// ─── Categories ─────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: "personal", label: "Personal", color: "#5B7FD4", bg: "#EEF2FB" },
  { id: "trabajo",  label: "Trabajo",  color: "#3DA68A", bg: "#EAF7F3" },
  { id: "salud",    label: "Salud",    color: "#5AAD5E", bg: "#EDF7EE" },
  { id: "estudio",  label: "Estudio",  color: "#E07A3A", bg: "#FBF0E9" },
  { id: "hogar",    label: "Hogar",    color: "#C2536A", bg: "#FAE9ED" },
  { id: "gym",      label: "Entreno",  color: "#8B5CF6", bg: "#F2EEFF" },
];
export const GYM_ID = "gym";
export const getCat = (id) => CATEGORIES.find(c => c.id === id);

export const RECURRENCE_OPTIONS = [
  { value: "", label: "Sin repetir" },
  { value: "daily", label: "Cada día" },
  { value: "weekdays", label: "Lun — Vie" },
  { value: "weekly", label: "Cada semana" },
  { value: "monthly", label: "Cada mes" },
];
export const RECURRENCE_LABELS = { daily: "Diaria", weekdays: "L-V", weekly: "Semanal", monthly: "Mensual" };

export const PRIORITY_OPTIONS = [
  { value: "high", label: "Alta", color: "#EF4444" },
  { value: "medium", label: "Media", color: "#F59E0B" },
  { value: "low", label: "Baja", color: "#6366F1" },
];
export const getPriorityColor = (p) => PRIORITY_OPTIONS.find(o => o.value === p)?.color || null;

export const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
export const DAYS_ES = ["L","M","X","J","V","S","D"];
