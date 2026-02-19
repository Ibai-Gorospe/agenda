import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#0f0e09",
  bgCard: "rgba(255,220,50,.05)",
  bgCardHover: "rgba(255,220,50,.09)",
  border: "rgba(255,220,50,.18)",
  borderFaint: "rgba(255,220,50,.08)",
  accent: "#ffd700",
  accentSoft: "#e6c200",
  accentBg: "rgba(255,215,0,.12)",
  text: "#f5edd0",
  textMuted: "#7a7050",
  textFaint: "#3a3520",
  danger: "#e07060",
  done: "#3a3520",
  doneBorder: "rgba(255,220,50,.04)",
  doneText: "#3a3520",
  font: "'Georgia', 'Times New Roman', serif",
  grad: "linear-gradient(135deg, #ffd700, #ffec6e)",
};

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
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_ES = ["L","M","X","J","V","S","D"];

// ─── Supabase task helpers ────────────────────────────────────────────────────
async function fetchTasks(userId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);
  if (error) return {};
  const map = {};
  for (const t of data) {
    if (!map[t.date]) map[t.date] = [];
    map[t.date].push({ id: t.id, text: t.text, time: t.time, reminder: t.reminder, done: t.done, position: t.position ?? 0 });
  }
  return map;
}

async function upsertTask(userId, date, task) {
  await supabase.from("tasks").upsert({
    id: task.id,
    user_id: userId,
    date,
    text: task.text,
    time: task.time || null,
    reminder: task.reminder || "0",
    done: task.done,
    position: task.position ?? 0,
  });
}

async function deleteTask(taskId) {
  await supabase.from("tasks").delete().eq("id", taskId);
}

// ─── Notifications ───────────────────────────────────────────────────────────
const supportsNotif = typeof window !== "undefined" && "Notification" in window;
function scheduleNotification(task, dateStr) {
  if (!task.time || !task.reminder || task.reminder === "0" || !supportsNotif) return;
  if (Notification.permission !== "granted") return;
  const [h, m] = task.time.split(":").map(Number);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const delay = new Date(y, mo - 1, d, h, m).getTime() - task.reminder * 60000 - Date.now();
  if (delay > 0) {
    setTimeout(() => new Notification(`⏰ ${task.text}`, { body: `${task.time} · aviso programado` }), delay);
  }
}

// ─── Button style helper ──────────────────────────────────────────────────────
const btn = (override = {}) => ({
  fontFamily: T.font, cursor: "pointer", border: "none", ...override,
});

