import { useState, memo } from "react";
import { T } from "../theme";
import { formatDateLabel } from "../helpers";
import { getCat, getPriorityColor } from "../constants";

function PendingTasksSelector({ pendingGroups, onMove, onClose }) {
  const allTasks = pendingGroups.flatMap(g => g.tasks);
  const [selected, setSelected] = useState(() => new Set(allTasks.map(t => t.id)));

  const toggleTask = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === allTasks.length ? new Set() : new Set(allTasks.map(t => t.id)));
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 100,
    }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{
        background: T.bgModal, borderRadius: "24px 24px 0 0",
        width: "100%", maxWidth: "600px", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.25rem .75rem",
          borderBottom: `1px solid ${T.borderGray}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: T.text, margin: 0 }}>
              Tareas pendientes
            </h3>
            <button onClick={onClose} style={{
              background: T.bg, border: "none", borderRadius: "8px",
              width: "32px", height: "32px", cursor: "pointer",
              fontSize: "1rem", color: T.textMuted,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>

          {/* Select all toggle */}
          <button onClick={toggleAll} style={{
            background: "none", border: "none", cursor: "pointer",
            color: T.accentDark, fontSize: ".82rem", fontWeight: 600,
            padding: ".5rem 0 0", display: "flex", alignItems: "center", gap: ".4rem",
          }}>
            <span style={{
              width: "18px", height: "18px", borderRadius: "5px",
              border: `2px solid ${selected.size === allTasks.length ? T.accent : T.borderGray}`,
              background: selected.size === allTasks.length ? T.accentGrad : "transparent",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all .15s",
            }}>
              {selected.size === allTasks.length && (
                <span style={{ color: "#fff", fontSize: ".55rem", fontWeight: 800 }}>✓</span>
              )}
            </span>
            {selected.size === allTasks.length ? "Deseleccionar todas" : "Seleccionar todas"}
          </button>
        </div>

        {/* Task list */}
        <div style={{ flex: 1, overflowY: "auto", padding: ".75rem 1.25rem" }}>
          {pendingGroups.map(group => (
            <div key={group.date} style={{ marginBottom: ".85rem" }}>
              {/* Date header */}
              <p style={{
                fontSize: ".73rem", fontWeight: 700, color: T.textMuted,
                textTransform: "capitalize", margin: "0 0 .35rem",
                letterSpacing: ".03em",
              }}>{formatDateLabel(group.date)}</p>

              {/* Tasks */}
              {group.tasks.map(task => {
                const cat = task.category ? getCat(task.category) : null;
                const priorityColor = getPriorityColor(task.priority);
                const isSelected = selected.has(task.id);
                return (
                  <button key={task.id} onClick={() => toggleTask(task.id)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: ".6rem",
                    padding: ".55rem .5rem", borderRadius: "10px",
                    background: isSelected ? T.accentLight : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background .15s",
                    borderLeft: priorityColor ? `3px solid ${priorityColor}` : "3px solid transparent",
                  }}>
                    {/* Checkbox */}
                    <span style={{
                      width: "20px", height: "20px", borderRadius: "6px",
                      border: `2px solid ${isSelected ? T.accent : T.borderGray}`,
                      background: isSelected ? T.accentGrad : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all .15s",
                    }}>
                      {isSelected && (
                        <span style={{ color: "#fff", fontSize: ".55rem", fontWeight: 800 }}>✓</span>
                      )}
                    </span>

                    {/* Task info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: ".88rem", color: T.text, margin: 0,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{task.text}</p>
                      <div style={{ display: "flex", gap: ".4rem", alignItems: "center", marginTop: ".1rem" }}>
                        {cat && (
                          <span style={{
                            fontSize: ".68rem", color: cat.color, fontWeight: 600,
                          }}>{cat.label}</span>
                        )}
                        {task.priority && (
                          <span style={{
                            fontSize: ".68rem", color: priorityColor, fontWeight: 600,
                          }}>{task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Action button */}
        <div style={{
          padding: ".75rem 1.25rem 1rem",
          borderTop: `1px solid ${T.borderGray}`,
        }}>
          <button
            onClick={() => selected.size > 0 && onMove(selected)}
            disabled={selected.size === 0}
            style={{
              width: "100%", padding: ".75rem",
              background: selected.size > 0 ? T.accentGrad : T.bg,
              border: "none", borderRadius: "12px",
              color: selected.size > 0 ? T.textOnAccent : T.textMuted,
              fontWeight: 700, fontSize: ".92rem",
              cursor: selected.size > 0 ? "pointer" : "default",
              boxShadow: selected.size > 0 ? "0 2px 8px var(--accent-shadow, rgba(240,180,41,.3))" : "none",
              transition: "all .15s",
            }}>
            {selected.size > 0
              ? `Mover ${selected.size} tarea${selected.size > 1 ? "s" : ""} a hoy`
              : "Selecciona tareas para mover"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(PendingTasksSelector);
