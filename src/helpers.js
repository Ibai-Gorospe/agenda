import { MONTHS_SHORT } from "./constants";

export const pad = (n) => String(n).padStart(2, "0");

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDateLabel = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
};

export const isWeekend = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00").getDay();
  return d === 0 || d === 6;
};

export const getWeekStart = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatWeekRange = (startDateStr) => {
  const s = new Date(startDateStr + "T12:00:00");
  const e = new Date(s); e.setDate(e.getDate() + 6);
  const sD = s.getDate(), eD = e.getDate();
  const sM = MONTHS_SHORT[s.getMonth()], eM = MONTHS_SHORT[e.getMonth()];
  const sY = s.getFullYear(), eY = e.getFullYear();
  if (sY !== eY) return `${sD} ${sM} ${sY} — ${eD} ${eM} ${eY}`;
  if (s.getMonth() !== e.getMonth()) return `${sD} ${sM} — ${eD} ${eM} ${sY}`;
  return `${sD} — ${eD} ${sM} ${sY}`;
};

// ─── Recurrence helpers ─────────────────────────────────────────────────────

// Day labels: index = JS getDay() value (0=Sun, 1=Mon, ..., 6=Sat)
const DAY_LABELS_SHORT = ["D", "L", "M", "X", "J", "V", "S"];
const MONDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-first iteration order

// Convert any recurrence value → array of JS getDay() numbers
export const recurrenceToDays = (recurrence, dateStr) => {
  if (!recurrence) return [];
  if (recurrence === "daily") return [0, 1, 2, 3, 4, 5, 6];
  if (recurrence === "weekdays") return [1, 2, 3, 4, 5];
  if (recurrence === "weekly" && dateStr) return [new Date(dateStr + "T12:00:00").getDay()];
  if (recurrence.startsWith("days:")) {
    return recurrence.slice(5).split(",").map(Number).filter(n => n >= 0 && n <= 6);
  }
  return [];
};

// Convert array of selected day numbers → recurrence string
export const daysToRecurrence = (days) => {
  if (days.length === 0) return "";
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "daily";
  if (sorted.length === 5 && sorted.join(",") === "1,2,3,4,5") return "weekdays";
  return "days:" + sorted.join(",");
};

// Get human-readable label for any recurrence value
export const getRecurrenceLabel = (recurrence) => {
  if (!recurrence) return null;
  if (recurrence === "daily") return "Diaria";
  if (recurrence === "weekdays") return "L-V";
  if (recurrence === "weekly") return "Semanal";
  if (recurrence === "monthly") return "Mensual";
  if (recurrence.startsWith("days:")) {
    const days = new Set(recurrence.slice(5).split(",").map(Number));
    if (days.size === 7) return "Diaria";
    if (days.size === 5 && [1, 2, 3, 4, 5].every(d => days.has(d))) return "L-V";
    const sorted = MONDAY_ORDER.filter(d => days.has(d));
    return sorted.map(d => DAY_LABELS_SHORT[d]).join(", ");
  }
  return recurrence;
};

export const nextRecurrenceDate = (dateStr, recurrence) => {
  const d = new Date(dateStr + "T12:00:00");

  // New format: "days:1,3,5"
  if (recurrence.startsWith("days:")) {
    const targetDays = new Set(recurrence.slice(5).split(",").map(Number));
    if (targetDays.size === 0) return null;
    for (let i = 1; i <= 7; i++) {
      const next = new Date(d);
      next.setDate(next.getDate() + i);
      if (targetDays.has(next.getDay())) {
        return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
      }
    }
    return null;
  }

  // Legacy formats
  switch (recurrence) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekdays": {
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      break;
    }
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    default: return null;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const genId = () => {
  try { return crypto.randomUUID(); }
  catch { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  }); }
};

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const getWeekdayName = (dateStr) => WEEKDAY_NAMES[new Date(dateStr + "T12:00:00").getDay()];

export const dateAdd = (dateStr, days) => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
