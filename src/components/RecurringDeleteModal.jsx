import { useEffect, useRef } from "react";
import { T } from "../theme";
import { getRecurrenceLabel, getTaskScheduledDate } from "../helpers";
import { TASK_DELETE_MODES } from "../taskDeletion";
import { useFocusTrap } from "../hooks/useFocusTrap";

const OPTIONS = [
  {
    value: TASK_DELETE_MODES.SINGLE,
    label: "Solo esta",
    description: "Elimina solo esta ocurrencia y mantiene la serie.",
  },
  {
    value: TASK_DELETE_MODES.FUTURE,
    label: "Esta y siguientes",
    description: "Corta la serie desde esta ocurrencia en adelante.",
  },
  {
    value: TASK_DELETE_MODES.ALL,
    label: "Toda la serie",
    description: "Elimina todas las ocurrencias existentes de esta serie.",
  },
];

export default function RecurringDeleteModal({ date, task, onSelect, onClose }) {
  const modalRef = useRef(null);
  const recurrenceLabel = getRecurrenceLabel(task?.recurrence) || "Recurrente";
  const scheduledDate = getTaskScheduledDate(task, date);

  useFocusTrap(modalRef);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div
        ref={modalRef}
        className="modal-sheet"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar tarea recurrente"
        style={{
          background: T.bgModal, borderRadius: "24px 24px 0 0",
          padding: "1.5rem 1.5rem 2.5rem", width: "100%", maxWidth: "500px",
          boxShadow: T.shadowFloat,
        }}
      >
        <div style={{ width: "36px", height: "4px", background: T.borderGray,
          borderRadius: "2px", margin: "0 auto 1.2rem" }} />
        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 .45rem", color: T.text }}>
          Eliminar tarea recurrente
        </h3>
        <p style={{ color: T.textSub, fontSize: ".9rem", lineHeight: 1.45, margin: "0 0 1rem" }}>
          <strong style={{ color: T.text }}>{task?.text || "Esta tarea"}</strong> es {recurrenceLabel.toLowerCase()}.
          Elige el alcance del borrado para la ocurrencia de <strong style={{ color: T.text }}>{scheduledDate}</strong>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
          {OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              style={{
                width: "100%",
                padding: ".9rem 1rem",
                background: T.bg,
                border: `1.5px solid ${option.value === TASK_DELETE_MODES.ALL ? `${T.danger}33` : T.borderGray}`,
                borderRadius: T.r3,
                color: option.value === TASK_DELETE_MODES.ALL ? T.dangerText : T.text,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: ".92rem", fontWeight: 700, marginBottom: ".15rem" }}>
                {option.label}
              </div>
              <div style={{ fontSize: ".8rem", color: T.textMuted, lineHeight: 1.4 }}>
                {option.description}
              </div>
            </button>
          ))}
        </div>

        <button onClick={onClose} style={{
          width: "100%", marginTop: "1rem", padding: ".85rem",
          background: T.bg, border: "none", borderRadius: T.r3,
          color: T.textSub, fontWeight: 600, fontSize: ".95rem", cursor: "pointer",
        }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
