import { T } from "../theme";

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div aria-live="polite" aria-atomic="false" style={{
      position: "fixed", top: "env(safe-area-inset-top, 12px)", left: 0, right: 0,
      zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center",
      gap: ".5rem", padding: ".75rem 1rem", pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} className={t.exiting ? "toast-exit" : "toast-enter"} role="alert" style={{
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
          }}>{"\u2715"}</button>
        </div>
      ))}
    </div>
  );
}
