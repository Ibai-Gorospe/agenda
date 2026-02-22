import { T } from "../theme";

export default function Badge({ children, color = T.accent, bg = T.accentLight }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "20px",
      background: bg, color, fontSize: ".72rem", fontWeight: 600, letterSpacing: ".03em",
    }}>{children}</span>
  );
}
