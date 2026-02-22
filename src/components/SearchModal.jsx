import { useState, useEffect, useRef, useMemo } from "react";
import { T } from "../theme";
import { formatDateLabel } from "../helpers";
import { useFocusTrap } from "../hooks/useFocusTrap";

export default function SearchModal({ tasks, onSelectTask, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useFocusTrap(modalRef);

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
      <div ref={modalRef} className="modal-sheet" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Buscar tareas"
        style={{
          background: T.bgModal, borderRadius: "20px",
          padding: "1.25rem", width: "100%", maxWidth: "440px",
          boxShadow: T.shadowFloat, maxHeight: "60vh", display: "flex", flexDirection: "column",
          margin: "0 1rem",
        }}>
        <div style={{ position: "relative", marginBottom: ".75rem" }}>
          <input ref={inputRef} type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar tareas..."
            aria-label="Buscar tareas"
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
              Sin resultados para &quot;{query}&quot;
            </p>
          )}
          {results.map(({ date, task }) => (
            <button key={task.id} onClick={() => { onSelectTask(date, task.id); onClose(); }}
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
