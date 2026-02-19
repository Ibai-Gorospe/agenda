import { useState, useEffect, useCallback } from "react";
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
  .task-card { animation: slideUp .2s ease; }
  .modal-overlay { animation: fadeIn .15s ease; }
  .modal-sheet { animation: slideUp .25s cubic-bezier(.32,1,.23,1); }
  .check-pop { animation: checkPop .25s ease; }

  button:active { opacity: .85; transform: scale(.98); transition: transform .1s; }
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
const DAYS_ES = ["L","M","X","J","V","S","D"];

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchTasks(userId) {
  const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId);
  if (error) return {};
  const map = {};
  for (const t of data) {
    if (!map[t.date]) map[t.date] = [];
    map[t.date].push({ id: t.id, text: t.text, time: t.time, reminder: t.reminder, done: t.done });
  }
  return map;
}
async function upsertTask(userId, date, task) {
  await supabase.from("tasks").upsert({
    id: task.id, user_id: userId, date,
    text: task.text, time: task.time || null,
    reminder: task.reminder || "0", done: task.done,
  });
}
async function deleteTask(taskId) {
  await supabase.from("tasks").delete().eq("id", taskId);
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
  const weekend = isWeekend(date);

  const save = () => {
    if (!text.trim()) return;
    onSave({ ...task, text: text.trim(), time, reminder, done: task?.done || false, id: task?.id || crypto.randomUUID() });
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

        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="¿Qué tienes que hacer?" rows={3}
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

// ─── DayView ──────────────────────────────────────────────────────────────────
function DayView({ date, tasks, onAddTask, onToggle, onEdit, onDelete }) {
  const dayTasks = [...(tasks[date] || [])].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1; if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
  const isToday = date === todayStr();
  const weekend = isWeekend(date);
  const pending = dayTasks.filter(t => !t.done).length;
  const done = dayTasks.filter(t => t.done).length;

  return (
    <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: ".65rem", marginBottom: "1rem" }}>
        {dayTasks.map(task => (
          <div key={task.id} className="task-card" style={{
            background: task.done ? T.doneBg : T.bgCard,
            border: `1.5px solid ${T.borderGray}`,
            borderRadius: "16px", padding: "1rem 1.1rem",
            display: "flex", alignItems: "flex-start", gap: ".85rem",
            boxShadow: task.done ? "none" : T.shadowCard,
            transition: "all .2s",
          }}>
            {/* Checkbox */}
            <button onClick={() => onToggle(date, task.id)} style={{
              width: "24px", height: "24px", borderRadius: "8px", flexShrink: 0,
              border: `2px solid ${task.done ? T.accent : T.borderGray}`,
              background: task.done ? T.accentGrad : "transparent",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", marginTop: ".1rem", transition: "all .15s",
            }}>
              {task.done && <span style={{ color: "#fff", fontSize: ".7rem", fontWeight: 800 }}>✓</span>}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                color: task.done ? T.textMuted : T.text,
                textDecoration: task.done ? "line-through" : "none",
                fontSize: ".97rem", lineHeight: 1.4, wordBreak: "break-word",
                margin: 0,
              }}>{task.text}</p>
              {task.time && (
                <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".35rem" }}>
                  <span style={{ fontSize: ".75rem" }}>🕐</span>
                  <span style={{
                    color: task.done ? T.textMuted : (weekend ? T.weekend : T.accent),
                    fontSize: ".8rem", fontWeight: 600,
                  }}>{task.time}</span>
                  {task.reminder && task.reminder !== "0" && (
                    <Badge color={weekend ? T.weekend : T.accentDark}
                      bg={weekend ? T.weekendLight : T.accentLight}>
                      {task.reminder >= 60 ? `${task.reminder / 60}h antes` : `${task.reminder}min antes`}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: ".25rem", flexShrink: 0 }}>
              <button onClick={() => onEdit(date, task)} style={{
                background: T.bg, border: "none", borderRadius: "8px",
                color: T.textMuted, cursor: "pointer", fontSize: ".85rem",
                padding: ".35rem .4rem", lineHeight: 1,
              }}>✏️</button>
              <button onClick={() => onDelete(date, task.id)} style={{
                background: T.bg, border: "none", borderRadius: "8px",
                color: T.textMuted, cursor: "pointer", fontSize: ".85rem",
                padding: ".35rem .4rem", lineHeight: 1,
              }}>🗑</button>
            </div>
          </div>
        ))}
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);
  const [tasks, setTasks] = useState({});
  const [activeView, setActiveView] = useState("day");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState(null);
  const today = todayStr();

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
    fetchTasks(user.id).then(setTasks);
  }, [user]);

  // Notifications
  useEffect(() => {
    if (supportsNotif && Notification.permission === "default") Notification.requestPermission();
  }, []);

  const persistTask = useCallback(async (date, task) => {
    const dayTasks = tasks[date] || [];
    const idx = dayTasks.findIndex(t => t.id === task.id);
    const newDay = idx >= 0 ? dayTasks.map(t => t.id === task.id ? task : t) : [...dayTasks, task];
    setTasks(prev => ({ ...prev, [date]: newDay }));
    if (user && !user.guest) await upsertTask(user.id, date, task);
    scheduleNotification(task, date);
  }, [tasks, user]);

  const handleToggle = useCallback(async (date, id) => {
    const task = (tasks[date] || []).find(t => t.id === id);
    if (!task) return;
    const updated = { ...task, done: !task.done };
    setTasks(prev => ({ ...prev, [date]: (prev[date] || []).map(t => t.id === id ? updated : t) }));
    if (user && !user.guest) await upsertTask(user.id, date, updated);
  }, [tasks, user]);

  const handleDelete = useCallback(async (date, id) => {
    setTasks(prev => ({ ...prev, [date]: (prev[date] || []).filter(t => t.id !== id) }));
    if (user && !user.guest) await deleteTask(id);
  }, [user]);

  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Loading
  if (user === undefined) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center",
      justifyContent: "center", background: T.bgPage }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "14px",
        background: T.accentGrad, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "1.5rem",
        boxShadow: "0 4px 16px rgba(240,180,41,.4)" }}>📅</div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={setUser} />;

  const isGuest = user?.guest;
  const prevMonth = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);

  const navItems = [
    { key: "day", icon: "📅", label: "Hoy" },
    { key: "week", icon: "📆", label: "Semana" },
    { key: "month", icon: "🗓", label: "Mes" },
    { key: "year", icon: "📊", label: "Año" },
  ];

  const todayIsWeekend = isWeekend(selectedDate);

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
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: T.accentGrad, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.1rem",
            boxShadow: "0 2px 8px rgba(240,180,41,.3)",
          }}>📅</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: ".95rem", color: T.text }}>Agenda</div>
            <div style={{ fontSize: ".72rem", color: T.textMuted }}>
              {isGuest ? "Modo invitado" : user.email}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
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
          }} style={{
            background: T.bg, border: `1px solid ${T.borderGray}`,
            borderRadius: "8px", color: T.textSub,
            padding: ".35rem .7rem", cursor: "pointer", fontSize: ".78rem",
          }}>Salir</button>
        </div>
      </header>

      {/* Guest banner */}
      {isGuest && (
        <div style={{
          background: "#fffbeb", borderBottom: `1px solid ${T.border}`,
          padding: ".55rem 1.25rem", display: "flex", alignItems: "center", gap: ".5rem",
        }}>
          <span style={{ fontSize: ".82rem" }}>⚠️</span>
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

      {/* Calendar nav bar */}
      {activeView !== "day" && (
        <div style={{
          padding: ".65rem 1.25rem",
          background: T.bgCard, borderBottom: `1px solid ${T.borderGray}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={prevMonth} style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: T.text }}>
            {activeView === "year" ? calYear : `${MONTHS_ES[calMonth]} ${calYear}`}
          </span>
          <button onClick={nextMonth} style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>›</button>
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
          }} style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>‹</button>

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
          }} style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.text, fontSize: "1.1rem", cursor: "pointer",
            width: "34px", height: "34px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>›</button>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeView === "day" && (
          <DayView date={selectedDate} tasks={tasks}
            onAddTask={() => setModal({ date: selectedDate })}
            onToggle={handleToggle}
            onEdit={(date, task) => setModal({ date, task })}
            onDelete={handleDelete} />
        )}
        {activeView === "week" && (
          <WeekView startDate={getWeekStart(`${calYear}-${pad(calMonth + 1)}-01`)}
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
      </div>

      {/* Bottom nav */}
      <nav style={{
        display: "flex",
        background: T.bgCard,
        borderTop: `1px solid ${T.borderGray}`,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        position: "sticky", bottom: 0, zIndex: 20,
        boxShadow: "0 -2px 16px rgba(0,0,0,.06)",
      }}>
        {navItems.map(({ key, icon, label }) => {
          const active = activeView === key;
          return (
            <button key={key} onClick={() => setActiveView(key)} style={{
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

      {modal && (
        <TaskModal date={modal.date} task={modal.task}
          onSave={(task) => persistTask(modal.date, task)}
          onClose={() => setModal(null)} />
      )}
    </div>
  );
}
