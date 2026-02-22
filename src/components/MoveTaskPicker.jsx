import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { useFocusTrap } from "../hooks/useFocusTrap";

export default function MoveTaskPicker({ currentDate, onMove, onClose }) {
  const [targetDate, setTargetDate] = useState(currentDate);
  const modalRef = useRef(null);

  useFocusTrap(modalRef);

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
      <div ref={modalRef} className="modal-sheet" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Mover tarea"
        style={{
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
