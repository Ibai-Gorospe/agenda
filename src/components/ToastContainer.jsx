import { T } from "../theme";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div aria-live="polite" aria-atomic="false" style={{
      position: "fixed", top: "env(safe-area-inset-top, 12px)", left: 0, right: 0,
      zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center",
      gap: ".5rem", padding: ".75rem 1rem", pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} className={t.exiting ? "toast-exit" : "toast-enter"} role="alert" style={{
          background: t.type === "error" ? T.dangerBg : t.type === "success" ? T.successBg : T.accentLight,
          border: `1.5px solid ${t.type === "error" ? `${T.danger}40` : t.type === "success" ? `${T.success}40` : T.border}`,
          borderRadius: T.r3, padding: ".7rem 1rem", maxWidth: "400px", width: "100%",
          boxShadow: T.shadowFloat, pointerEvents: "auto",
          display: "flex", alignItems: "center", gap: ".6rem",
        }}>
          <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            {t.type === "error"
              ? <AlertCircle size={16} style={{ color: T.danger }} />
              : t.type === "success"
                ? <CheckCircle size={16} style={{ color: T.success }} />
                : <Info size={16} style={{ color: T.accent }} />}
          </span>
          <span style={{
            flex: 1, fontSize: ".84rem", lineHeight: 1.3,
            color: t.type === "error" ? T.dangerText : t.type === "success" ? T.successText : T.textSub,
          }}>{t.message}</span>
          {t.action && (
            <button onClick={t.action.fn} style={{
              background: t.type === "error" ? T.dangerBg : T.accentLight,
              border: "none", borderRadius: T.r2, padding: ".35rem .65rem",
              color: t.type === "error" ? T.danger : T.accentDark,
              fontWeight: 700, fontSize: ".78rem", cursor: "pointer", flexShrink: 0,
            }}>{t.action.label}</button>
          )}
          <button onClick={() => onDismiss(t.id)} aria-label="Cerrar" style={{
            background: "none", border: "none", color: T.textMuted,
            cursor: "pointer", padding: "2px", flexShrink: 0,
            display: "flex", alignItems: "center",
          }}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
