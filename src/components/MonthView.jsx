import { memo } from "react";
import { T } from "../theme";
import { DAYS_ES } from "../constants";
import { pad, isWeekend } from "../helpers";

function MonthView({ year, month, tasks, onSelectDay, today }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: ".5rem" }}>
        {DAYS_ES.map((d, i) => (
          <div key={d} style={{
            textAlign: "center", fontSize: ".72rem", fontWeight: 700,
            padding: ".4rem 0", letterSpacing: ".06em",
            color: i >= 5 ? T.weekend : T.textMuted,
          }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
          const dayTasks = tasks[dateStr] || [];
          const pending = dayTasks.filter(t => !t.done).length;
          const allDone = dayTasks.length > 0 && pending === 0;
          const isToday = dateStr === today;
          const weekend = isWeekend(dateStr);

          return (
            <button key={dateStr} onClick={() => onSelectDay(dateStr)}
              aria-label={`${d} de ${new Date(year, month).toLocaleDateString("es-ES", { month: "long" })}${dayTasks.length ? `, ${pending} pendientes` : ""}`}
              style={{
                padding: ".3rem .1rem", borderRadius: "10px", cursor: "pointer",
                background: isToday
                  ? T.accentGrad
                  : weekend ? T.weekendLight : T.bgCard,
                border: isToday ? "none"
                  : weekend ? `1.5px solid ${T.weekendBorder}`
                  : `1.5px solid ${T.borderGray}`,
                color: isToday ? "#fff" : weekend ? T.weekend : T.text,
                fontWeight: isToday ? 700 : weekend ? 600 : 400,
                fontSize: ".88rem", aspectRatio: "1",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "2px",
                boxShadow: isToday ? "0 2px 8px rgba(240,180,41,.4)" : "none",
              }}>
              {d}
              {dayTasks.length > 0 && (
                <span style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: isToday ? "rgba(255,255,255,.7)"
                    : allDone ? T.textMuted
                    : weekend ? T.weekend : T.accent,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(MonthView);