// ─── LoginScreen ─────────────────────────────────────────────────────────────
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

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", background: T.bg, fontFamily: T.font, padding: "2rem",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: ".4rem", filter: "drop-shadow(0 0 20px rgba(255,215,0,.4))" }}>◈</div>
        <h1 style={{ color: T.accent, fontSize: "2.2rem", fontWeight: "400", margin: 0, letterSpacing: ".15em" }}>AGENDA</h1>
        <p style={{ color: T.textMuted, fontSize: ".8rem", marginTop: ".3rem", letterSpacing: ".25em" }}>TU TIEMPO, TU ORDEN</p>
      </div>

      <div style={{
        background: T.bgCard, border: `1px solid ${T.border}`,
        borderRadius: "1.5rem", padding: "2rem", width: "100%", maxWidth: "360px",
        backdropFilter: "blur(20px)",
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: ".8rem", marginBottom: "1.5rem",
          background: "rgba(255,215,0,.06)", borderRadius: ".8rem", padding: ".3rem" }}>
          {["login", "registro"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={btn({
                flex: 1, padding: ".55rem", borderRadius: ".6rem",
                background: mode === m ? T.accent : "transparent",
                color: mode === m ? T.bg : T.textMuted,
                fontSize: ".9rem", letterSpacing: ".05em", transition: "all .2s",
              })}>{m === "login" ? "Entrar" : "Registro"}</button>
          ))}
        </div>

        {[
          { ph: "Email", val: email, set: setEmail, type: "email" },
          { ph: "Contraseña", val: password, set: setPassword, type: "password" },
        ].map(({ ph, val, set, type }) => (
          <input key={ph} type={type} placeholder={ph} value={val}
            onChange={e => set(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            style={{
              width: "100%", padding: ".85rem 1rem", marginBottom: "1rem",
              background: "rgba(255,215,0,.04)", border: `1px solid ${T.border}`,
              borderRadius: ".8rem", color: T.text, fontFamily: T.font, fontSize: "1rem",
              outline: "none", boxSizing: "border-box",
            }} />
        ))}

        {error && <p style={{ color: T.danger, fontSize: ".85rem", textAlign: "center", margin: "-.3rem 0 .8rem" }}>{error}</p>}

        <button onClick={submit} disabled={loading}
          style={btn({
            width: "100%", padding: ".9rem", background: T.grad,
            borderRadius: ".8rem", color: T.bg, fontSize: "1rem",
            fontWeight: "bold", letterSpacing: ".05em", opacity: loading ? .7 : 1,
          })}>{loading ? "..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</button>

        <div style={{ marginTop: "1.4rem", textAlign: "center" }}>
          <div style={{ borderTop: `1px solid ${T.borderFaint}`, marginBottom: "1.2rem" }} />
          <button onClick={() => onLogin({ guest: true })}
            style={btn({
              width: "100%", padding: ".8rem", background: "none",
              border: `1px solid ${T.border}`, borderRadius: ".8rem",
              color: T.textMuted, fontSize: ".9rem", letterSpacing: ".05em",
            })}>Continuar sin cuenta</button>
          <p style={{ color: T.textFaint, fontSize: ".75rem", margin: ".5rem 0 0", lineHeight: 1.5 }}>
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

  const save = () => {
    if (!text.trim()) return;
    onSave({ ...task, text: text.trim(), time, reminder, done: task?.done || false, position: task?.position ?? 0, id: task?.id || crypto.randomUUID() });
    onClose();
  };

  const inputStyle = {
    width: "100%", padding: ".75rem", background: "rgba(255,215,0,.04)",
    border: `1px solid ${T.border}`, borderRadius: ".7rem",
    color: T.text, fontFamily: T.font, fontSize: ".95rem", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#141309", borderRadius: "1.5rem 1.5rem 0 0",
        padding: "2rem", width: "100%", maxWidth: "500px",
        border: `1px solid ${T.border}`, borderBottom: "none",
      }}>
        <h3 style={{ color: T.accent, margin: "0 0 1.2rem", fontFamily: T.font,
          fontSize: "1.1rem", fontWeight: "400" }}>
          {task?.id ? "Editar tarea" : "Nueva tarea"} · {formatDateLabel(date).split(",")[0].toLowerCase()}
        </h3>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="¿Qué tienes que hacer?" rows={3}
          style={{ ...inputStyle, resize: "none", marginBottom: "1rem" }} />
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: T.textMuted, fontSize: ".78rem", display: "block", marginBottom: ".3rem" }}>Hora</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: T.textMuted, fontSize: ".78rem", display: "block", marginBottom: ".3rem" }}>Aviso antes</label>
            <select value={reminder} onChange={e => setReminder(e.target.value)}
              style={{ ...inputStyle, background: "#141309" }}>
              <option value="0">Sin aviso</option>
              <option value="5">5 min antes</option>
              <option value="10">10 min antes</option>
              <option value="15">15 min antes</option>
              <option value="30">30 min antes</option>
              <option value="60">1 hora antes</option>
              <option value="120">2 horas antes</option>
              <option value="1440">1 día antes</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".8rem" }}>
          <button onClick={onClose} style={btn({
            flex: 1, padding: ".85rem", background: "rgba(255,215,0,.06)",
            border: `1px solid ${T.borderFaint}`, borderRadius: ".8rem",
            color: T.textMuted, fontSize: "1rem",
          })}>Cancelar</button>
          <button onClick={save} style={btn({
            flex: 2, padding: ".85rem", background: T.grad,
            borderRadius: ".8rem", color: T.bg, fontSize: "1rem", fontWeight: "bold",
          })}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MoveTaskPicker ──────────────────────────────────────────────────────────
