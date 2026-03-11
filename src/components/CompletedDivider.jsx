import { T } from "../theme";

export default function CompletedDivider({ count, label = "Completadas" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: ".5rem",
      margin: ".85rem 0 .5rem", padding: "0 .25rem",
    }}>
      <div style={{ flex: 1, height: "1px", background: T.borderGray }} />
      <span style={{
        fontSize: ".7rem", fontWeight: 600, color: T.textMuted,
        letterSpacing: ".05em", textTransform: "uppercase",
      }}>
        {label} ({count})
      </span>
      <div style={{ flex: 1, height: "1px", background: T.borderGray }} />
    </div>
  );
}
