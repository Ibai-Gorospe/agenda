import { useMemo } from "react";
import { T } from "../theme";
import { CATEGORIES } from "../constants";
import { pad } from "../helpers";

export default function StatsView({ tasks, today, onClose }) {
  const stats = useMemo(() => {
    const allTasks = [];
    Object.entries(tasks).forEach(([date, dayTasks]) => {
      dayTasks.forEach(t => allTasks.push({ ...t, date }));
    });

    // This week vs last week
    const todayDate = new Date(today + "T12:00:00");
    const weekStart = new Date(todayDate);
    weekStart.setDate(weekStart.getDate() - todayDate.getDay() + 1);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const weekStartStr = fmt(weekStart);
    const lastWeekStartStr = fmt(lastWeekStart);

    const thisWeekDone = allTasks.filter(t => t.done && t.date >= weekStartStr && t.date <= today).length;
    const lastWeekDone = allTasks.filter(t => t.done && t.date >= lastWeekStartStr && t.date < weekStartStr).length;

    // Completion rate by category
    const byCat = {};
    CATEGORIES.forEach(c => { byCat[c.id] = { total: 0, done: 0 }; });
    byCat["none"] = { total: 0, done: 0 };
    allTasks.forEach(t => {
      const key = t.category || "none";
      if (byCat[key]) {
        byCat[key].total++;
        if (t.done) byCat[key].done++;
      }
    });

    // Best day of week
    const dayBuckets = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    allTasks.filter(t => t.done).forEach(t => {
      const d = new Date(t.date + "T12:00:00").getDay();
      const idx = (d + 6) % 7; // Convert to Mon=0
      dayBuckets[idx]++;
    });
    const bestDayIdx = dayBuckets.indexOf(Math.max(...dayBuckets));
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    // Streak (consecutive days with at least 1 completed task)
    let completionStreak = 0;
    { const d = new Date(today + "T12:00:00");
      while (true) {
        const ds = fmt(d);
        const dayTasks = tasks[ds] || [];
        if (dayTasks.some(t => t.done)) { completionStreak++; d.setDate(d.getDate() - 1); } else break;
      }
    }

    // Total stats
    const totalDone = allTasks.filter(t => t.done).length;
    const totalPending = allTasks.filter(t => !t.done).length;

    return { thisWeekDone, lastWeekDone, byCat, bestDayIdx, dayNames, completionStreak, totalDone, totalPending, dayBuckets };
  }, [tasks, today]);

  const maxDayCount = Math.max(...stats.dayBuckets, 1);

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Estadísticas"
        style={{
          background: T.bgModal, borderRadius: "24px 24px 0 0",
          padding: "1.5rem 1.5rem 2.5rem", width: "100%", maxWidth: "500px",
          boxShadow: T.shadowFloat, maxHeight: "85vh", overflowY: "auto",
        }}>
        <div style={{ width: "36px", height: "4px", background: T.borderGray,
          borderRadius: "2px", margin: "0 auto 1.2rem" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: T.text, fontFamily: T.font, margin: 0 }}>
            Estadísticas
          </h3>
          <button onClick={onClose} aria-label="Cerrar" style={{
            background: T.bg, border: "none", borderRadius: "8px",
            color: T.textSub, padding: ".35rem .55rem", cursor: "pointer", fontSize: ".88rem",
          }}>{"\u2715"}</button>
        </div>

        {/* Summary cards */}
        <div style={{ display: "flex", gap: ".6rem", marginBottom: "1.2rem" }}>
          <div style={{ flex: 1, background: T.bgCard, borderRadius: "16px", padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
            <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, letterSpacing: ".03em" }}>COMPLETADAS</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: T.accent }}>{stats.totalDone}</div>
          </div>
          <div style={{ flex: 1, background: T.bgCard, borderRadius: "16px", padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
            <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, letterSpacing: ".03em" }}>PENDIENTES</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: T.danger }}>{stats.totalPending}</div>
          </div>
          <div style={{ flex: 1, background: T.bgCard, borderRadius: "16px", padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
            <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, letterSpacing: ".03em" }}>RACHA</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: stats.completionStreak > 0 ? "#4aba6a" : T.textMuted }}>{stats.completionStreak}</div>
            <div style={{ fontSize: ".65rem", color: T.textMuted }}>días</div>
          </div>
        </div>

        {/* This week vs last week */}
        <div style={{
          background: T.bgCard, borderRadius: "16px", padding: "1rem 1.2rem",
          boxShadow: T.shadowCard, marginBottom: "1rem",
        }}>
          <h4 style={{ fontSize: ".82rem", fontWeight: 700, color: T.text, marginBottom: ".6rem" }}>Esta semana vs anterior</h4>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".72rem", color: T.textMuted, marginBottom: ".2rem" }}>Esta semana</div>
              <div style={{ height: "8px", background: T.bgPage, borderRadius: "4px" }}>
                <div style={{
                  height: "100%", borderRadius: "4px", background: T.accentGrad,
                  width: `${Math.min(100, (stats.thisWeekDone / Math.max(stats.thisWeekDone, stats.lastWeekDone, 1)) * 100)}%`,
                  transition: "width .3s",
                }} />
              </div>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: T.accent, marginTop: ".2rem" }}>{stats.thisWeekDone}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".72rem", color: T.textMuted, marginBottom: ".2rem" }}>Semana anterior</div>
              <div style={{ height: "8px", background: T.bgPage, borderRadius: "4px" }}>
                <div style={{
                  height: "100%", borderRadius: "4px", background: T.textMuted,
                  width: `${Math.min(100, (stats.lastWeekDone / Math.max(stats.thisWeekDone, stats.lastWeekDone, 1)) * 100)}%`,
                  transition: "width .3s",
                }} />
              </div>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: T.textMuted, marginTop: ".2rem" }}>{stats.lastWeekDone}</div>
            </div>
          </div>
        </div>

        {/* By category */}
        <div style={{
          background: T.bgCard, borderRadius: "16px", padding: "1rem 1.2rem",
          boxShadow: T.shadowCard, marginBottom: "1rem",
        }}>
          <h4 style={{ fontSize: ".82rem", fontWeight: 700, color: T.text, marginBottom: ".6rem" }}>Por categoría</h4>
          {CATEGORIES.map(c => {
            const d = stats.byCat[c.id];
            if (!d || d.total === 0) return null;
            const pct = d.total > 0 ? (d.done / d.total) * 100 : 0;
            return (
              <div key={c.id} style={{ marginBottom: ".5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", marginBottom: ".2rem" }}>
                  <span style={{ color: c.color, fontWeight: 600 }}>{c.label}</span>
                  <span style={{ color: T.textMuted }}>{d.done}/{d.total} ({Math.round(pct)}%)</span>
                </div>
                <div style={{ height: "6px", background: T.bgPage, borderRadius: "3px" }}>
                  <div style={{
                    height: "100%", borderRadius: "3px", background: c.color,
                    width: `${pct}%`, transition: "width .3s",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Best day */}
        <div style={{
          background: T.bgCard, borderRadius: "16px", padding: "1rem 1.2rem",
          boxShadow: T.shadowCard,
        }}>
          <h4 style={{ fontSize: ".82rem", fontWeight: 700, color: T.text, marginBottom: ".6rem" }}>Productividad por día</h4>
          <div style={{ display: "flex", alignItems: "flex-end", gap: ".3rem", height: "80px" }}>
            {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
              <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: ".2rem" }}>
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0",
                  height: `${Math.max(4, (stats.dayBuckets[i] / maxDayCount) * 60)}px`,
                  background: i === stats.bestDayIdx ? T.accentGrad : T.bgPage,
                  transition: "height .3s",
                }} />
                <span style={{
                  fontSize: ".65rem", fontWeight: i === stats.bestDayIdx ? 700 : 400,
                  color: i === stats.bestDayIdx ? T.accentDark : T.textMuted,
                }}>{d}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: ".78rem", color: T.textMuted, marginTop: ".5rem", textAlign: "center" }}>
            Tu día más productivo: <strong style={{ color: T.accent }}>{stats.dayNames[stats.bestDayIdx]}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
