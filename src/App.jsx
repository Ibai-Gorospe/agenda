import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "./supabase";

// ─── Theme: warm cream + golden yellow, light mode ───────────────────────────
const T = {
  // Backgrounds
  bg: "#faf7f0",
  bgPage: "#f5f0e8",
  bgCard: "#ffffff",
  bgCardWarm: "#fffdf5",
  bgModal: "#ffffff",

  // Yellows
  accent: "#f0b429",
  accentDark: "#d99a0d",
  accentLight: "#fef3c7",
  accentMid: "#fde68a",
  accentGrad: "linear-gradient(135deg, #f0b429 0%, #fbbf24 100%)",

  // Weekend color
  weekend: "#e07b54",
  weekendLight: "#fff1ec",
  weekendBorder: "rgba(224,123,84,.25)",

  // Text
  text: "#1c1a14",
  textSub: "#6b6248",
  textMuted: "#a89b7a",
  textOnAccent: "#ffffff",

  // Borders & shadows
  border: "rgba(240,180,41,.2)",
  borderGray: "rgba(0,0,0,.07)",
  shadow: "0 2px 12px rgba(0,0,0,.07)",
  shadowCard: "0 1px 4px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)",
  shadowFloat: "0 8px 32px rgba(0,0,0,.12)",

  // States
  done: "#a89b7a",
  doneBg: "#faf7f0",
  danger: "#e05252",

  // Font
  font: "'Georgia', 'Times New Roman', serif",
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Global styles injected once ─────────────────────────────────────────────
const GLOBAL_CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
  body { background: ${T.bgPage}; font-family: ${T.fontSans}; color: ${T.text}; overscroll-behavior: none; }
  input, textarea, select, button { font-family: inherit; }
  input[type="time"]::-webkit-calendar-picker-indicator { opacity: 0.5; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.accentMid}; border-radius: 2px; }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes checkPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.25); }
    100% { transform: scale(1); }
  }
  @keyframes toastIn {
    from { transform: translateY(-12px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes toastOut {
    from { opacity: 1; }
    to { opacity: 0; transform: translateY(-8px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .4; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .task-card { animation: slideUp .2s ease; }
  .modal-overlay { animation: fadeIn .15s ease; }
  .modal-sheet { animation: slideUp .25s cubic-bezier(.32,1,.23,1); }
  .check-pop { animation: checkPop .25s ease; }
  .toast-enter { animation: toastIn .25s ease; }
  .toast-exit { animation: toastOut .2s ease forwards; }

  button:active { opacity: .85; transform: scale(.98); transition: transform .1s; }
  button:focus-visible { outline: 2px solid #f0b429; outline-offset: 2px; }
  input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid #f0b429; outline-offset: 1px; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const formatDateLabel = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
};
const isWeekend = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00").getDay();
  return d === 0 || d === 6;
};
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DAYS_ES = ["L","M","X","J","V","S","D"];

const getWeekStart = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatWeekRange = (startDateStr) => {
  const s = new Date(startDateStr + "T12:00:00");
  const e = new Date(s); e.setDate(e.getDate() + 6);
  const sD = s.getDate(), eD = e.getDate();
  const sM = MONTHS_SHORT[s.getMonth()], eM = MONTHS_SHORT[e.getMonth()];
  const sY = s.getFullYear(), eY = e.getFullYear();
  if (sY !== eY) return `${sD} ${sM} ${sY} — ${eD} ${eM} ${eY}`;
  if (s.getMonth() !== e.getMonth()) return `${sD} ${sM} — ${eD} ${eM} ${sY}`;
  return `${sD} — ${eD} ${sM} ${sY}`;
};

// ─── Categories ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "personal", label: "Personal", color: "#6366f1", bg: "#eef2ff" },
  { id: "trabajo",  label: "Trabajo",  color: "#0891b2", bg: "#ecfeff" },
  { id: "salud",    label: "Salud",    color: "#16a34a", bg: "#f0fdf4" },
  { id: "estudio",  label: "Estudio",  color: "#d97706", bg: "#fffbeb" },
  { id: "hogar",    label: "Hogar",    color: "#e05252", bg: "#fef2f2" },
];
const getCat = (id) => CATEGORIES.find(c => c.id === id);

const RECURRENCE_OPTIONS = [
  { value: "", label: "Sin repetir" },
  { value: "daily", label: "Cada día" },
  { value: "weekdays", label: "Lun — Vie" },
  { value: "weekly", label: "Cada semana" },
  { value: "monthly", label: "Cada mes" },
];
const RECURRENCE_LABELS = { daily: "Diaria", weekdays: "L-V", weekly: "Semanal", monthly: "Mensual" };

const nextRecurrenceDate = (dateStr, recurrence) => {
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

// ─── UUID fallback ──────────────────────────────────────────────────────────
const genId = () => {
  try { return crypto.randomUUID(); }
  catch { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  }); }
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchTasks(userId) {
  const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId);
  if (error) throw new Error("Error al cargar tareas");
  const map = {};
  for (const t of data) {
    if (!map[t.date]) map[t.date] = [];
    map[t.date].push({ id: t.id, text: t.text, time: t.time, reminder: t.reminder, done: t.done, position: t.position ?? 0, category: t.category || null, recurrence: t.recurrence || null });
  }
  return map;
}
async function upsertTask(userId, date, task) {
  const { error } = await supabase.from("tasks").upsert({
    id: task.id, user_id: userId, date,
    text: task.text, time: task.time || null,
    reminder: task.reminder || "0", done: task.done,
    position: task.position ?? 0,
    category: task.category || null,
    recurrence: task.recurrence || null,
  });
  if (error) throw new Error("Error al guardar tarea");
}
async function deleteTaskDB(taskId) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error("Error al eliminar tarea");
}

// ─── Weight log helpers ─────────────────────────────────────────────────────
async function fetchWeightLogs(userId) {
  const { data, error } = await supabase
    .from("weight_logs").select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw new Error("Error al cargar registros de peso");
  return data.map(l => ({ id: l.id, date: l.date, weight_kg: Number(l.weight_kg) }));
}
async function upsertWeightLog(userId, date, weightKg) {
  const { error } = await supabase.from("weight_logs").upsert(
    { user_id: userId, date, weight_kg: weightKg },
    { onConflict: "user_id,date" }
  );
  if (error) throw new Error("Error al guardar peso");
}

// ─── Notifications ────────────────────────────────────────────────────────────
const supportsNotif = typeof window !== "undefined" && "Notification" in window;
function scheduleNotification(task, dateStr) {
  if (!task.time || !task.reminder || task.reminder === "0" || !supportsNotif) return;
  if (Notification.permission !== "granted") return;
  const [h, m] = task.time.split(":").map(Number);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const delay = new Date(y, mo - 1, d, h, m).getTime() - task.reminder * 60000 - Date.now();
  if (delay > 0) setTimeout(() => new Notification(`⏰ ${task.text}`, { body: `Hoy a las ${task.time}` }), delay);
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────
function Badge({ children, color = T.accent, bg = T.accentLight }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "20px",
      background: bg, color, fontSize: ".72rem", fontWeight: 600, letterSpacing: ".03em",
    }}>{children}</span>
  );
}

function Pill({ children, active, onClick, weekend }) {
  return (
    <button onClick={onClick} style={{
      padding: ".45rem .9rem", borderRadius: "20px", border: "none", cursor: "pointer",
      background: active ? (weekend ? T.weekend : T.accent) : "transparent",
      color: active ? T.textOnAccent : (weekend ? T.weekend : T.textSub),
      fontWeight: active ? 600 : 400, fontSize: ".85rem", transition: "all .15s",
    }}>{children}</button>
  );
}

// ─── Toast container ─────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position: "fixed", top: "env(safe-area-inset-top, 12px)", left: 0, right: 0,
      zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center",
      gap: ".5rem", padding: ".75rem 1rem", pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} className={t.exiting ? "toast-exit" : "toast-enter"} style={{
          background: t.type === "error" ? "#fef2f2" : t.type === "success" ? "#f0fdf4" : T.accentLight,
          border: `1.5px solid ${t.type === "error" ? "rgba(224,82,82,.25)" : t.type === "success" ? "rgba(74,186,106,.25)" : T.border}`,
          borderRadius: "14px", padding: ".7rem 1rem", maxWidth: "400px", width: "100%",
          boxShadow: "0 4px 20px rgba(0,0,0,.12)", pointerEvents: "auto",
          display: "flex", alignItems: "center", gap: ".6rem",
        }}>
          <span style={{ fontSize: ".9rem", flexShrink: 0 }}>
            {t.type === "error" ? "!" : t.type === "success" ? "\u2713" : "\u24D8"}
          </span>
          <span style={{
            flex: 1, fontSize: ".84rem", lineHeight: 1.3,
            color: t.type === "error" ? "#991b1b" : t.type === "success" ? "#166534" : T.textSub,
          }}>{t.message}</span>
          {t.action && (
            <button onClick={t.action.fn} style={{
              background: t.type === "error" ? "rgba(224,82,82,.12)" : T.accentLight,
              border: "none", borderRadius: "8px", padding: ".35rem .65rem",
              color: t.type === "error" ? T.danger : T.accentDark,
              fontWeight: 700, fontSize: ".78rem", cursor: "pointer", flexShrink: 0,
            }}>{t.action.label}</button>
          )}
          <button onClick={() => onDismiss(t.id)} aria-label="Cerrar" style={{
            background: "none", border: "none", color: T.textMuted,
            cursor: "pointer", fontSize: ".9rem", padding: "2px", flexShrink: 0,
          }}>\u2715</button>
        </div>
      ))}
    </div>
  );
}

