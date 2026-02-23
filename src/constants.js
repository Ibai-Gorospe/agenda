// ─── Categories ─────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: "personal", label: "Personal", color: "#6366f1", bg: "#eef2ff" },
  { id: "trabajo",  label: "Trabajo",  color: "#0891b2", bg: "#ecfeff" },
  { id: "salud",    label: "Salud",    color: "#16a34a", bg: "#f0fdf4" },
  { id: "estudio",  label: "Estudio",  color: "#d97706", bg: "#fffbeb" },
  { id: "hogar",    label: "Hogar",    color: "#e05252", bg: "#fef2f2" },
  { id: "gym",      label: "Entreno",  color: "#8b5cf6", bg: "#f5f3ff" },
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
  { value: "high", label: "Alta", color: "#e05252" },
  { value: "medium", label: "Media", color: "#f0b429" },
  { value: "low", label: "Baja", color: "#6366f1" },
];
export const getPriorityColor = (p) => PRIORITY_OPTIONS.find(o => o.value === p)?.color || null;

export const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
export const DAYS_ES = ["L","M","X","J","V","S","D"];