function MoveTaskPicker({ currentDate, onMove, onClose }) {
  const [targetDate, setTargetDate] = useState(currentDate);
  const inputStyle = {
    width: "100%", padding: ".75rem", background: "rgba(255,215,0,.04)",
    border: `1px solid ${T.border}`, borderRadius: ".7rem",
    color: T.text, fontFamily: T.font, fontSize: ".95rem", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#141309", borderRadius: "1.5rem 1.5rem 0 0",
        padding: "2rem", width: "100%", maxWidth: "500px",
        border: `1px solid ${T.border}`, borderBottom: "none",
      }}>
        <h3 style={{ color: T.accent, margin: "0 0 1.2rem", fontFamily: T.font,
          fontSize: "1.1rem", fontWeight: "400" }}>Mover tarea</h3>
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
          style={{ ...inputStyle, colorScheme: "dark" }} />
        <div style={{ display: "flex", gap: ".8rem", marginTop: "1rem" }}>
          <button onClick={onClose} style={btn({
            flex: 1, padding: ".85rem", background: "rgba(255,215,0,.06)",
            border: `1px solid ${T.borderFaint}`, borderRadius: ".8rem",
            color: T.textMuted, fontSize: "1rem",
          })}>Cancelar</button>
          <button onClick={() => { onMove(targetDate); onClose(); }} style={btn({
            flex: 2, padding: ".85rem", background: T.grad,
            borderRadius: ".8rem", color: T.bg, fontSize: "1rem", fontWeight: "bold",
          })}>Mover</button>
        </div>
      </div>
    </div>
  );
}

// ─── CarryOverDialog ─────────────────────────────────────────────────────────
function CarryOverDialog({ count, onConfirm, onDismiss }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onDismiss}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#141309", borderRadius: "1.5rem",
        padding: "2rem", width: "90%", maxWidth: "400px",
        border: `1px solid ${T.border}`, textAlign: "center",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: ".8rem" }}>&#128203;</div>
        <h3 style={{ color: T.accent, fontFamily: T.font, fontWeight: "400",
          fontSize: "1.1rem", margin: "0 0 .8rem" }}>Tareas pendientes</h3>
        <p style={{ color: T.text, fontSize: ".92rem", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
          Tienes <strong style={{ color: T.accent }}>{count}</strong> tarea{count > 1 ? "s" : ""} sin completar de d&iacute;as anteriores. &iquest;Moverlas a hoy?
        </p>
        <div style={{ display: "flex", gap: ".8rem" }}>
          <button onClick={onDismiss} style={btn({
            flex: 1, padding: ".85rem", background: "rgba(255,215,0,.06)",
            border: `1px solid ${T.borderFaint}`, borderRadius: ".8rem",
            color: T.textMuted, fontSize: "1rem",
          })}>No</button>
          <button onClick={onConfirm} style={btn({
            flex: 2, padding: ".85rem", background: T.grad,
            borderRadius: ".8rem", color: T.bg, fontSize: "1rem", fontWeight: "bold",
          })}>Mover a hoy</button>
        </div>
      </div>
    </div>
  );
}

// ─── SortableTaskItem ────────────────────────────────────────────────────────
function SortableTaskItem({ task, date, onToggle, onEdit, onDelete, onMoveTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{
        background: task.done ? "rgba(255,215,0,.02)" : T.bgCard,
        border: `1px solid ${task.done ? T.doneBorder : T.border}`,
        borderRadius: "1rem", padding: "1rem 1.1rem",
        display: "flex", alignItems: "flex-start", gap: ".6rem", transition: "all .2s",
      }}>
        <button {...listeners} style={btn({
          background: "none", color: T.textMuted, fontSize: "1.1rem",
          padding: ".1rem", cursor: "grab", touchAction: "none", flexShrink: 0, marginTop: ".1rem",
        })}>&#8942;</button>
        <button onClick={() => onToggle(date, task.id)} style={btn({
          width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, marginTop: ".15rem",
          border: `2px solid ${task.done ? T.accent : T.border}`,
          background: task.done ? T.accent : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        })}>
          {task.done && <span style={{ color: T.bg, fontSize: ".7rem", fontWeight: "bold" }}>&#10003;</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: task.done ? T.doneText : T.text, margin: 0,
            textDecoration: task.done ? "line-through" : "none",
            fontSize: "1rem", wordBreak: "break-word",
          }}>{task.text}</p>
          {task.time && (
            <p style={{ color: task.done ? T.textFaint : T.accent, margin: ".3rem 0 0", fontSize: ".82rem" }}>
              &#9201; {task.time}
              {task.reminder && task.reminder !== "0"
                ? ` \u00b7 aviso ${task.reminder >= 60 ? task.reminder / 60 + "h" : task.reminder + "min"} antes`
                : ""}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: ".3rem", flexShrink: 0 }}>
          <button onClick={() => onMoveTask(date, task)} style={btn({
            background: "none", color: T.textMuted, fontSize: ".95rem", padding: ".25rem",
          })}>&#128197;</button>
          <button onClick={() => onEdit(date, task)} style={btn({
            background: "none", color: T.textMuted, fontSize: ".95rem", padding: ".25rem",
          })}>&#9999;&#65039;</button>
          <button onClick={() => onDelete(date, task.id)} style={btn({
            background: "none", color: T.textMuted, fontSize: ".95rem", padding: ".25rem",
          })}>&#128465;</button>
        </div>
      </div>
    </div>
  );
}