// ─── Search modal ────────────────────────────────────────────────────────────
function SearchModal({ tasks, onSelectTask, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const matches = [];
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      dayTasks.forEach(task => {
        if (task.text.toLowerCase().includes(q)) {
          matches.push({ date, task });
        }
      });
    });
    matches.sort((a, b) => b.date.localeCompare(a.date));
    return matches.slice(0, 20);
  }, [query, tasks]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "15vh",
    }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{
        background: T.bgModal, borderRadius: "20px",
        padding: "1.25rem", width: "100%", maxWidth: "440px",
        boxShadow: T.shadowFloat, maxHeight: "60vh", display: "flex", flexDirection: "column",
        margin: "0 1rem",
      }}>
        <div style={{ position: "relative", marginBottom: ".75rem" }}>
          <input ref={inputRef} type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar tareas..."
            style={{
              width: "100%", padding: ".8rem 1rem .8rem 2.4rem",
              background: T.bg, border: `1.5px solid ${T.borderGray}`,
              borderRadius: "12px", color: T.text, fontSize: "1rem", outline: "none",
            }} />
          <span style={{
            position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)",
            color: T.textMuted, fontSize: ".9rem", pointerEvents: "none",
          }}>{"\uD83D\uDD0D"}</span>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {query.trim() && results.length === 0 && (
            <p style={{ color: T.textMuted, fontSize: ".88rem", textAlign: "center", padding: "1.5rem 0" }}>
              Sin resultados para "{query}"
            </p>
          )}
          {results.map(({ date, task }) => (
            <button key={task.id} onClick={() => { onSelectTask(date); onClose(); }}
              style={{
                width: "100%", textAlign: "left", padding: ".7rem .85rem",
                background: "transparent", border: "none", borderBottom: `1px solid ${T.borderGray}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: ".6rem",
              }}>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                background: task.done ? T.textMuted : T.accent,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: ".88rem", color: task.done ? T.textMuted : T.text,
                  textDecoration: task.done ? "line-through" : "none",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{task.text}</p>
                <p style={{ margin: 0, fontSize: ".72rem", color: T.textMuted }}>
                  {formatDateLabel(date).split(",").slice(0, 2).join(",")}
                  {task.time ? ` · ${task.time}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) { setError("Rellena todos los campos"); return; }
    setLoading(true); setError("");
    if (mode === "login") {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) { setError("Email o contraseña incorrectos"); setLoading(false); return; }
      onLogin(data.user);
    } else {
      const { data, error: e } = await supabase.auth.signUp({ email, password });
      if (e) { setError(e.message); setLoading(false); return; }
      onLogin(data.user);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: ".85rem 1rem", marginBottom: ".85rem",
    background: T.bg, border: `1.5px solid ${T.borderGray}`,
    borderRadius: "12px", color: T.text, fontSize: "1rem", outline: "none",
    transition: "border-color .15s",
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: `linear-gradient(160deg, #fef9ec 0%, #fdf3d0 50%, #fef6e4 100%)`,
      padding: "2rem",
    }}>
      {/* Logo area */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "22px",
          background: T.accentGrad, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 1rem",
          boxShadow: "0 8px 24px rgba(240,180,41,.35)",
        }}>
          <span style={{ fontSize: "2rem" }}>📅</span>
        </div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 700, color: T.text, fontFamily: T.font, margin: 0 }}>Agenda</h1>
        <p style={{ color: T.textMuted, fontSize: ".88rem", marginTop: ".3rem" }}>Tu tiempo, tu orden</p>
      </div>

      {/* Card */}
      <div style={{
        background: T.bgCard, borderRadius: "24px", padding: "2rem",
        width: "100%", maxWidth: "380px",
        boxShadow: "0 4px 32px rgba(0,0,0,.1)",
      }}>
        {/* Tabs */}
        <div style={{
          display: "flex", background: T.bg, borderRadius: "12px",
          padding: "4px", marginBottom: "1.5rem", gap: "4px",
        }}>
          {["login", "registro"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: ".55rem", borderRadius: "9px", border: "none", cursor: "pointer",
              background: mode === m ? T.bgCard : "transparent",
              color: mode === m ? T.text : T.textMuted,
              fontWeight: mode === m ? 600 : 400, fontSize: ".9rem",
              boxShadow: mode === m ? T.shadowCard : "none",
              transition: "all .2s",
            }}>{m === "login" ? "Iniciar sesión" : "Registro"}</button>
          ))}
        </div>

        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          style={inputStyle} />
        <input type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          style={{ ...inputStyle, marginBottom: error ? ".5rem" : "1.2rem" }} />

        {error && <p style={{ color: T.danger, fontSize: ".83rem", marginBottom: ".8rem", textAlign: "center" }}>{error}</p>}

        <button onClick={submit} disabled={loading} style={{
          width: "100%", padding: ".9rem", background: T.accentGrad,
          border: "none", borderRadius: "12px", color: T.textOnAccent,
          fontWeight: 700, fontSize: "1rem", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(240,180,41,.4)", opacity: loading ? .75 : 1,
          transition: "opacity .15s",
        }}>{loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}</button>

        <div style={{ textAlign: "center", marginTop: "1.4rem" }}>
          <div style={{ height: "1px", background: T.borderGray, marginBottom: "1.2rem" }} />
          <button onClick={() => onLogin({ id: "guest", email: "invitado", guest: true })} style={{
            background: "none", border: `1.5px solid ${T.borderGray}`,
            borderRadius: "12px", color: T.textSub, padding: ".75rem 1.5rem",
            width: "100%", cursor: "pointer", fontSize: ".9rem", fontWeight: 500,
          }}>Continuar sin cuenta</button>
          <p style={{ color: T.textMuted, fontSize: ".75rem", marginTop: ".5rem" }}>
            Las tareas no se guardarán entre sesiones
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── TaskModal ────────────────────────────────────────────────────────────────
function TaskModal({ date, task, onSave, onClose }) {
  const [text, setText] = useState(task?.text || "");
  const [time, setTime] = useState(task?.time || "");
  const [reminder, setReminder] = useState(task?.reminder || "15");
  const [category, setCategory] = useState(task?.category || null);
  const [recurrence, setRecurrence] = useState(task?.recurrence || "");
  const weekend = isWeekend(date);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const save = () => {
    if (!text.trim()) return;
    onSave({ ...task, text: text.trim(), time, reminder, category: category || null, recurrence: recurrence || null, done: task?.done || false, position: task?.position ?? 0, id: task?.id || genId() });
    onClose();
  };

  const inputStyle = {
    width: "100%", padding: ".8rem 1rem",
    background: T.bg, border: `1.5px solid ${T.borderGray}`,
    borderRadius: "12px", color: T.text, fontSize: "1rem", outline: "none",
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{
        background: T.bgModal, borderRadius: "24px 24px 0 0",
        padding: "1.5rem 1.5rem 2.5rem", width: "100%", maxWidth: "500px",
        boxShadow: T.shadowFloat,
      }}>
        {/* Handle */}
        <div style={{ width: "36px", height: "4px", background: T.borderGray,
          borderRadius: "2px", margin: "0 auto 1.2rem" }} />

        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.2rem",
          color: weekend ? T.weekend : T.accent }}>
          {task?.id ? "Editar tarea" : "Nueva tarea"} · {formatDateLabel(date).split(",")[0]}
        </h3>

        <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }}
          placeholder="¿Qué tienes que hacer?" rows={3}
          aria-label="Descripción de la tarea"
          style={{ ...inputStyle, resize: "none", marginBottom: "1rem", fontFamily: "inherit" }} />

        <div style={{ display: "flex", gap: ".75rem", marginBottom: "1.2rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600,
              color: T.textSub, marginBottom: ".35rem" }}>Hora</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600,
              color: T.textSub, marginBottom: ".35rem" }}>Aviso</label>
            <select value={reminder} onChange={e => setReminder(e.target.value)}
              style={{ ...inputStyle, background: T.bg }}>
              <option value="0">Sin aviso</option>
              <option value="5">5 min antes</option>
              <option value="15">15 min antes</option>
              <option value="30">30 min antes</option>
              <option value="60">1 hora antes</option>
              <option value="120">2 horas antes</option>
              <option value="1440">1 día antes</option>
            </select>
          </div>
        </div>

        {/* Category selector */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600,
            color: T.textSub, marginBottom: ".4rem" }}>Categoría</label>
          <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
            <button onClick={() => setCategory(null)} style={{
              padding: ".35rem .7rem", borderRadius: "20px", fontSize: ".78rem", fontWeight: 600,
              cursor: "pointer", transition: "all .15s",
              background: !category ? T.bgPage : "transparent",
              border: `1.5px solid ${!category ? T.accent : T.borderGray}`,
              color: !category ? T.text : T.textMuted,
            }}>Ninguna</button>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)} style={{
                padding: ".35rem .7rem", borderRadius: "20px", fontSize: ".78rem", fontWeight: 600,
                cursor: "pointer", transition: "all .15s",
                background: category === c.id ? c.bg : "transparent",
                border: `1.5px solid ${category === c.id ? c.color : T.borderGray}`,
                color: category === c.id ? c.color : T.textMuted,
              }}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* Recurrence selector */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600,
            color: T.textSub, marginBottom: ".35rem" }}>Repetir</label>
          <select value={recurrence} onChange={e => setRecurrence(e.target.value)}
            style={{ ...inputStyle, background: T.bg }}>
            {RECURRENCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: ".75rem" }}>
          <button onClick={onClose} style={{
            flex: 1, padding: ".85rem", background: T.bg,
            border: "none", borderRadius: "12px", color: T.textSub,
            fontWeight: 600, fontSize: ".95rem", cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={save} style={{
            flex: 2, padding: ".85rem", background: weekend
              ? `linear-gradient(135deg, ${T.weekend}, #f09060)`
              : T.accentGrad,
            border: "none", borderRadius: "12px", color: T.textOnAccent,
            fontWeight: 700, fontSize: ".95rem", cursor: "pointer",
            boxShadow: weekend ? "0 4px 16px rgba(224,123,84,.35)" : "0 4px 16px rgba(240,180,41,.35)",
          }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MoveTaskPicker ──────────────────────────────────────────────────────────
function MoveTaskPicker({ currentDate, onMove, onClose }) {
  const [targetDate, setTargetDate] = useState(currentDate);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{
        background: T.bgModal, borderRadius: "24px 24px 0 0",
        padding: "1.5rem 1.5rem 2.5rem", width: "100%", maxWidth: "500px",
        boxShadow: T.shadowFloat,
      }}>
        <div style={{ width: "36px", height: "4px", background: T.borderGray,
          borderRadius: "2px", margin: "0 auto 1.2rem" }} />
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.2rem",
          color: T.accent }}>Mover tarea</h3>
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
          style={{
            width: "100%", padding: ".8rem 1rem", background: T.bg,
            border: `1.5px solid ${T.borderGray}`, borderRadius: "12px",
            color: T.text, fontSize: "1rem", outline: "none",
          }} />
        <div style={{ display: "flex", gap: ".75rem", marginTop: "1rem" }}>
          <button onClick={onClose} style={{
            flex: 1, padding: ".85rem", background: T.bg, border: "none",
            borderRadius: "12px", color: T.textSub, fontWeight: 600,
            fontSize: ".95rem", cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={() => { onMove(targetDate); onClose(); }} style={{
            flex: 2, padding: ".85rem", background: T.accentGrad, border: "none",
            borderRadius: "12px", color: T.textOnAccent, fontWeight: 700,
            fontSize: ".95rem", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(240,180,41,.35)",
          }}>Mover</button>
        </div>
      </div>
    </div>
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────
function DayView({ date, tasks, onAddTask, onToggle, onEdit, onDelete, onMoveTask, onReorder,
                   pendingPastCount, onMovePendingToToday, onDismissPending, showPendingBanner }) {
  const dayTasks = [...(tasks[date] || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const isToday = date === todayStr();
  const weekend = isWeekend(date);
  const pending = dayTasks.filter(t => !t.done).length;
  const done = dayTasks.filter(t => t.done).length;

  // ── Drag & drop state ──
  const dragRef = useRef({ active: false, id: null, startY: 0, currentY: 0, timer: null, el: null });
  const listRef = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  const handleTouchStart = (e, taskId) => {
    const touch = e.touches[0];
    const el = e.currentTarget;
    dragRef.current.timer = setTimeout(() => {
      dragRef.current = { active: true, id: taskId, startY: touch.clientY, currentY: touch.clientY, el };
      setDragId(taskId);
      setDragOffset(0);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 200);
    dragRef.current.startY = touch.clientY;
  };

  const handleTouchMove = (e) => {
    if (dragRef.current.timer && Math.abs(e.touches[0].clientY - dragRef.current.startY) > 10) {
      clearTimeout(dragRef.current.timer);
      dragRef.current.timer = null;
    }
    if (!dragRef.current.active) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    dragRef.current.currentY = y;
    setDragOffset(y - dragRef.current.startY);
  };

  const handleTouchEnd = () => {
    if (dragRef.current.timer) { clearTimeout(dragRef.current.timer); dragRef.current.timer = null; }
    if (!dragRef.current.active) return;
    // Calculate new index based on offset
    const cards = listRef.current?.children;
    if (cards) {
      const oldIdx = dayTasks.findIndex(t => t.id === dragRef.current.id);
      let newIdx = oldIdx;
      const cardH = cards[0]?.offsetHeight + 10 || 70;
      const moved = Math.round(dragOffset / cardH);
      newIdx = Math.max(0, Math.min(dayTasks.length - 1, oldIdx + moved));
      if (newIdx !== oldIdx) {
        const reordered = [...dayTasks];
        const [item] = reordered.splice(oldIdx, 1);
        reordered.splice(newIdx, 0, item);
        onReorder(date, reordered);
      }
    }
    dragRef.current = { active: false, id: null, startY: 0, currentY: 0, timer: null, el: null };
    setDragId(null);
    setDragOffset(0);
  };

  // Mouse drag support
  const handleMouseDown = (e, taskId) => {
    if (e.button !== 0) return;
    const startY = e.clientY;
    dragRef.current = { active: true, id: taskId, startY, currentY: startY, timer: null, el: e.currentTarget };
    setDragId(taskId);
    setDragOffset(0);

    const onMouseMove = (ev) => {
      ev.preventDefault();
      setDragOffset(ev.clientY - startY);
      dragRef.current.currentY = ev.clientY;
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      // reuse touch end logic
      const cards = listRef.current?.children;
      if (cards) {
        const oldIdx = dayTasks.findIndex(t => t.id === dragRef.current.id);
        const cardH = cards[0]?.offsetHeight + 10 || 70;
        const moved = Math.round((dragRef.current.currentY - startY) / cardH);
        const newIdx = Math.max(0, Math.min(dayTasks.length - 1, oldIdx + moved));
        if (newIdx !== oldIdx) {
          const reordered = [...dayTasks];
          const [item] = reordered.splice(oldIdx, 1);
          reordered.splice(newIdx, 0, item);
          onReorder(date, reordered);
        }
      }
      dragRef.current = { active: false, id: null, startY: 0, currentY: 0, timer: null, el: null };
      setDragId(null);
      setDragOffset(0);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}
      onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Day header card */}
      <div style={{
        background: weekend
          ? `linear-gradient(135deg, ${T.weekend} 0%, #f09060 100%)`
          : T.accentGrad,
        borderRadius: "20px", padding: "1.25rem 1.5rem",
        marginBottom: "1.25rem",
        boxShadow: weekend
          ? "0 4px 20px rgba(224,123,84,.3)"
          : "0 4px 20px rgba(240,180,41,.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {isToday && (
              <span style={{
                display: "inline-block", background: "rgba(255,255,255,.3)",
                color: "#fff", fontSize: ".72rem", fontWeight: 700,
                padding: "2px 10px", borderRadius: "20px", marginBottom: ".4rem",
                letterSpacing: ".06em",
              }}>HOY</span>
            )}
            {weekend && !isToday && (
              <span style={{
                display: "inline-block", background: "rgba(255,255,255,.25)",
                color: "#fff", fontSize: ".72rem", fontWeight: 700,
                padding: "2px 10px", borderRadius: "20px", marginBottom: ".4rem",
                letterSpacing: ".06em",
              }}>FIN DE SEMANA</span>
            )}
            <h2 style={{
              color: "#fff", fontSize: "1.35rem", fontWeight: 700,
              textTransform: "capitalize", lineHeight: 1.2,
              fontFamily: T.font, margin: 0,
            }}>{formatDateLabel(date)}</h2>
          </div>
          {dayTasks.length > 0 && (
            <div style={{ textAlign: "right" }}>
              {pending > 0 && <div style={{ color: "rgba(255,255,255,.9)", fontSize: ".82rem", fontWeight: 600 }}>{pending} pendiente{pending > 1 ? "s" : ""}</div>}
              {done > 0 && <div style={{ color: "rgba(255,255,255,.65)", fontSize: ".78rem" }}>{done} completada{done > 1 ? "s" : ""}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Pending tasks from past days banner */}
      {showPendingBanner && pendingPastCount > 0 && (
        <div className="task-card" style={{
          background: T.accentLight,
          border: `1.5px solid ${T.border}`,
          borderRadius: "14px",
          padding: ".85rem 1rem",
          marginBottom: "1rem",
        }}>
          <p style={{ color: T.textSub, fontSize: ".88rem", margin: "0 0 .6rem", lineHeight: 1.4 }}>
            Tienes <strong style={{ color: T.accentDark }}>{pendingPastCount}</strong> tarea{pendingPastCount > 1 ? "s" : ""} pendiente{pendingPastCount > 1 ? "s" : ""} de días anteriores
          </p>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button onClick={onMovePendingToToday} style={{
              flex: 1, padding: ".55rem .8rem", background: T.accentGrad,
              border: "none", borderRadius: "10px", color: T.textOnAccent,
              fontWeight: 600, fontSize: ".82rem", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(240,180,41,.3)",
            }}>Mover a hoy</button>
            <button onClick={onDismissPending} style={{
              flex: 1, padding: ".55rem .8rem", background: T.bg,
              border: `1.5px solid ${T.borderGray}`, borderRadius: "10px",
              color: T.textSub, fontWeight: 600, fontSize: ".82rem", cursor: "pointer",
            }}>Ignorar</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {dayTasks.length === 0 && (
        <div style={{
          textAlign: "center", padding: "3rem 1rem",
          background: T.bgCard, borderRadius: "16px",
          boxShadow: T.shadowCard, marginBottom: "1rem",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: ".6rem" }}>
            {weekend ? "☀️" : "✨"}
          </div>
          <p style={{ color: T.textMuted, fontSize: ".9rem" }}>
            {weekend ? "Día libre, sin tareas" : "Sin tareas para este día"}
          </p>
        </div>
      )}

      {/* Task list */}
      <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: ".65rem", marginBottom: "1rem" }}>
        {dayTasks.map(task => {
          const isDragging = dragId === task.id;
          return (
            <div key={task.id} className={isDragging ? "" : "task-card"} style={{
              background: task.done ? T.doneBg : T.bgCard,
              border: `1.5px solid ${isDragging ? T.accent : T.borderGray}`,
              borderRadius: "16px", padding: ".85rem 1rem",
              display: "flex", alignItems: "flex-start", gap: ".7rem",
              boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,.15)" : (task.done ? "none" : T.shadowCard),
              transition: isDragging ? "none" : "all .2s",
              transform: isDragging ? `translateY(${dragOffset}px)` : "none",
              zIndex: isDragging ? 50 : 1,
              position: "relative",
              opacity: isDragging ? .9 : 1,
            }}>
              {/* Drag handle */}
              <div
                onTouchStart={e => handleTouchStart(e, task.id)}
                onMouseDown={e => handleMouseDown(e, task.id)}
                style={{
                  width: "28px", minHeight: "36px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "grab", touchAction: "none", color: T.textMuted,
                  fontSize: "1rem", userSelect: "none",
                }}>⋮⋮</div>

              {/* Checkbox — 36x36 touch target */}
              <button onClick={() => onToggle(date, task.id)} aria-label={task.done ? "Marcar como pendiente" : "Marcar como completada"} style={{
                width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                border: `2.5px solid ${task.done ? T.accent : T.borderGray}`,
                background: task.done ? T.accentGrad : "transparent",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", transition: "all .15s",
              }}>
                {task.done && <span style={{ color: "#fff", fontSize: ".85rem", fontWeight: 800 }}>✓</span>}
              </button>

              {/* Text — tap to toggle */}
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                onClick={() => onToggle(date, task.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                  {task.category && (() => { const c = getCat(task.category); return c ? (
                    <span style={{
                      width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                      background: task.done ? T.textMuted : c.color,
                    }} />
                  ) : null; })()}
                  <p style={{
                    color: task.done ? T.textMuted : T.text,
                    textDecoration: task.done ? "line-through" : "none",
                    fontSize: ".97rem", lineHeight: 1.4, wordBreak: "break-word",
                    margin: 0, flex: 1,
                  }}>{task.text}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".35rem", flexWrap: "wrap" }}>
                  {task.category && (() => { const c = getCat(task.category); return c ? (
                    <Badge color={task.done ? T.textMuted : c.color} bg={task.done ? T.doneBg : c.bg}>
                      {c.label}
                    </Badge>
                  ) : null; })()}
                  {task.recurrence && (
                    <Badge color={task.done ? T.textMuted : (weekend ? T.weekend : T.accentDark)}
                      bg={task.done ? T.doneBg : (weekend ? T.weekendLight : T.accentLight)}>
                      {"🔄 "}{RECURRENCE_LABELS[task.recurrence] || task.recurrence}
                    </Badge>
                  )}
                  {task.time && (<>
                    <span style={{ fontSize: ".75rem" }}>🕐</span>
                    <span style={{
                      color: task.done ? T.textMuted : (weekend ? T.weekend : T.accent),
                      fontSize: ".8rem", fontWeight: 600,
                    }}>{task.time}</span>
                  </>)}
                  {task.time && task.reminder && task.reminder !== "0" && (
                    <Badge color={weekend ? T.weekend : T.accentDark}
                      bg={weekend ? T.weekendLight : T.accentLight}>
                      {task.reminder >= 60 ? `${task.reminder / 60}h antes` : `${task.reminder}min antes`}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action buttons — 36x36 each */}
              <div style={{ display: "flex", gap: ".2rem", flexShrink: 0, alignItems: "flex-start" }}>
                <button onClick={() => onMoveTask(date, task)} aria-label="Mover tarea" style={{
                  width: "36px", height: "36px", background: T.bg, border: "none",
                  borderRadius: "10px", color: T.textMuted, cursor: "pointer",
                  fontSize: "1.05rem", display: "flex", alignItems: "center", justifyContent: "center",
                }}>📅</button>
                <button onClick={() => onEdit(date, task)} aria-label="Editar tarea" style={{
                  width: "36px", height: "36px", background: T.bg, border: "none",
                  borderRadius: "10px", color: T.textMuted, cursor: "pointer",
                  fontSize: "1.05rem", display: "flex", alignItems: "center", justifyContent: "center",
                }}>✏️</button>
                <button onClick={() => onDelete(date, task.id)} aria-label="Eliminar tarea" style={{
                  width: "36px", height: "36px", background: T.bg, border: "none",
                  borderRadius: "10px", color: T.textMuted, cursor: "pointer",
                  fontSize: "1.05rem", display: "flex", alignItems: "center", justifyContent: "center",
                }}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <button onClick={onAddTask} style={{
        width: "100%", padding: "1rem",
        background: T.bgCard,
        border: `2px dashed ${weekend ? T.weekendBorder : T.border}`,
        borderRadius: "16px",
        color: weekend ? T.weekend : T.accent,
        fontWeight: 600, fontSize: ".95rem", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
      }}>
        <span style={{ fontSize: "1.1rem" }}>+</span> Añadir tarea
      </button>
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────
function MonthView({ year, month, tasks, onSelectDay, today }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div style={{ padding: "1rem" }}>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: ".5rem" }}>
        {DAYS_ES.map((d, i) => (
          <div key={d} style={{
            textAlign: "center", fontSize: ".72rem", fontWeight: 700,
            padding: ".4rem 0", letterSpacing: ".06em",
            color: i >= 5 ? T.weekend : T.textMuted,
          }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
          const dayTasks = tasks[dateStr] || [];
          const pending = dayTasks.filter(t => !t.done).length;
          const allDone = dayTasks.length > 0 && pending === 0;
          const isToday = dateStr === today;
          const weekend = isWeekend(dateStr);

          return (
            <button key={dateStr} onClick={() => onSelectDay(dateStr)} style={{
              padding: ".3rem .1rem", borderRadius: "10px", cursor: "pointer",
              background: isToday
                ? T.accentGrad
                : weekend ? T.weekendLight : T.bgCard,
              border: isToday ? "none"
                : weekend ? `1.5px solid ${T.weekendBorder}`
                : `1.5px solid ${T.borderGray}`,
              color: isToday ? "#fff" : weekend ? T.weekend : T.text,
              fontWeight: isToday ? 700 : weekend ? 600 : 400,
              fontSize: ".88rem", aspectRatio: "1",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "2px",
              boxShadow: isToday ? "0 2px 8px rgba(240,180,41,.4)" : "none",
            }}>
              {d}
              {dayTasks.length > 0 && (
                <span style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: isToday ? "rgba(255,255,255,.7)"
                    : allDone ? T.textMuted
                    : weekend ? T.weekend : T.accent,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────
function WeekView({ startDate, tasks, onSelectDay, today }) {
  const days = [];
  const start = new Date(startDate + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: ".6rem" }}>
      {days.map(dateStr => {
        const dayTasks = tasks[dateStr] || [];
        const pending = dayTasks.filter(t => !t.done).length;
        const done = dayTasks.filter(t => t.done).length;
        const isToday = dateStr === today;
        const weekend = isWeekend(dateStr);
        const [, , d] = dateStr.split("-");
        const dayName = new Date(dateStr + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short" });

        return (
          <button key={dateStr} onClick={() => onSelectDay(dateStr)} style={{
            background: isToday ? T.accentGrad
              : weekend ? T.weekendLight : T.bgCard,
            border: `1.5px solid ${isToday ? "transparent"
              : weekend ? T.weekendBorder : T.borderGray}`,
            borderRadius: "16px", padding: ".9rem 1.1rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: ".9rem", textAlign: "left",
            boxShadow: isToday ? "0 4px 16px rgba(240,180,41,.3)" : T.shadowCard,
          }}>
            {/* Day number */}
            <div style={{ flexShrink: 0, textAlign: "center", width: "44px" }}>
              <div style={{
                fontSize: ".7rem", fontWeight: 700, textTransform: "capitalize", marginBottom: ".1rem",
                color: isToday ? "rgba(255,255,255,.8)" : weekend ? T.weekend : T.textMuted,
              }}>{dayName}</div>
              <div style={{
                fontSize: "1.5rem", fontWeight: 700, lineHeight: 1,
                color: isToday ? "#fff" : weekend ? T.weekend : T.text,
                fontFamily: T.font,
              }}>{d}</div>
            </div>

            {/* Divider */}
            <div style={{
              width: "2px", height: "36px", borderRadius: "1px", flexShrink: 0,
              background: isToday ? "rgba(255,255,255,.3)"
                : weekend ? T.weekendBorder : T.border,
            }} />

            {/* Tasks */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {dayTasks.length === 0
                ? <span style={{ color: isToday ? "rgba(255,255,255,.6)" : T.textMuted, fontSize: ".83rem" }}>
                    {weekend ? "Día libre" : "Sin tareas"}
                  </span>
                : dayTasks.slice(0, 2).map(t => (
                  <p key={t.id} style={{
                    color: isToday ? (t.done ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.9)")
                      : (t.done ? T.textMuted : T.textSub),
                    margin: "0 0 .15rem", fontSize: ".82rem",
                    textDecoration: t.done ? "line-through" : "none",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {t.time ? <span style={{ fontWeight: 600, marginRight: ".3rem" }}>{t.time}</span> : null}
                    {t.text}
                  </p>
                ))
              }
              {dayTasks.length > 2 && (
                <p style={{ color: isToday ? "rgba(255,255,255,.55)" : T.textMuted, fontSize: ".75rem", margin: 0 }}>
                  +{dayTasks.length - 2} más
                </p>
              )}
            </div>

            {/* Counts */}
            {dayTasks.length > 0 && (
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {pending > 0 && <div style={{
                  fontSize: ".75rem", fontWeight: 600,
                  color: isToday ? "rgba(255,255,255,.9)" : weekend ? T.weekend : T.accent,
                }}>{pending} ⬤</div>}
                {done > 0 && <div style={{
                  fontSize: ".72rem",
                  color: isToday ? "rgba(255,255,255,.5)" : T.textMuted,
                }}>{done} ✓</div>}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── YearView ─────────────────────────────────────────────────────────────────
function YearView({ year, tasks, onSelectMonth, today }) {
  return (
    <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".75rem" }}>
      {MONTHS_ES.map((m, mi) => {
        const prefix = `${year}-${pad(mi + 1)}`;
        const count = Object.entries(tasks)
          .filter(([k]) => k.startsWith(prefix))
          .reduce((acc, [, ts]) => acc + ts.filter(t => !t.done).length, 0);
        const done = Object.entries(tasks)
          .filter(([k]) => k.startsWith(prefix))
          .reduce((acc, [, ts]) => acc + ts.filter(t => t.done).length, 0);
        const isCurrent = today.startsWith(prefix);
        const isPast = new Date(`${year}-${pad(mi + 1)}-01`) < new Date(today.slice(0, 7) + "-01");

        return (
          <button key={m} onClick={() => onSelectMonth(mi)} style={{
            background: isCurrent ? T.accentGrad : T.bgCard,
            border: `1.5px solid ${isCurrent ? "transparent" : T.borderGray}`,
            borderRadius: "16px", padding: "1rem .75rem", cursor: "pointer",
            textAlign: "center",
            boxShadow: isCurrent ? "0 4px 16px rgba(240,180,41,.3)" : T.shadowCard,
            opacity: isPast && !isCurrent ? .65 : 1,
          }}>
            <div style={{
              fontSize: ".9rem", fontWeight: isCurrent ? 700 : 500,
              color: isCurrent ? "#fff" : T.text, marginBottom: ".3rem",
            }}>{m}</div>
            {count > 0 && (
              <Badge color={isCurrent ? "#fff" : T.accentDark}
                bg={isCurrent ? "rgba(255,255,255,.25)" : T.accentLight}>
                {count} pendiente{count > 1 ? "s" : ""}
              </Badge>
            )}
            {count === 0 && done > 0 && (
              <span style={{ color: isCurrent ? "rgba(255,255,255,.7)" : T.textMuted, fontSize: ".72rem" }}>
                {done} ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── WeightView ──────────────────────────────────────────────────────────────
function WeightView({ user, today, onCreateAccount }) {
  const [logs, setLogs] = useState([]);
  const [todayWeight, setTodayWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const isGuest = user?.guest;

  useEffect(() => {
    if (!user || isGuest) { setLoading(false); return; }
    fetchWeightLogs(user.id).then(data => {
      setLogs(data);
      const todayLog = data.find(l => l.date === today);
      if (todayLog) setTodayWeight(String(todayLog.weight_kg));
      setLoading(false);
    });
  }, [user, today, isGuest]);

  const saveWeight = async () => {
    const val = parseFloat(todayWeight.replace(",", "."));
    if (isNaN(val) || val < 20 || val > 300) return;
    setSaving(true);
    await upsertWeightLog(user.id, today, val);
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== today);
      return [...filtered, { date: today, weight_kg: val }].sort((a, b) => a.date.localeCompare(b.date));
    });
    setSaving(false);
  };

  // ── Guest state ──
  if (isGuest) {
    return (
      <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{
          background: T.bgCard, borderRadius: "20px", padding: "2.5rem 1.5rem",
          boxShadow: T.shadowCard, textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚖️</div>
          <h3 style={{ color: T.text, fontSize: "1.15rem", fontWeight: 700, fontFamily: T.font, marginBottom: ".5rem" }}>
            Seguimiento de peso
          </h3>
          <p style={{ color: T.textMuted, fontSize: ".88rem", lineHeight: 1.5, marginBottom: "1.2rem" }}>
            Necesitas una cuenta para guardar tus registros de peso y ver tu progreso.
          </p>
          <button onClick={onCreateAccount} style={{
            background: T.accentGrad, border: "none", borderRadius: "12px",
            color: T.textOnAccent, padding: ".75rem 1.5rem", fontWeight: 700,
            fontSize: ".9rem", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(240,180,41,.35)",
          }}>Crear cuenta</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
        <div style={{ color: T.textMuted, fontSize: ".9rem" }}>Cargando...</div>
      </div>
    );
  }

  const hasExisting = logs.some(l => l.date === today);

  // ── Stats ──
  const getWeightOn = (daysAgo) => {
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return logs.find(l => l.date === ds)?.weight_kg ?? null;
  };
  const todayKg = getWeightOn(0);
  const weekAgoKg = getWeightOn(7);
  const monthAgoKg = getWeightOn(30);
  const weekChange = todayKg != null && weekAgoKg != null ? todayKg - weekAgoKg : null;
  const monthChange = todayKg != null && monthAgoKg != null ? todayKg - monthAgoKg : null;

  // Streak (consecutive days from today backwards)
  let streak = 0;
  { const d = new Date();
    while (true) {
      const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (logs.some(l => l.date === ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
  }

  // Motivational message
  const getMessage = () => {
    if (logs.length === 0) return "¡Registra tu peso hoy para empezar el seguimiento!";
    if (streak === 0) return "¡Registra tu peso hoy para no perder la racha!";
    if (weekChange != null && weekChange < -0.1) return "¡Buen progreso esta semana! Sigue así.";
    if (weekChange != null && weekChange > 0.1) return "No pasa nada, lo importante es la constancia.";
    if (streak >= 7) return "¡Increíble racha de " + streak + " días! La constancia es la clave.";
    if (streak >= 3) return "¡Vas muy bien! Sigue registrando cada día.";
    return "Cada registro cuenta. ¡Tú puedes!";
  };

  // ── Chart data (last 30 days) ──
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const pts = last30.map(dt => { const l = logs.find(x => x.date === dt); return l ? l.weight_kg : null; });
  const valid = pts.filter(v => v !== null);
  const hasChart = valid.length >= 2;

  // 7-day moving average
  const movAvg = pts.map((_, i) => {
    const w = pts.slice(Math.max(0, i - 6), i + 1).filter(v => v !== null);
    return w.length >= 1 ? w.reduce((a, b) => a + b, 0) / w.length : null;
  });

  // Chart layout
  const CW = 560, CH = 220, PL = 45, PT = 15, PB = 28, PRt = 15;
  const gW = CW - PL - PRt, gH = CH - PT - PB;
  const lo = valid.length ? Math.min(...valid) - 0.5 : 60;
  const hi = valid.length ? Math.max(...valid) + 0.5 : 80;
  const rng = Math.max(hi - lo, 1);
  const xOf = (i) => PL + (i / 29) * gW;
  const yOf = (v) => PT + gH - ((v - lo) / rng) * gH;

  // Catmull-Rom smooth path
  const smooth = (arr) => {
    if (arr.length < 2) return "";
    let d = `M${arr[0].x.toFixed(1)},${arr[0].y.toFixed(1)}`;
    if (arr.length === 2) return d + `L${arr[1].x.toFixed(1)},${arr[1].y.toFixed(1)}`;
    for (let i = 0; i < arr.length - 1; i++) {
      const p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(arr.length - 1, i + 2)];
      d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)},${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)},${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  };

  // Real-weight line segments (connect consecutive non-null only)
  const segs = []; let sg = [];
  pts.forEach((v, i) => { if (v != null) sg.push({ x: xOf(i), y: yOf(v) }); else { if (sg.length >= 2) segs.push(sg); sg = []; } });
  if (sg.length >= 2) segs.push(sg);

  // Dots for all real entries
  const dots = pts.map((v, i) => v != null ? { x: xOf(i), y: yOf(v) } : null).filter(Boolean);

  // Moving avg points
  const avgPts = movAvg.map((v, i) => v != null ? { x: xOf(i), y: yOf(v) } : null).filter(Boolean);

  // Y ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + (rng * i) / 4);

  // X labels (every ~7 days)
  const xLabels = [0, 7, 14, 21, 29].map(i => ({ x: xOf(i), label: last30[i].slice(5).replace("-", "/") }));

  // Change helpers
  const chgColor = (v) => v < -0.05 ? "#4aba6a" : v > 0.05 ? T.danger : T.textMuted;
  const chgArrow = (v) => v < -0.05 ? "↓" : v > 0.05 ? "↑" : "→";

  const isEmpty = logs.length === 0;

  return (
    <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
      {/* ── Part 1: Today's weight ── */}
      <div style={{
        background: T.accentGrad, borderRadius: "20px", padding: "1.5rem",
        marginBottom: "1rem", boxShadow: "0 4px 20px rgba(240,180,41,.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".8rem" }}>
          <div>
            <span style={{
              display: "inline-block", background: "rgba(255,255,255,.3)",
              color: "#fff", fontSize: ".72rem", fontWeight: 700,
              padding: "2px 10px", borderRadius: "20px", letterSpacing: ".06em",
            }}>PESO DE HOY</span>
            <h2 style={{
              color: "#fff", fontSize: "1.1rem", fontWeight: 700,
              fontFamily: T.font, margin: ".3rem 0 0", textTransform: "capitalize",
            }}>{formatDateLabel(today)}</h2>
          </div>
          {hasExisting && (
            <div style={{ color: "rgba(255,255,255,.8)", fontSize: ".78rem", fontWeight: 500 }}>
              Registrado ✓
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <input type="number" inputMode="decimal" step="0.1" min="20" max="300"
              placeholder="0.0" value={todayWeight}
              onChange={e => setTodayWeight(e.target.value)}
              style={{
                width: "100%", padding: ".85rem 1rem",
                background: "rgba(255,255,255,.95)", border: "none",
                borderRadius: "14px", color: T.text, fontSize: "1.5rem",
                fontWeight: 700, fontFamily: T.font, outline: "none", textAlign: "center",
              }} />
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".75rem", textAlign: "center", marginTop: ".3rem" }}>kg</div>
          </div>
          <button onClick={saveWeight} disabled={saving || !todayWeight} style={{
            padding: ".85rem 1.5rem", background: "rgba(255,255,255,.95)",
            border: "none", borderRadius: "14px", color: T.accentDark,
            fontWeight: 700, fontSize: ".95rem", flexShrink: 0,
            cursor: !todayWeight || saving ? "default" : "pointer",
            opacity: !todayWeight || saving ? .6 : 1, transition: "opacity .15s",
          }}>{saving ? "..." : hasExisting ? "Actualizar" : "Guardar"}</button>
        </div>
      </div>

      {isEmpty ? (
        /* ── Empty state ── */
        <div style={{
          background: T.bgCard, borderRadius: "20px", padding: "2.5rem 1.5rem",
          boxShadow: T.shadowCard, textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: ".8rem" }}>📊</div>
          <h3 style={{ color: T.text, fontSize: "1.1rem", fontWeight: 700, fontFamily: T.font, marginBottom: ".5rem" }}>
            Empieza tu seguimiento
          </h3>
          <p style={{ color: T.textMuted, fontSize: ".88rem", lineHeight: 1.5 }}>
            Registra tu peso cada día para ver tu tendencia y progreso a lo largo del tiempo.
          </p>
        </div>
      ) : (
        <>
          {/* ── Part 2: Chart ── */}
          {hasChart && (
            <div style={{
              background: T.bgCard, borderRadius: "20px", padding: "1.2rem 1rem .8rem",
              boxShadow: T.shadowCard, marginBottom: "1rem",
            }}>
              <h4 style={{ fontSize: ".85rem", fontWeight: 700, color: T.text, marginBottom: ".6rem", paddingLeft: ".3rem" }}>
                Últimos 30 días
              </h4>
              <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "auto", display: "block" }}>
                {/* Grid lines + Y labels */}
                {yTicks.map((v, i) => (
                  <g key={i}>
                    <line x1={PL} y1={yOf(v)} x2={CW - PRt} y2={yOf(v)} stroke={T.borderGray} strokeWidth="1" />
                    <text x={PL - 6} y={yOf(v) + 4} textAnchor="end" fill={T.textMuted} fontSize="10" fontFamily="sans-serif">
                      {v.toFixed(1)}
                    </text>
                  </g>
                ))}
                {/* X labels */}
                {xLabels.map((l, i) => (
                  <text key={i} x={l.x} y={CH - 6} textAnchor="middle" fill={T.textMuted} fontSize="9" fontFamily="sans-serif">
                    {l.label}
                  </text>
                ))}
                {/* Real weight dashed segments */}
                {segs.map((s, si) => (
                  <polyline key={si} points={s.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                    fill="none" stroke={T.textMuted} strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" />
                ))}
                {/* Real weight dots */}
                {dots.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill={T.bgCard} stroke={T.textMuted} strokeWidth="1.5" />
                ))}
                {/* Moving average smooth line */}
                {avgPts.length >= 2 && (
                  <path d={smooth(avgPts)} fill="none" stroke={T.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              {/* Legend */}
              <div style={{ display: "flex", justifyContent: "center", gap: "1.2rem", padding: ".2rem 0 .3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                  <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={T.textMuted} strokeWidth="1.5" strokeDasharray="3,2" /></svg>
                  <span style={{ fontSize: ".7rem", color: T.textMuted }}>Peso real</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                  <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={T.accent} strokeWidth="3" strokeLinecap="round" /></svg>
                  <span style={{ fontSize: ".7rem", color: T.textMuted }}>Media 7 días</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Part 3: Stats ── */}
          <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem" }}>
            {/* Week change */}
            <div style={{ flex: 1, background: T.bgCard, borderRadius: "16px", padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
              <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, marginBottom: ".3rem", letterSpacing: ".03em" }}>SEMANA</div>
              {weekChange != null ? (<>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: chgColor(weekChange) }}>
                  {chgArrow(weekChange)} {Math.abs(weekChange).toFixed(1)}
                </div>
                <div style={{ fontSize: ".68rem", color: T.textMuted }}>kg</div>
              </>) : <div style={{ fontSize: ".8rem", color: T.textMuted }}>—</div>}
            </div>
            {/* Month change */}
            <div style={{ flex: 1, background: T.bgCard, borderRadius: "16px", padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
              <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, marginBottom: ".3rem", letterSpacing: ".03em" }}>MES</div>
              {monthChange != null ? (<>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: chgColor(monthChange) }}>
                  {chgArrow(monthChange)} {Math.abs(monthChange).toFixed(1)}
                </div>
                <div style={{ fontSize: ".68rem", color: T.textMuted }}>kg</div>
              </>) : <div style={{ fontSize: ".8rem", color: T.textMuted }}>—</div>}
            </div>
            {/* Streak */}
            <div style={{ flex: 1, background: T.bgCard, borderRadius: "16px", padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
              <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, marginBottom: ".3rem", letterSpacing: ".03em" }}>RACHA</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: streak > 0 ? T.accent : T.textMuted }}>{streak}</div>
              <div style={{ fontSize: ".68rem", color: T.textMuted }}>día{streak !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Motivational message */}
          <div style={{
            background: T.bgCardWarm, borderRadius: "16px", padding: ".9rem 1.2rem",
            border: `1.5px solid ${T.border}`, textAlign: "center",
          }}>
            <p style={{ color: T.textSub, fontSize: ".85rem", lineHeight: 1.4, margin: 0 }}>
              {getMessage()}
            </p>
          </div>

          {/* ── Daily log toggle button ── */}
          <button onClick={() => setShowDailyLog(v => !v)} style={{
            width: "100%", marginTop: "1rem", padding: ".85rem 1.2rem",
            background: T.accentLight, border: `1.5px solid ${T.border}`,
            borderRadius: "16px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
          }}>
            <span style={{ fontSize: ".88rem", fontWeight: 700, color: T.accentDark }}>
              {showDailyLog ? "Ocultar registro" : "Ver registro diario"}
            </span>
            <span style={{ fontSize: ".75rem", color: T.accentDark }}>
              {showDailyLog ? "\u25B2" : "\u25BC"}
            </span>
          </button>

          {/* ── Daily log list ── */}
          {showDailyLog && (
            <div style={{
              background: T.bgCard, borderRadius: "20px", padding: "1rem 1.2rem",
              boxShadow: T.shadowCard, marginTop: ".75rem",
            }}>
              <h4 style={{ fontSize: ".85rem", fontWeight: 700, color: T.text, marginBottom: ".7rem" }}>
                Registro diario
              </h4>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {[...logs].reverse().map((l, i) => {
                  const origIdx = logs.indexOf(l);
                  const prev = origIdx > 0 ? logs[origIdx - 1] : null;
                  const diff = prev ? l.weight_kg - prev.weight_kg : null;
                  const d = new Date(l.date + "T00:00:00");
                  const dayName = d.toLocaleDateString("es-ES", { weekday: "short" });
                  const dayNum = d.getDate();
                  const monthName = d.toLocaleDateString("es-ES", { month: "short" });
                  const isToday = l.date === today;
                  return (
                    <div key={l.date} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: ".6rem .5rem",
                      background: isToday ? T.accentLight : "transparent",
                      borderRadius: isToday ? "12px" : "0",
                      borderBottom: i < logs.length - 1 && !isToday ? `1px solid ${T.borderGray}` : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                        <div style={{
                          width: "38px", height: "38px", borderRadius: "10px",
                          background: isToday ? T.accentGrad : T.bgCardWarm,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: ".62rem", fontWeight: 600, color: isToday ? "#fff" : T.textMuted, lineHeight: 1, textTransform: "uppercase" }}>
                            {dayName}
                          </span>
                          <span style={{ fontSize: ".88rem", fontWeight: 700, color: isToday ? "#fff" : T.text, lineHeight: 1.15 }}>
                            {dayNum}
                          </span>
                        </div>
                        <span style={{ fontSize: ".8rem", color: isToday ? T.accentDark : T.textMuted, fontWeight: isToday ? 600 : 400, textTransform: "capitalize" }}>{monthName}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: ".5rem" }}>
                        {diff != null && (
                          <span style={{ fontSize: ".75rem", fontWeight: 600, color: chgColor(diff) }}>
                            {chgArrow(diff)} {Math.abs(diff).toFixed(1)}
                          </span>
                        )}
                        <span style={{ fontSize: "1.1rem", fontWeight: 700, color: isToday ? T.accentDark : T.text }}>{l.weight_kg.toFixed(1)}</span>
                        <span style={{ fontSize: ".72rem", color: T.textMuted }}>kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);
  const [tasks, setTasks] = useState({});
  const [activeView, setActiveView] = useState(() => localStorage.getItem("agenda-activeView") || "day");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayStr()));
  const [modal, setModal] = useState(null);
  const [movePicker, setMovePicker] = useState(null);
  const [dismissedPendingBanner, setDismissedPendingBanner] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchOpen, setSearchOpen] = useState(false);
  const undoRef = useRef(null);
  const today = todayStr();

  // ── Toast system ──
  const addToast = useCallback((message, type = "info", action = null, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type, action, exiting: false }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250);
      }, duration);
    }
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250);
  }, []);

  // Persist active view
  useEffect(() => { localStorage.setItem("agenda-activeView", activeView); }, [activeView]);

  // Inject global CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load tasks
  useEffect(() => {
    if (user === undefined) return;
    if (!user || user.guest) { setTasks({}); return; }
    setTasksLoading(true);
    fetchTasks(user.id)
      .then(setTasks)
      .catch(() => addToast("No se pudieron cargar las tareas. Revisa tu conexión.", "error"))
      .finally(() => setTasksLoading(false));
  }, [user, addToast]);

  // Notifications
  useEffect(() => {
    if (supportsNotif && Notification.permission === "default") Notification.requestPermission();
  }, []);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); addToast("Conexión restaurada", "success", null, 2500); };
    const goOffline = () => { setIsOnline(false); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [addToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && !modal) { e.preventDefault(); setModal({ date: selectedDate }); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, selectedDate]);

  // ── Sync wrapper ──
  const withSync = useCallback(async (fn) => {
    setSyncing(true);
    try { await fn(); }
    catch (err) { addToast(err.message || "Error de sincronización", "error"); }
    finally { setSyncing(false); }
  }, [addToast]);

  const persistTask = useCallback(async (date, task) => {
    setTasks(prev => {
      const dayTasks = prev[date] || [];
      const idx = dayTasks.findIndex(t => t.id === task.id);
      const savedTask = idx >= 0
        ? { ...task, position: dayTasks[idx].position }
        : { ...task, position: dayTasks.length };
      const newDay = idx >= 0
        ? dayTasks.map(t => t.id === task.id ? savedTask : t)
        : [...dayTasks, savedTask];
      return { ...prev, [date]: newDay };
    });
    if (user && !user.guest) {
      await withSync(async () => {
        const dayTasks = tasks[date] || [];
        const idx = dayTasks.findIndex(t => t.id === task.id);
        const savedTask = idx >= 0
          ? { ...task, position: dayTasks[idx].position }
          : { ...task, position: dayTasks.length };
        await upsertTask(user.id, date, savedTask);
        scheduleNotification(savedTask, date);
      });
    }
  }, [user, tasks, withSync]);

  const handleToggle = useCallback(async (date, id) => {
    const task = tasks[date]?.find(t => t.id === id);
    if (!task) return;
    const nowDone = !task.done;
    const updated = { ...task, done: nowDone };

    // If completing a recurring task, create next occurrence
    let nextDate = null;
    let nextTask = null;
    if (nowDone && task.recurrence) {
      nextDate = nextRecurrenceDate(date, task.recurrence);
      if (nextDate) {
        nextTask = { ...task, id: genId(), done: false, position: (tasks[nextDate] || []).length };
      }
    }

    setTasks(prev => {
      const newState = { ...prev, [date]: (prev[date] || []).map(t => t.id === id ? updated : t) };
      if (nextDate && nextTask) {
        newState[nextDate] = [...(newState[nextDate] || []), nextTask];
      }
      return newState;
    });

    if (user && !user.guest) {
      await withSync(async () => {
        await upsertTask(user.id, date, updated);
        if (nextDate && nextTask) {
          await upsertTask(user.id, nextDate, nextTask);
        }
      });
    }

    if (nowDone && nextDate && nextTask) {
      addToast(`Siguiente repetición creada para ${formatDateLabel(nextDate).split(",")[0]}`, "success", null, 3000);
    }
  }, [user, tasks, withSync, addToast]);

  const handleDelete = useCallback(async (date, id) => {
    const task = tasks[date]?.find(t => t.id === id);
    if (!task) return;
    // Optimistic delete
    setTasks(prev => ({ ...prev, [date]: (prev[date] || []).filter(t => t.id !== id) }));
    // Undo timer
    if (undoRef.current) clearTimeout(undoRef.current.timer);
    const undoData = { date, task, timer: null };
    undoRef.current = undoData;
    addToast("Tarea eliminada", "info", {
      label: "Deshacer",
      fn: () => {
        if (undoRef.current === undoData) {
          clearTimeout(undoData.timer);
          undoRef.current = null;
          setTasks(prev => {
            const restored = [...(prev[date] || []), task].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            return { ...prev, [date]: restored };
          });
          addToast("Tarea restaurada", "success", null, 2000);
        }
      }
    }, 5000);
    undoData.timer = setTimeout(async () => {
      if (undoRef.current === undoData) {
        undoRef.current = null;
        if (user && !user.guest) {
          try { await deleteTaskDB(id); }
          catch { addToast("Error al eliminar en el servidor", "error"); }
        }
      }
    }, 5000);
  }, [tasks, user, addToast]);

  const moveTask = useCallback(async (fromDate, toDate, taskId) => {
    if (fromDate === toDate) return;
    setTasks(prev => {
      const task = (prev[fromDate] || []).find(t => t.id === taskId);
      if (!task) return prev;
      const toLen = (prev[toDate] || []).length;
      const fromTasks = (prev[fromDate] || []).filter(t => t.id !== taskId);
      const toTasks = [...(prev[toDate] || []), { ...task, position: toLen }];
      return { ...prev, [fromDate]: fromTasks, [toDate]: toTasks };
    });
    if (user && !user.guest) {
      await withSync(async () => {
        const toLen = (tasks[toDate] || []).length;
        await supabase.from("tasks").update({ date: toDate, position: toLen }).eq("id", taskId);
      });
    }
  }, [user, tasks, withSync]);

  const handleReorder = useCallback(async (date, reorderedTasks) => {
    const withPositions = reorderedTasks.map((t, i) => ({ ...t, position: i }));
    setTasks(prev => ({ ...prev, [date]: withPositions }));
    if (user && !user.guest) {
      await withSync(async () => {
        await Promise.all(
          withPositions.map(t => supabase.from("tasks").update({ position: t.position }).eq("id", t.id))
        );
      });
    }
  }, [user, withSync]);

  // Count pending tasks from past days
  const pendingPastCount = useMemo(() => {
    if (selectedDate !== today) return 0;
    let count = 0;
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      if (date < today) count += dayTasks.filter(t => !t.done).length;
    });
    return count;
  }, [tasks, selectedDate, today]);

  const moveAllPendingToToday = useCallback(async () => {
    const todayDate = todayStr();
    const updates = [];
    setTasks(prev => {
      const newTasks = {};
      let todayTasks = [...(prev[todayDate] || [])];
      let position = todayTasks.length;
      Object.entries(prev).forEach(([date, dayTasks]) => {
        if (date >= todayDate) { newTasks[date] = dayTasks; return; }
        const pending = dayTasks.filter(t => !t.done);
        const remaining = dayTasks.filter(t => t.done);
        pending.forEach(task => {
          const movedTask = { ...task, position: position++ };
          todayTasks.push(movedTask);
          updates.push({ id: task.id, date: todayDate, position: movedTask.position });
        });
        newTasks[date] = remaining;
      });
      newTasks[todayDate] = todayTasks;
      return newTasks;
    });
    setDismissedPendingBanner(true);
    if (user && !user.guest) {
      await withSync(async () => {
        await Promise.all(
          updates.map(u => supabase.from("tasks").update({ date: u.date, position: u.position }).eq("id", u.id))
        );
      });
    }
  }, [user, withSync]);

  // ── Export tasks ──
  const exportTasks = useCallback(() => {
    const allTasks = [];
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      dayTasks.forEach(t => allTasks.push({ date, text: t.text, time: t.time || "", done: t.done, reminder: t.reminder || "0" }));
    });
    allTasks.sort((a, b) => a.date.localeCompare(b.date));
    const blob = new Blob([JSON.stringify(allTasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agenda-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
    addToast("Tareas exportadas correctamente", "success", null, 2500);
  }, [tasks, addToast]);

  // Loading screen
  if (user === undefined) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", background: T.bgPage, gap: "1rem" }}>
      <img src="/icon-192.png" alt="Agenda" style={{
        width: "48px", height: "48px", borderRadius: "14px",
        boxShadow: "0 4px 16px rgba(240,180,41,.4)" }} />
      <div style={{ width: "24px", height: "24px", border: `3px solid ${T.borderGray}`,
        borderTopColor: T.accent, borderRadius: "50%", animation: "spin .6s linear infinite" }} />
    </div>
  );

  if (!user) return <LoginScreen onLogin={setUser} />;

  const isGuest = user?.guest;
  const prevMonth = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);

  const navItems = [
    { key: "day", icon: "\uD83D\uDCC5", label: "Hoy" },
    { key: "week", icon: "\uD83D\uDCC6", label: "Semana" },
    { key: "month", icon: "\uD83D\uDDD3", label: "Mes" },
    { key: "year", icon: "\uD83D\uDCCA", label: "A\u00F1o" },
    { key: "weight", icon: "\u2696\uFE0F", label: "Peso" },
  ];

  return (
    <div style={{
      minHeight: "100dvh", background: T.bgPage,
      display: "flex", flexDirection: "column",
      maxWidth: "600px", margin: "0 auto",
    }}>
      {/* Header */}
      <header style={{
        padding: "env(safe-area-inset-top, .75rem) 1.25rem .75rem",
        paddingTop: "max(env(safe-area-inset-top), .75rem)",
        background: T.bgCard,
        borderBottom: `1px solid ${T.borderGray}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 20,
        boxShadow: "0 1px 8px rgba(0,0,0,.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <img src="/icon-192.png" alt="Agenda" style={{
            width: "36px", height: "36px", borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(240,180,41,.3)",
          }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <span style={{ fontWeight: 700, fontSize: ".95rem", color: T.text }}>Agenda</span>
              {syncing && (
                <div style={{ width: "12px", height: "12px", border: `2px solid ${T.borderGray}`,
                  borderTopColor: T.accent, borderRadius: "50%", animation: "spin .6s linear infinite" }} />
              )}
            </div>
            <div style={{ fontSize: ".72rem", color: T.textMuted }}>
              {isGuest ? "Modo invitado" : user.email}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".4rem" }}>
          <button onClick={() => setSearchOpen(true)} aria-label="Buscar tareas" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.textSub, padding: ".35rem .55rem", cursor: "pointer", fontSize: ".88rem",
          }}>{"\uD83D\uDD0D"}</button>
          <button onClick={exportTasks} aria-label="Exportar tareas" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.textSub, padding: ".35rem .55rem", cursor: "pointer", fontSize: ".82rem",
          }}>{"\u2B07"}</button>
          {isGuest && (
            <button onClick={() => { setUser(null); setTasks({}); }} style={{
              background: T.accentLight, border: "none", borderRadius: "8px",
              color: T.accentDark, padding: ".35rem .7rem", cursor: "pointer",
              fontSize: ".78rem", fontWeight: 600,
            }}>Crear cuenta</button>
          )}
          <button onClick={async () => {
            if (!isGuest) await supabase.auth.signOut();
            setUser(null); setTasks({});
          }} aria-label="Cerrar sesión" style={{
            background: T.bg, border: `1px solid ${T.borderGray}`,
            borderRadius: "8px", color: T.textSub,
            padding: ".35rem .7rem", cursor: "pointer", fontSize: ".78rem",
          }}>Salir</button>
        </div>
      </header>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          background: "#fef2f2", borderBottom: `1px solid rgba(224,82,82,.2)`,
          padding: ".55rem 1.25rem", display: "flex", alignItems: "center", gap: ".5rem",
        }}>
          <span style={{ fontSize: ".82rem" }}>!</span>
          <p style={{ color: "#991b1b", fontSize: ".78rem", margin: 0 }}>
            Sin conexión — los cambios se guardarán cuando vuelvas a tener red.
          </p>
        </div>
      )}

      {/* Guest banner */}
      {isGuest && (
        <div style={{
          background: "#fffbeb", borderBottom: `1px solid ${T.border}`,
          padding: ".55rem 1.25rem", display: "flex", alignItems: "center", gap: ".5rem",
        }}>
          <span style={{ fontSize: ".82rem" }}>{"\u26A0\uFE0F"}</span>
          <p style={{ color: "#92610a", fontSize: ".78rem", margin: 0 }}>
            Sin cuenta — las tareas no se guardarán.{" "}
            <button onClick={() => { setUser(null); setTasks({}); }} style={{
              background: "none", border: "none", color: T.accentDark,
              cursor: "pointer", fontSize: ".78rem", fontWeight: 700,
              textDecoration: "underline", padding: 0,
            }}>Registrarse</button>
          </p>
        </div>
      )}

      {/* Calendar nav bar — month / year */}
      {(activeView === "month" || activeView === "year") && (
        <div style={{
          padding: ".65rem 1.25rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={prevMonth} aria-label="Mes anterior" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>{"\u2039"}</button>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: T.text }}>
            {activeView === "year" ? calYear : `${MONTHS_ES[calMonth]} ${calYear}`}
          </span>
          <button onClick={nextMonth} aria-label="Mes siguiente" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>{"\u203A"}</button>
        </div>
      )}

      {/* Week nav bar */}
      {activeView === "week" && (
        <div style={{
          padding: ".5rem 1rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => {
            const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() - 7);
            setWeekStart(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }} aria-label="Semana anterior" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>{"\u2039"}</button>

          <button onClick={() => setWeekStart(getWeekStart(todayStr()))} style={{
            background: weekStart === getWeekStart(todayStr()) ? T.accentLight : T.bg,
            border: "none", borderRadius: "8px",
            color: weekStart === getWeekStart(todayStr()) ? T.accentDark : T.textSub,
            fontSize: ".82rem", fontWeight: 700, padding: ".35rem .8rem",
            cursor: "pointer",
          }}>{formatWeekRange(weekStart)}</button>

          <button onClick={() => {
            const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() + 7);
            setWeekStart(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }} aria-label="Semana siguiente" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>{"\u203A"}</button>
        </div>
      )}

      {/* Day nav */}
      {activeView === "day" && (
        <div style={{
          padding: ".5rem 1rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => {
            const d = new Date(selectedDate + "T12:00:00"); d.setDate(d.getDate() - 1);
            setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }} aria-label="Día anterior" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>{"\u2039"}</button>

          <button onClick={() => setSelectedDate(today)} style={{
            background: selectedDate === today ? T.accentLight : T.bg,
            border: "none", borderRadius: "8px",
            color: selectedDate === today ? T.accentDark : T.textSub,
            fontSize: ".78rem", fontWeight: 700, padding: ".35rem .8rem",
            cursor: "pointer", letterSpacing: ".06em",
          }}>HOY</button>

          <button onClick={() => {
            const d = new Date(selectedDate + "T12:00:00"); d.setDate(d.getDate() + 1);
            setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }} aria-label="Día siguiente" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>{"\u203A"}</button>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Loading skeleton */}
        {tasksLoading && activeView === "day" && (
          <div style={{ padding: "1.25rem 1rem", maxWidth: "600px", margin: "0 auto" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: T.bgCard, borderRadius: "16px", padding: "1.1rem 1rem",
                marginBottom: ".65rem", boxShadow: T.shadowCard,
              }}>
                <div style={{ height: "14px", width: `${55 + i * 12}%`, background: T.bgPage,
                  borderRadius: "6px", animation: "pulse 1.2s infinite" }} />
                <div style={{ height: "10px", width: "35%", background: T.bgPage,
                  borderRadius: "4px", marginTop: ".6rem", animation: "pulse 1.2s infinite" }} />
              </div>
            ))}
          </div>
        )}

        {!tasksLoading && activeView === "day" && (
          <DayView date={selectedDate} tasks={tasks}
            onAddTask={() => setModal({ date: selectedDate })}
            onToggle={handleToggle}
            onEdit={(date, task) => setModal({ date, task })}
            onDelete={handleDelete}
            onMoveTask={(date, task) => setMovePicker({ date, task })}
            onReorder={handleReorder}
            pendingPastCount={pendingPastCount}
            onMovePendingToToday={moveAllPendingToToday}
            onDismissPending={() => setDismissedPendingBanner(true)}
            showPendingBanner={selectedDate === today && !dismissedPendingBanner} />
        )}
        {activeView === "week" && (
          <WeekView startDate={weekStart}
            tasks={tasks}
            onSelectDay={d => { setSelectedDate(d); setActiveView("day"); }}
            today={today} />
        )}
        {activeView === "month" && (
          <MonthView year={calYear} month={calMonth} tasks={tasks}
            onSelectDay={d => { setSelectedDate(d); setActiveView("day"); }}
            today={today} />
        )}
        {activeView === "year" && (
          <YearView year={calYear} tasks={tasks}
            onSelectMonth={m => { setCalMonth(m); setActiveView("month"); }}
            today={today} />
        )}
        {activeView === "weight" && (
          <WeightView user={user} today={today}
            onCreateAccount={() => { setUser(null); setTasks({}); }} />
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{
        display: "flex",
        background: T.bgCard,
        borderTop: `1px solid ${T.borderGray}`,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        position: "sticky", bottom: 0, zIndex: 20,
        boxShadow: "0 -2px 16px rgba(0,0,0,.06)",
      }} role="tablist" aria-label="Navegación principal">
        {navItems.map(({ key, icon, label }) => {
          const active = activeView === key;
          return (
            <button key={key} onClick={() => setActiveView(key)}
              role="tab" aria-selected={active} aria-label={label}
              style={{
                flex: 1, padding: ".7rem .5rem .6rem", background: "none", border: "none",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", gap: ".2rem", position: "relative",
              }}>
              {active && (
                <span style={{
                  position: "absolute", top: 0, left: "25%", right: "25%",
                  height: "3px", background: T.accentGrad, borderRadius: "0 0 3px 3px",
                }} />
              )}
              <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{icon}</span>
              <span style={{
                fontSize: ".65rem", fontWeight: active ? 700 : 400,
                color: active ? T.accentDark : T.textMuted,
                letterSpacing: ".04em",
              }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {modal && (
        <TaskModal date={modal.date} task={modal.task}
          onSave={(task) => persistTask(modal.date, task)}
          onClose={() => setModal(null)} />
      )}
      {movePicker && (
        <MoveTaskPicker
          currentDate={movePicker.date}
          onMove={(toDate) => moveTask(movePicker.date, toDate, movePicker.task.id)}
          onClose={() => setMovePicker(null)} />
      )}
      {searchOpen && (
        <SearchModal
          tasks={tasks}
          onSelectTask={(date) => { setSelectedDate(date); setActiveView("day"); }}
          onClose={() => setSearchOpen(false)} />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
