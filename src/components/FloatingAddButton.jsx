import { T } from "../theme";
import { Plus } from "lucide-react";

export default function FloatingAddButton({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Añadir tarea" style={{
      position: "fixed",
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
      right: "1.25rem",
      width: "52px", height: "52px", borderRadius: "50%",
      background: T.accentGrad, border: "none", color: T.textOnAccent,
      cursor: "pointer",
      boxShadow: `0 4px 20px var(--accent-shadow)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 30, transition: "transform .15s",
    }}><Plus size={24} strokeWidth={2} /></button>
  );
}
