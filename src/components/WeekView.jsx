import { memo } from "react";
import { T } from "../theme";
import { pad, isWeekend } from "../helpers";

function WeekView({ startDate, tasks, onSelectDay, today }) {
  const days = [];
  const start = new Date(startDate + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: ".6rem" }}>
      {days.map(dateStr => {
        const dayTasks = tasks[dateStr] || [];
        const pending = dayTasks.filter(t => !t.done).length;
        const done = dayTasks.filter(t => t.done).length;
        const isToday = dateStr === today;
        const weekend = isWeekend(dateStr);
        const [, , d] = dateStr.split("-");
        const dayName = new Date(dateStr + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short" });

        return (
          <button key={dateStr} onClick={() => onSelectDay(dateStr)} style={{
            background: isToday ? T.accentGrad
              : weekend ? T.weekendLight : T.bgCard,
            border: `1.5px solid ${isToday ? "transparent"
              : weekend ? T.weekendBorder : T.borderGray}`,
            borderRadius: "16px", padding: ".9rem 1.1rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: ".9rem", textAlign: "left",
            boxShadow: isToday ? "0 4px 16px rgba(240,180,41,.3)" : T.shadowCard,
          }}>
            <div style={{ flexShrink: 0, textAlign: "center", width: "44px" }}>
              <div style={{
                fontSize: ".7rem", fontWeight: 700, textTransform: "capitalize", marginBottom: ".1rem",
                color: isToday ? "rgba(255,255,255,.8)" : weekend ? T.weekend : T.textMuted,
              }}>{dayName}</div>
              <div style={{
                fontSize: "1.5rem", fontWeight: 700, lineHeight: 1,
                color: isToday ? "#fff" : weekend ? T.weekend : T.text,
                fontFamily: T.font,
              }}>{d}</div>
            </div>

            <div style={{
              width: "2px", height: "36px", borderRadius: "1px", flexShrink: 0,
              background: isToday ? "rgba(255,255,255,.3)"
                : weekend ? T.weekendBorder : T.border,
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              {dayTasks.length === 0
                ? <span style={{ color: isToday ? "rgba(255,255,255,.6)" : T.textMuted, fontSize: ".83rem" }}>
                    {weekend ? "Día libre" : "Sin tareas"}
                  </span>
                : dayTasks.slice(0, 2).map(t => (
                  <p key={t.id} style={{
                    color: isToday ? (t.done ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.9)")
                      : (t.done ? T.textMuted : T.textSub),
                    margin: "0 0 .15rem", fontSize: ".82rem",
                    textDecoration: t.done ? "line-through" : "none",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {t.time ? <span style={{ fontWeight: 600, marginRight: ".3rem" }}>{t.time}</span> : null}
                    {t.text}
                  </p>
                ))
              }
              {dayTasks.length > 2 && (
                <p style={{ color: isToday ? "rgba(255,255,255,.55)" : T.textMuted, fontSize: ".75rem", margin: 0 }}>
                  +{dayTasks.length - 2} más
                </p>
              )}
            </div>

            {dayTasks.length > 0 && (
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {pending > 0 && <div style={{
                  fontSize: ".75rem", fontWeight: 600,
                  color: isToday ? "rgba(255,255,255,.9)" : weekend ? T.weekend : T.accent,
                }}>{pending} ⬤</div>}
                {done > 0 && <div style={{
                  fontSize: ".72rem",
                  color: isToday ? "rgba(255,255,255,.5)" : T.textMuted,
                }}>{done} ✓</div>}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(WeekView);
