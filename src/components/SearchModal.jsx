import { useState, useEffect, useRef, useMemo } from "react";
import { T } from "../theme";
import { formatDateLabel } from "../helpers";
import { UI } from "../constants";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { Search } from "lucide-react";

export default function SearchModal({ tasks, onSelectTask, onClose }) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useFocusTrap(modalRef);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputValue), UI.SEARCH_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Pre-computed flat index with lowercased text
  const searchIndex = useMemo(() => {
    const index = [];
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      dayTasks.forEach(task => {
        index.push({ date, task, textLower: task.text.toLowerCase() });
      });
    });
    index.sort((a, b) => b.date.localeCompare(a.date));
    return index;
  }, [tasks]);

  const results = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return [];
    const matches = [];
    for (const entry of searchIndex) {
      if (entry.textLower.includes(q)) {
        matches.push({ date: entry.date, task: entry.task });
        if (matches.length >= UI.SEARCH_RESULTS_LIMIT) break;
      }
    }
    return matches;
  }, [debouncedQuery, searchIndex]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div ref={modalRef} className="modal-sheet" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Buscar tareas"
        style={{
          background: T.bgModal, borderRadius: `${T.r6} ${T.r6} 0 0`,
          padding: "1.5rem 1.5rem 2.5rem", width: "100%", maxWidth: "500px",
          boxShadow: T.shadowFloat, maxHeight: "70vh", display: "flex", flexDirection: "column",
        }}>
        <div style={{ width: "36px", height: "4px", background: T.borderGray,
          borderRadius: "2px", margin: "0 auto 1.2rem" }} />

        <div style={{ position: "relative", marginBottom: ".75rem" }}>
          <input ref={inputRef} type="text" value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Buscar tareas..."
            aria-label="Buscar tareas"
            style={{
              width: "100%", padding: ".8rem 1rem .8rem 2.4rem",
              background: T.bg, border: `1.5px solid ${T.borderGray}`,
              borderRadius: T.r3, color: T.text, fontSize: "1rem", outline: "none",
            }} />
          <Search size={16} style={{
            position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)",
            color: T.textMuted, pointerEvents: "none",
          }} />
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {debouncedQuery.trim() && results.length === 0 && (
            <p style={{ color: T.textMuted, fontSize: ".88rem", textAlign: "center", padding: "1.5rem 0" }}>
              Sin resultados para &quot;{debouncedQuery}&quot;
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
