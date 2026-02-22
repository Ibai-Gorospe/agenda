import { memo, useMemo } from "react";
import { T } from "../theme";
import { MONTHS_ES } from "../constants";
import { pad } from "../helpers";
import Badge from "./Badge";

function YearView({ year, tasks, onSelectMonth, today }) {
  const monthStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, mi) => {
      const prefix = `${year}-${pad(mi + 1)}`;
      let pending = 0, done = 0;
      Object.entries(tasks).forEach(([k, ts]) => {
        if (k.startsWith(prefix)) {
          ts.forEach(t => { if (t.done) done++; else pending++; });
        }
      });
      return { pending, done };
    });
  }, [tasks, year]);

  return (
    <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".75rem" }}>
      {MONTHS_ES.map((m, mi) => {
        const { pending: count, done } = monthStats[mi];
        const prefix = `${year}-${pad(mi + 1)}`;
        const isCurrent = today.startsWith(prefix);
        const isPast = new Date(`${year}-${pad(mi + 1)}-01`) < new Date(today.slice(0, 7) + "-01");

        return (
          <button key={m} onClick={() => onSelectMonth(mi)} style={{
            background: isCurrent ? T.accentGrad : T.bgCard,
            border: `1.5px solid ${isCurrent ? "transparent" : T.borderGray}`,
            borderRadius: "16px", padding: "1rem .75rem", cursor: "pointer",
            textAlign: "center",
            boxShadow: isCurrent ? "0 4px 16px rgba(240,180,41,.3)" : T.shadowCard,
            opacity: isPast && !isCurrent ? .65 : 1,
          }}>
            <div style={{
              fontSize: ".9rem", fontWeight: isCurrent ? 700 : 500,
              color: isCurrent ? "#fff" : T.text, marginBottom: ".3rem",
            }}>{m}</div>
            {count > 0 && (
              <Badge color={isCurrent ? "#fff" : T.accentDark}
                bg={isCurrent ? "rgba(255,255,255,.25)" : T.accentLight}>
                {count} pendiente{count > 1 ? "s" : ""}
              </Badge>
            )}
            {count === 0 && done > 0 && (
              <span style={{ color: isCurrent ? "rgba(255,255,255,.7)" : T.textMuted, fontSize: ".72rem" }}>
                {done} ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(YearView);
