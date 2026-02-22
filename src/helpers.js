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

export const nextRecurrenceDate = (dateStr, recurrence) => {
  const d = new Date(dateStr + "T12:00:00");
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

export const dateAdd = (dateStr, days) => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
