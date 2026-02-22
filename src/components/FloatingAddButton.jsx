import { T } from "../theme";

export default function FloatingAddButton({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Añadir tarea" style={{
      position: "fixed",
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
      right: "1.25rem",
      width: "52px", height: "52px", borderRadius: "50%",
      background: T.accentGrad, border: "none", color: "#fff",
      fontSize: "1.6rem", fontWeight: 300, cursor: "pointer",
      boxShadow: "0 4px 20px rgba(240,180,41,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 30, transition: "transform .15s",
    }}>+</button>
  );
}