// ─── DayView ─────────────────────────────────────────────────────────────────
function DayView({ date, tasks, onAddTask, onToggle, onEdit, onDelete, onMoveTask, onReorder }) {
  const dayTasks = [...(tasks[date] || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const isToday = date === todayStr();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dayTasks.findIndex(t => t.id === active.id);
    const newIndex = dayTasks.findIndex(t => t.id === over.id);
    const reordered = arrayMove(dayTasks, oldIndex, newIndex);
    onReorder(date, reordered);
  };

  return (
    <div style={{ padding: "1.5rem 1rem", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        {isToday && <p style={{ color: T.accent, fontSize: ".75rem", letterSpacing: ".2em",
          margin: "0 0 .2rem", textTransform: "uppercase" }}>Hoy</p>}
        <h2 style={{ color: T.text, fontFamily: T.font, fontWeight: "400",
          fontSize: "1.35rem", margin: 0, textTransform: "capitalize" }}>
          {formatDateLabel(date)}
        </h2>
      </div>

      {dayTasks.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: T.textFaint }}>
          <div style={{ fontSize: "2.5rem", marginBottom: ".8rem", opacity: .4 }}>&#9724;</div>
          <p style={{ fontSize: ".9rem" }}>Sin tareas para este d&iacute;a</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", marginBottom: "1.5rem" }}>
            {dayTasks.map(task => (
              <SortableTaskItem key={task.id} task={task} date={date}
                onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onMoveTask={onMoveTask} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button onClick={onAddTask} style={btn({
        width: "100%", padding: "1rem",
        background: T.accentBg, border: `1px dashed rgba(255,215,0,.35)`,
        borderRadius: "1rem", color: T.accent, fontSize: "1rem", letterSpacing: ".05em",
      })}>+ A&ntilde;adir tarea</button>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: ".3rem" }}>
        {DAYS_ES.map(d => (
          <div key={d} style={{ textAlign: "center", color: T.textMuted,
            fontSize: ".72rem", padding: ".4rem 0", letterSpacing: ".06em" }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
          const dayTasks = tasks[dateStr] || [];
          const pending = dayTasks.filter(t => !t.done).length;
          const isToday = dateStr === today;
          return (
            <button key={dateStr} onClick={() => onSelectDay(dateStr)} style={btn({
              padding: ".3rem .1rem", borderRadius: ".6rem",
              background: isToday ? T.accent : T.bgCard,
              color: isToday ? T.bg : T.text,
              fontSize: ".9rem", aspectRatio: "1",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: ".12rem",
            })}>
              {d}
              {dayTasks.length > 0 && !isToday && (
                <span style={{
                  width: pending > 0 ? "5px" : "4px", height: pending > 0 ? "5px" : "4px",
                  borderRadius: "50%", background: pending > 0 ? T.accent : T.textFaint,
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
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
      {days.map(dateStr => {
        const dayTasks = tasks[dateStr] || [];
        const pending = dayTasks.filter(t => !t.done).length;
        const done = dayTasks.filter(t => t.done).length;
        const isToday = dateStr === today;
        const [, , d] = dateStr.split("-");
        const dayName = new Date(dateStr + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short" });
        return (
          <button key={dateStr} onClick={() => onSelectDay(dateStr)} style={btn({
            background: isToday ? T.accentBg : T.bgCard,
            border: `1px solid ${isToday ? "rgba(255,215,0,.35)" : T.borderFaint}`,
            borderRadius: "1rem", padding: "1rem 1.2rem",
            display: "flex", alignItems: "center", gap: "1rem", textAlign: "left",
          })}>
            <div style={{ flexShrink: 0, textAlign: "center", width: "38px" }}>
              <div style={{ color: T.textMuted, fontSize: ".72rem", textTransform: "capitalize" }}>{dayName}</div>
              <div style={{ color: isToday ? T.accent : T.text, fontSize: "1.4rem", fontFamily: T.font }}>{d}</div>
            </div>
            <div style={{ flex: 1 }}>
              {dayTasks.length === 0
                ? <span style={{ color: T.textFaint, fontSize: ".85rem" }}>Sin tareas</span>
                : dayTasks.slice(0, 3).map(t => (
                  <p key={t.id} style={{
                    color: t.done ? T.textFaint : T.textMuted, margin: "0 0 .15rem",
                    fontSize: ".82rem", textDecoration: t.done ? "line-through" : "none",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{t.time ? `${t.time} · ` : ""}{t.text}</p>
                ))
              }
              {dayTasks.length > 3 && <p style={{ color: T.textFaint, fontSize: ".78rem", margin: 0 }}>+{dayTasks.length - 3} más</p>}
            </div>
            {dayTasks.length > 0 && (
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {pending > 0 && <div style={{ color: T.accent, fontSize: ".78rem" }}>{pending} pendiente{pending > 1 ? "s" : ""}</div>}
                {done > 0 && <div style={{ color: T.textFaint, fontSize: ".78rem" }}>{done} ✓</div>}
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
        const isCurrent = today.startsWith(prefix);
        return (
          <button key={m} onClick={() => onSelectMonth(mi)} style={btn({
            background: isCurrent ? T.accentBg : T.bgCard,
            border: `1px solid ${isCurrent ? "rgba(255,215,0,.35)" : T.borderFaint}`,
            borderRadius: ".8rem", padding: "1rem .5rem",
          })}>
            <div style={{ color: T.text, fontSize: ".9rem" }}>{m}</div>
            {count > 0 && <div style={{ color: T.accent, fontSize: ".72rem", marginTop: ".25rem" }}>{count} pendientes</div>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [tasks, setTasks] = useState({});
  const [activeView, setActiveView] = useState("day");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState(null);
  const [movePicker, setMovePicker] = useState(null);
  const [carryOverTasks, setCarryOverTasks] = useState([]);
  const [carryOverShown, setCarryOverShown] = useState(false);
  const today = todayStr();

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load tasks when user changes
  useEffect(() => {
    if (user === undefined) return;
    if (user === null) { setTasks({}); return; }
    fetchTasks(user.id).then(setTasks);
  }, [user]);

  // Notifications
  useEffect(() => {
    if (supportsNotif && Notification.permission === "default") Notification.requestPermission();
  }, []);

  // Carry-over: detect overdue incomplete tasks
  useEffect(() => {
    if (carryOverShown) return;
    if (user === undefined) return;
    const todayDate = todayStr();
    const overdue = [];
    for (const [date, dayTasks] of Object.entries(tasks)) {
      if (date >= todayDate) continue;
      for (const task of dayTasks) {
        if (!task.done) overdue.push({ date, task });
      }
    }
    if (overdue.length > 0) setCarryOverTasks(overdue);
    const isGuest = user?.guest;
    if (isGuest || Object.keys(tasks).length > 0 || user === null) {
      setCarryOverShown(true);
    }
  }, [tasks, user, carryOverShown]);

  const persistTask = useCallback(async (date, task) => {
    const dayTasks = tasks[date] || [];
    const idx = dayTasks.findIndex(t => t.id === task.id);
    let savedTask;
    let newDay;
    if (idx >= 0) {
      savedTask = { ...task, position: dayTasks[idx].position };
      newDay = dayTasks.map(t => t.id === task.id ? savedTask : t);
    } else {
      savedTask = { ...task, position: dayTasks.length };
      newDay = [...dayTasks, savedTask];
    }
    setTasks(prev => ({ ...prev, [date]: newDay }));
    if (user && !user.guest) await upsertTask(user.id, date, savedTask);
    scheduleNotification(savedTask, date);
  }, [tasks, user]);

  const handleToggle = useCallback(async (date, id) => {
    const task = (tasks[date] || []).find(t => t.id === id);
    if (!task) return;
    const updated = { ...task, done: !task.done };
    const newDay = (tasks[date] || []).map(t => t.id === id ? updated : t);
    setTasks(prev => ({ ...prev, [date]: newDay }));
    if (user && !user.guest) await upsertTask(user.id, date, updated);
  }, [tasks, user]);

  const handleDelete = useCallback(async (date, id) => {
    setTasks(prev => ({ ...prev, [date]: (prev[date] || []).filter(t => t.id !== id) }));
    if (user && !user.guest) await deleteTask(id);
  }, [user]);

  const moveTask = useCallback(async (fromDate, toDate, taskId) => {
    if (fromDate === toDate) return;
    const task = (tasks[fromDate] || []).find(t => t.id === taskId);
    if (!task) return;
    setTasks(prev => {
      const fromTasks = (prev[fromDate] || []).filter(t => t.id !== taskId);
      const toTasks = [...(prev[toDate] || [])];
      toTasks.push({ ...task, position: toTasks.length });
      return { ...prev, [fromDate]: fromTasks, [toDate]: toTasks };
    });
    if (user && !user.guest) {
      await supabase.from("tasks").update({ date: toDate, position: (tasks[toDate] || []).length }).eq("id", taskId);
    }
  }, [tasks, user]);

  const handleCarryOver = useCallback(async () => {
    const todayDate = todayStr();
    setTasks(prev => {
      const next = { ...prev };
      const todayList = [...(next[todayDate] || [])];
      for (const { date, task } of carryOverTasks) {
        next[date] = (next[date] || []).filter(t => t.id !== task.id);
        todayList.push({ ...task, position: todayList.length });
      }
      next[todayDate] = todayList;
      return next;
    });
    if (user && !user.guest) {
      const ids = carryOverTasks.map(({ task }) => task.id);
      await supabase.from("tasks").update({ date: todayStr() }).in("id", ids);
    }
    setCarryOverTasks([]);
    setSelectedDate(todayDate);
    setActiveView("day");
  }, [carryOverTasks, user]);

  const handleReorder = useCallback(async (date, reorderedTasks) => {
    const withPositions = reorderedTasks.map((t, i) => ({ ...t, position: i }));
    setTasks(prev => ({ ...prev, [date]: withPositions }));
    if (user && !user.guest) {
      await Promise.all(
        withPositions.map(t => supabase.from("tasks").update({ position: t.position }).eq("id", t.id))
      );
    }
  }, [user]);

  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Loading
  if (user === undefined) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, color: T.accent, fontFamily: T.font, fontSize: "2rem" }}>◈</div>
  );

  // Not logged in
  if (user === null) return <LoginScreen onLogin={(u) => setUser(u)} />;

  const isGuest = user?.guest;
  const navItems = [
    { key: "day", icon: "◈", label: "Hoy" },
    { key: "week", icon: "⊞", label: "Semana" },
    { key: "month", icon: "▦", label: "Mes" },
    { key: "year", icon: "◉", label: "Año" },
  ];
  const prevMonth = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);

  return (
    <div style={{
      minHeight: "100dvh", background: T.bg, fontFamily: T.font,
      color: T.text, display: "flex", flexDirection: "column",
      maxWidth: "600px", margin: "0 auto",
    }}>
      {/* Header */}
      <header style={{
        padding: "1rem 1.5rem .8rem", borderBottom: `1px solid ${T.borderFaint}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(15,14,9,.9)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: ".68rem", color: T.textMuted, letterSpacing: ".18em", textTransform: "uppercase" }}>◈ AGENDA</div>
          <div style={{ fontSize: ".85rem", color: isGuest ? T.textMuted : T.accent, marginTop: ".1rem" }}>
            {isGuest ? "Modo invitado" : user.email}
          </div>
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
          {isGuest && (
            <button onClick={() => setUser(null)} style={btn({
              background: T.accentBg, border: `1px solid rgba(255,215,0,.3)`,
              borderRadius: ".5rem", color: T.accent, padding: ".3rem .7rem", fontSize: ".75rem",
            })}>Crear cuenta</button>
          )}
          <button onClick={async () => { if (!isGuest) await supabase.auth.signOut(); setUser(null); setTasks({}); }}
            style={btn({
              background: "none", border: `1px solid ${T.border}`, borderRadius: ".5rem",
              color: T.textMuted, padding: ".3rem .7rem", fontSize: ".8rem",
            })}>Salir</button>
        </div>
      </header>

      {/* Guest banner */}
      {isGuest && (
        <div style={{
          background: "rgba(255,215,0,.06)", borderBottom: `1px solid rgba(255,215,0,.1)`,
          padding: ".6rem 1.5rem", display: "flex", alignItems: "center", gap: ".6rem",
        }}>
          <span style={{ fontSize: ".82rem" }}>⚠️</span>
          <p style={{ color: "#8a7830", fontSize: ".78rem", margin: 0, lineHeight: 1.4 }}>
            Sin cuenta — las tareas se perderán al cerrar.{" "}
            <button onClick={() => setUser(null)} style={btn({
              background: "none", color: T.accent, fontSize: ".78rem",
              textDecoration: "underline", padding: 0,
            })}>Registrarse</button>
          </p>
        </div>
      )}

      {/* Calendar nav */}
      {activeView !== "day" && (
        <div style={{
          padding: ".75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${T.borderFaint}`,
        }}>
          <button onClick={prevMonth} style={btn({ background: "none", color: T.accent, fontSize: "1.3rem" })}>‹</button>
          <span style={{ color: T.text, fontSize: "1rem" }}>
            {activeView === "year" ? calYear : `${MONTHS_ES[calMonth]} ${calYear}`}
          </span>
          <button onClick={nextMonth} style={btn({ background: "none", color: T.accent, fontSize: "1.3rem" })}>›</button>
        </div>
      )}

      {/* Day nav */}
      {activeView === "day" && (
        <div style={{
          padding: ".55rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${T.borderFaint}`,
        }}>
          <button onClick={() => {
            const d = new Date(selectedDate + "T12:00:00"); d.setDate(d.getDate() - 1);
            setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }} style={btn({ background: "none", color: T.accent, fontSize: "1.3rem" })}>‹</button>
          <button onClick={() => setSelectedDate(today)} style={btn({
            background: "none", border: selectedDate === today ? `1px solid rgba(255,215,0,.35)` : "none",
            borderRadius: ".4rem", color: T.accent, fontSize: ".78rem",
            padding: ".2rem .6rem", letterSpacing: ".12em",
          })}>HOY</button>
          <button onClick={() => {
            const d = new Date(selectedDate + "T12:00:00"); d.setDate(d.getDate() + 1);
            setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }} style={btn({ background: "none", color: T.accent, fontSize: "1.3rem" })}>›</button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeView === "day" && (
          <DayView date={selectedDate} tasks={tasks}
            onAddTask={() => setModal({ date: selectedDate })}
            onToggle={handleToggle}
            onEdit={(date, task) => setModal({ date, task })}
            onDelete={handleDelete}
            onMoveTask={(date, task) => setMovePicker({ date, task })}
            onReorder={handleReorder} />
        )}
        {activeView === "week" && (
          <WeekView startDate={getWeekStart(`${calYear}-${pad(calMonth + 1)}-01`)} tasks={tasks}
            onSelectDay={d => { setSelectedDate(d); setActiveView("day"); }} today={today} />
        )}
        {activeView === "month" && (
          <MonthView year={calYear} month={calMonth} tasks={tasks}
            onSelectDay={d => { setSelectedDate(d); setActiveView("day"); }} today={today} />
        )}
        {activeView === "year" && (
          <YearView year={calYear} tasks={tasks}
            onSelectMonth={m => { setCalMonth(m); setActiveView("month"); }} today={today} />
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{
        display: "flex", borderTop: `1px solid ${T.borderFaint}`,
        background: "rgba(15,14,9,.95)", backdropFilter: "blur(20px)",
        position: "sticky", bottom: 0, zIndex: 10,
      }}>
        {navItems.map(({ key, icon, label }) => (
          <button key={key} onClick={() => setActiveView(key)} style={btn({
            flex: 1, padding: ".8rem .5rem", background: "none",
            color: activeView === key ? T.accent : T.textFaint,
            display: "flex", flexDirection: "column", alignItems: "center", gap: ".2rem",
            borderTop: `2px solid ${activeView === key ? T.accent : "transparent"}`,
            transition: "all .2s",
          })}>
            <span style={{ fontSize: "1.15rem" }}>{icon}</span>
            <span style={{ fontSize: ".68rem", letterSpacing: ".06em" }}>{label}</span>
          </button>
        ))}
      </nav>

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

      {carryOverTasks.length > 0 && (
        <CarryOverDialog
          count={carryOverTasks.length}
          onConfirm={handleCarryOver}
          onDismiss={() => setCarryOverTasks([])} />
      )}
    </div>
  );
}
