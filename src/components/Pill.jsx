import { T } from "../theme";

export default function Pill({ children, active, onClick, weekend }) {
  return (
    <button onClick={onClick} aria-pressed={active} style={{
      padding: ".45rem .9rem", borderRadius: "20px", border: "none", cursor: "pointer",
      background: active ? (weekend ? T.weekend : T.accent) : "transparent",
      color: active ? T.textOnAccent : (weekend ? T.weekend : T.textSub),
      fontWeight: active ? 600 : 400, fontSize: ".85rem", transition: "all .15s",
    }}>{children}</button>
  );
}
