import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { CATEGORIES, RECURRENCE_OPTIONS, PRIORITY_OPTIONS, GYM_ID } from "../constants";
import { isWeekend, formatDateLabel, genId } from "../helpers";
import { useFocusTrap } from "../hooks/useFocusTrap";

export default function TaskModal({ date, task, onSave, onClose }) {
  const [text, setText] = useState(task?.text || "");
  const [time, setTime] = useState(task?.time || "");
  const [reminder, setReminder] = useState(task?.reminder || "15");
  const [category, setCategory] = useState(task?.category || null);
  const [recurrence, setRecurrence] = useState(task?.recurrence || "");
  const [priority, setPriority] = useState(task?.priority || null);
  const [notes, setNotes] = useState(task?.notes || "");
  const [showNotes, setShowNotes] = useState(!!task?.notes);
  const [subtasks, setSubtasks] = useState(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const weekend = isWeekend(date);
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useFocusTrap(modalRef);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const save = () => {
    if (!text.trim()) return;
    onSave({
      ...task,
      text: text.trim(), time, reminder,
      category: category || null, recurrence: recurrence || null,
      priority: priority || null,
      notes: notes.trim() || null,
      subtasks,
      done: task?.done || false,
      position: task?.position ?? 0,
      id: task?.id || genId(),
    });
    onClose();
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [...prev, { id: genId(), text: newSubtask.trim(), done: false }]);
    setNewSubtask("");
  };

  const toggleSubtask = (id) => {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s));
  };

  const removeSubtask = (id) => {
    setSubtasks(prev => prev.filter(s => s.id !== id));
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
      <div ref={modalRef} className="modal-sheet" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={task?.id ? "Editar tarea" : "Nueva tarea"}
        style={{
          background: T.bgModal, borderRadius: "24px 24px 0 0",
          padding: "1.5rem 1.5rem 2.5rem", width: "100%", maxWidth: "500px",
          boxShadow: T.shadowFloat, maxHeight: "85vh", overflowY: "auto",
        }}>
        <div style={{ width: "36px", height: "4px", background: T.borderGray,
          borderRadius: "2px", margin: "0 auto 1.2rem" }} />

        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.2rem",
          color: weekend ? T.weekend : T.accent }}>
          {task?.id ? "Editar tarea" : "Nueva tarea"} · {formatDateLabel(date).split(",")[0]}
        </h3>

        <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }}
          placeholder={category === GYM_ID ? "Nombre del entrenamiento..." : "¿Qué tienes que hacer?"} rows={2}
          aria-label={category === GYM_ID ? "Nombre del entrenamiento" : "Descripción de la tarea"}
          style={{ ...inputStyle, resize: "none", marginBottom: "1rem", fontFamily: "inherit" }} />

        <div style={{ display: "flex", gap: ".75rem", marginBottom: "1rem" }}>
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

        {/* Priority selector */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600,
            color: T.textSub, marginBottom: ".4rem" }}>Prioridad</label>
          <div style={{ display: "flex", gap: ".4rem" }}>
            <button onClick={() => setPriority(null)} style={{
              padding: ".35rem .7rem", borderRadius: "20px", fontSize: ".78rem", fontWeight: 600,
              cursor: "pointer", transition: "all .15s",
              background: !priority ? T.bgPage : "transparent",
              border: `1.5px solid ${!priority ? T.accent : T.borderGray}`,
              color: !priority ? T.text : T.textMuted,
            }}>Ninguna</button>
            {PRIORITY_OPTIONS.map(p => (
              <button key={p.value} onClick={() => setPriority(p.value)} style={{
                padding: ".35rem .7rem", borderRadius: "20px", fontSize: ".78rem", fontWeight: 600,
                cursor: "pointer", transition: "all .15s",
                background: priority === p.value ? p.color + "18" : "transparent",
                border: `1.5px solid ${priority === p.value ? p.color : T.borderGray}`,
                color: priority === p.value ? p.color : T.textMuted,
              }}>{p.label}</button>
            ))}
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
              }}>{c.id === GYM_ID ? "💪 " + c.label : c.label}</button>
            ))}
          </div>
        </div>

        {/* Recurrence selector */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600,
            color: T.textSub, marginBottom: ".35rem" }}>Repetir</label>
          <select value={recurrence} onChange={e => setRecurrence(e.target.value)}
            style={{ ...inputStyle, background: T.bg }}>
            {RECURRENCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        {!showNotes ? (
          <button onClick={() => setShowNotes(true)} style={{
            background: "none", border: "none", color: T.textMuted,
            cursor: "pointer", fontSize: ".82rem", padding: ".3rem 0", marginBottom: ".8rem",
          }}>+ Añadir notas</button>
        ) : (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600,
              color: T.textSub, marginBottom: ".35rem" }}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
              style={{ ...inputStyle, resize: "none", fontSize: ".88rem", fontFamily: "inherit" }} />
          </div>
        )}

        {/* Subtasks / Exercises */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600,
            color: T.textSub, marginBottom: ".4rem" }}>{category === GYM_ID ? "Ejercicios" : "Subtareas"}</label>
          {subtasks.map(s => (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: ".5rem",
              padding: ".35rem 0", borderBottom: `1px solid ${T.borderGray}`,
            }}>
              <button onClick={() => toggleSubtask(s.id)} style={{
                width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
                border: `2px solid ${s.done ? T.accent : T.borderGray}`,
                background: s.done ? T.accentGrad : "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {s.done && <span style={{ color: "#fff", fontSize: ".65rem", fontWeight: 800 }}>✓</span>}
              </button>
              <span style={{
                flex: 1, fontSize: ".85rem",
                color: s.done ? T.textMuted : T.text,
                textDecoration: s.done ? "line-through" : "none",
              }}>{s.text}</span>
              <button onClick={() => removeSubtask(s.id)} style={{
                background: "none", border: "none", color: T.textMuted,
                cursor: "pointer", fontSize: ".75rem", padding: "2px",
              }}>{"\u2715"}</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: ".5rem", marginTop: ".4rem" }}>
            <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
              placeholder={category === GYM_ID ? "Añadir ejercicio..." : "Añadir subtarea..."}
              style={{ ...inputStyle, flex: 1, padding: ".5rem .75rem", fontSize: ".85rem" }} />
            <button onClick={addSubtask} style={{
              background: T.bg, border: `1.5px solid ${T.borderGray}`,
              borderRadius: "10px", color: T.accent, padding: ".5rem .75rem",
              cursor: "pointer", fontWeight: 700, fontSize: ".85rem", flexShrink: 0,
            }}>+</button>
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
