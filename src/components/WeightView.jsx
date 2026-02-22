import { useState, useEffect, useMemo, memo } from "react";
import { T } from "../theme";
import { pad, formatDateLabel } from "../helpers";
import { fetchWeightLogs, upsertWeightLog, fetchWeightGoal, upsertWeightGoal } from "../api/weightLogs";
import Badge from "./Badge";

function WeightView({ user, today, onCreateAccount }) {
  const [logs, setLogs] = useState([]);
  const [todayWeight, setTodayWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [goalWeight, setGoalWeight] = useState(null);
  const [goalInput, setGoalInput] = useState("");
  const [showGoalInput, setShowGoalInput] = useState(false);
  const isGuest = user?.guest;

  useEffect(() => {
    if (!user || isGuest) { setLoading(false); return; }
    Promise.all([
      fetchWeightLogs(user.id),
      fetchWeightGoal(user.id).catch(() => null),
    ]).then(([data, goal]) => {
      setLogs(data);
      const todayLog = data.find(l => l.date === today);
      if (todayLog) setTodayWeight(String(todayLog.weight_kg));
      if (goal) { setGoalWeight(goal); setGoalInput(String(goal)); }
      setLoading(false);
    });
  }, [user, today, isGuest]);

  const saveWeight = async () => {
    const val = parseFloat(todayWeight.replace(",", "."));
    if (isNaN(val) || val < 20 || val > 300) return;
    setSaving(true);
    await upsertWeightLog(user.id, today, val);
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== today);
      return [...filtered, { date: today, weight_kg: val }].sort((a, b) => a.date.localeCompare(b.date));
    });
    setSaving(false);
  };

  const saveGoal = async () => {
    const val = parseFloat(goalInput.replace(",", "."));
    if (isNaN(val) || val < 20 || val > 300) return;
    await upsertWeightGoal(user.id, val);
    setGoalWeight(val);
    setShowGoalInput(false);
  };

  // Guest state
  if (isGuest) {
    return (
      <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{
          background: T.bgCard, borderRadius: "20px", padding: "2.5rem 1.5rem",
          boxShadow: T.shadowCard, textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚖️</div>
          <h3 style={{ color: T.text, fontSize: "1.15rem", fontWeight: 700, fontFamily: T.font, marginBottom: ".5rem" }}>
            Seguimiento de peso
          </h3>
          <p style={{ color: T.textMuted, fontSize: ".88rem", lineHeight: 1.5, marginBottom: "1.2rem" }}>
            Necesitas una cuenta para guardar tus registros de peso y ver tu progreso.
          </p>
          <button onClick={onCreateAccount} style={{
            background: T.accentGrad, border: "none", borderRadius: "12px",
            color: T.textOnAccent, padding: ".75rem 1.5rem", fontWeight: 700,
            fontSize: ".9rem", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(240,180,41,.35)",
          }}>Crear cuenta</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
        <div style={{ color: T.textMuted, fontSize: ".9rem" }}>Cargando...</div>
      </div>
    );
  }

  const hasExisting = logs.some(l => l.date === today);

  // Stats
  const getWeightOn = (daysAgo) => {
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return logs.find(l => l.date === ds)?.weight_kg ?? null;
  };
  const todayKg = getWeightOn(0);
  const weekAgoKg = getWeightOn(7);
  const monthAgoKg = getWeightOn(30);
  const weekChange = todayKg != null && weekAgoKg != null ? todayKg - weekAgoKg : null;
  const monthChange = todayKg != null && monthAgoKg != null ? todayKg - monthAgoKg : null;

  // Streak
  let streak = 0;
  { const d = new Date();
    while (true) {
      const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (logs.some(l => l.date === ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
  }

  // Motivational message
  const getMessage = () => {
    if (logs.length === 0) return "¡Registra tu peso hoy para empezar el seguimiento!";
    if (streak === 0) return "¡Registra tu peso hoy para no perder la racha!";
    if (weekChange != null && weekChange < -0.1) return "¡Buen progreso esta semana! Sigue así.";
    if (weekChange != null && weekChange > 0.1) return "No pasa nada, lo importante es la constancia.";
    if (streak >= 7) return "¡Increíble racha de " + streak + " días! La constancia es la clave.";
    if (streak >= 3) return "¡Vas muy bien! Sigue registrando cada día.";
    return "Cada registro cuenta. ¡Tú puedes!";
  };

  const isEmpty = logs.length === 0;

  return (
    <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
      {/* Today's weight */}
      <div style={{
        background: T.accentGrad, borderRadius: "20px", padding: "1.5rem",
        marginBottom: "1rem", boxShadow: "0 4px 20px rgba(240,180,41,.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".8rem" }}>
          <div>
            <span style={{
              display: "inline-block", background: "rgba(255,255,255,.3)",
              color: "#fff", fontSize: ".72rem", fontWeight: 700,
              padding: "2px 10px", borderRadius: "20px", letterSpacing: ".06em",
            }}>PESO DE HOY</span>
            <h2 style={{
              color: "#fff", fontSize: "1.1rem", fontWeight: 700,
              fontFamily: T.font, margin: ".3rem 0 0", textTransform: "capitalize",
            }}>{formatDateLabel(today)}</h2>
          </div>
          {hasExisting && (
            <div style={{ color: "rgba(255,255,255,.8)", fontSize: ".78rem", fontWeight: 500 }}>
              Registrado ✓
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <input type="number" inputMode="decimal" step="0.1" min="20" max="300"
              placeholder="0.0" value={todayWeight}
              onChange={e => setTodayWeight(e.target.value)}
              style={{
                width: "100%", padding: ".85rem 1rem",
                background: "rgba(255,255,255,.95)", border: "none",
                borderRadius: "14px", color: T.text, fontSize: "1.5rem",
                fontWeight: 700, fontFamily: T.font, outline: "none", textAlign: "center",
              }} />
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".75rem", textAlign: "center", marginTop: ".3rem" }}>kg</div>
          </div>
          <button onClick={saveWeight} disabled={saving || !todayWeight} style={{
            padding: ".85rem 1.5rem", background: "rgba(255,255,255,.95)",
            border: "none", borderRadius: "14px", color: T.accentDark,
            fontWeight: 700, fontSize: ".95rem", flexShrink: 0,
            cursor: !todayWeight || saving ? "default" : "pointer",
            opacity: !todayWeight || saving ? .6 : 1, transition: "opacity .15s",
          }}>{saving ? "..." : hasExisting ? "Actualizar" : "Guardar"}</button>
        </div>
      </div>

      {isEmpty ? (
        <div style={{
          background: T.bgCard, borderRadius: "20px", padding: "2.5rem 1.5rem",
          boxShadow: T.shadowCard, textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: ".8rem" }}>📊</div>
          <h3 style={{ color: T.text, fontSize: "1.1rem", fontWeight: 700, fontFamily: T.font, marginBottom: ".5rem" }}>
            Empieza tu seguimiento
          </h3>
          <p style={{ color: T.textMuted, fontSize: ".88rem", lineHeight: 1.5 }}>
            Registra tu peso cada día para ver tu tendencia y progreso a lo largo del tiempo.
          </p>
        </div>
      ) : (
        <>
          <WeightChart logs={logs} goalWeight={goalWeight} today={today} />

          {/* Goal weight */}
          <div style={{
            background: T.bgCard, borderRadius: "16px", padding: ".9rem 1rem",
            boxShadow: T.shadowCard, marginBottom: "1rem",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            {showGoalInput ? (
              <div style={{ display: "flex", gap: ".5rem", flex: 1, alignItems: "center" }}>
                <input type="number" inputMode="decimal" step="0.1" min="20" max="300"
                  value={goalInput} onChange={e => setGoalInput(e.target.value)}
                  placeholder="Objetivo (kg)"
                  style={{
                    flex: 1, padding: ".5rem .75rem", background: T.bg,
                    border: `1.5px solid ${T.borderGray}`, borderRadius: "10px",
                    color: T.text, fontSize: ".9rem", outline: "none",
                  }} />
                <button onClick={saveGoal} style={{
                  background: T.accentGrad, border: "none", borderRadius: "10px",
                  color: "#fff", padding: ".5rem .75rem", fontWeight: 700, fontSize: ".82rem", cursor: "pointer",
                }}>OK</button>
                <button onClick={() => setShowGoalInput(false)} style={{
                  background: T.bg, border: "none", borderRadius: "10px",
                  color: T.textMuted, padding: ".5rem .6rem", cursor: "pointer", fontSize: ".82rem",
                }}>✕</button>
              </div>
            ) : (
              <>
                <div>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: T.textSub }}>Objetivo: </span>
                  <span style={{ fontSize: ".88rem", fontWeight: 700, color: goalWeight ? "#4aba6a" : T.textMuted }}>
                    {goalWeight ? `${goalWeight} kg` : "Sin definir"}
                  </span>
                </div>
                <button onClick={() => { setShowGoalInput(true); setGoalInput(goalWeight ? String(goalWeight) : ""); }} style={{
                  background: T.bg, border: `1.5px solid ${T.borderGray}`,
                  borderRadius: "10px", color: T.textSub, padding: ".4rem .75rem",
                  cursor: "pointer", fontSize: ".78rem", fontWeight: 600,
                }}>{goalWeight ? "Cambiar" : "Definir"}</button>
              </>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem" }}>
            <StatCard label="SEMANA" value={weekChange} />
            <StatCard label="MES" value={monthChange} />
            <div style={{ flex: 1, background: T.bgCard, borderRadius: "16px", padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
              <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, marginBottom: ".3rem", letterSpacing: ".03em" }}>RACHA</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: streak > 0 ? T.accent : T.textMuted }}>{streak}</div>
              <div style={{ fontSize: ".68rem", color: T.textMuted }}>día{streak !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Motivational message */}
          <div style={{
            background: T.bgCardWarm, borderRadius: "16px", padding: ".9rem 1.2rem",
            border: `1.5px solid ${T.border}`, textAlign: "center",
          }}>
            <p style={{ color: T.textSub, fontSize: ".85rem", lineHeight: 1.4, margin: 0 }}>
              {getMessage()}
            </p>
          </div>

          {/* Daily log toggle */}
          <button onClick={() => setShowDailyLog(v => !v)} style={{
            width: "100%", marginTop: "1rem", padding: ".85rem 1.2rem",
            background: T.accentLight, border: `1.5px solid ${T.border}`,
            borderRadius: "16px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
          }}>
            <span style={{ fontSize: ".88rem", fontWeight: 700, color: T.accentDark }}>
              {showDailyLog ? "Ocultar registro" : "Ver registro diario"}
            </span>
            <span style={{ fontSize: ".75rem", color: T.accentDark }}>
              {showDailyLog ? "\u25B2" : "\u25BC"}
            </span>
          </button>

          {/* Daily log list */}
          {showDailyLog && (
            <div style={{
              background: T.bgCard, borderRadius: "20px", padding: "1rem 1.2rem",
              boxShadow: T.shadowCard, marginTop: ".75rem",
            }}>
              <h4 style={{ fontSize: ".85rem", fontWeight: 700, color: T.text, marginBottom: ".7rem" }}>
                Registro diario
              </h4>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {[...logs].reverse().map((l, i) => {
                  const origIdx = logs.indexOf(l);
                  const prev = origIdx > 0 ? logs[origIdx - 1] : null;
                  const diff = prev ? l.weight_kg - prev.weight_kg : null;
                  const d = new Date(l.date + "T00:00:00");
                  const dayName = d.toLocaleDateString("es-ES", { weekday: "short" });
                  const dayNum = d.getDate();
                  const monthName = d.toLocaleDateString("es-ES", { month: "short" });
                  const isToday = l.date === today;
                  return (
                    <div key={l.date} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: ".6rem .5rem",
                      background: isToday ? T.accentLight : "transparent",
                      borderRadius: isToday ? "12px" : "0",
                      borderBottom: i < logs.length - 1 && !isToday ? `1px solid ${T.borderGray}` : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                        <div style={{
                          width: "38px", height: "38px", borderRadius: "10px",
                          background: isToday ? T.accentGrad : T.bgCardWarm,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: ".62rem", fontWeight: 600, color: isToday ? "#fff" : T.textMuted, lineHeight: 1, textTransform: "uppercase" }}>
                            {dayName}
                          </span>
                          <span style={{ fontSize: ".88rem", fontWeight: 700, color: isToday ? "#fff" : T.text, lineHeight: 1.15 }}>
                            {dayNum}
                          </span>
                        </div>
                        <span style={{ fontSize: ".8rem", color: isToday ? T.accentDark : T.textMuted, fontWeight: isToday ? 600 : 400, textTransform: "capitalize" }}>{monthName}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: ".5rem" }}>
                        {diff != null && (
                          <span style={{ fontSize: ".75rem", fontWeight: 600, color: chgColor(diff) }}>
                            {chgArrow(diff)} {Math.abs(diff).toFixed(1)}
                          </span>
                        )}
                        <span style={{ fontSize: "1.1rem", fontWeight: 700, color: isToday ? T.accentDark : T.text }}>{l.weight_kg.toFixed(1)}</span>
                        <span style={{ fontSize: ".72rem", color: T.textMuted }}>kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helpers
const chgColor = (v) => v < -0.05 ? "#4aba6a" : v > 0.05 ? T.danger : T.textMuted;
const chgArrow = (v) => v < -0.05 ? "↓" : v > 0.05 ? "↑" : "→";

function StatCard({ label, value }) {
  return (
    <div style={{ flex: 1, background: T.bgCard, borderRadius: "16px", padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
      <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, marginBottom: ".3rem", letterSpacing: ".03em" }}>{label}</div>
      {value != null ? (<>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: chgColor(value) }}>
          {chgArrow(value)} {Math.abs(value).toFixed(1)}
        </div>
        <div style={{ fontSize: ".68rem", color: T.textMuted }}>kg</div>
      </>) : <div style={{ fontSize: ".8rem", color: T.textMuted }}>—</div>}
    </div>
  );
}

// Chart sub-component with memoized calculations
function WeightChart({ logs, goalWeight, today }) {
  const chartData = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const pts = last30.map(dt => { const l = logs.find(x => x.date === dt); return l ? l.weight_kg : null; });
    const valid = pts.filter(v => v !== null);
    if (valid.length < 2) return null;

    const movAvg = pts.map((_, i) => {
      const w = pts.slice(Math.max(0, i - 6), i + 1).filter(v => v !== null);
      return w.length >= 1 ? w.reduce((a, b) => a + b, 0) / w.length : null;
    });

    const CW = 560, CH = 220, PL = 45, PT = 15, PB = 28, PRt = 15;
    const gW = CW - PL - PRt, gH = CH - PT - PB;
    const allVals = [...valid];
    if (goalWeight) allVals.push(goalWeight);
    const lo = Math.min(...allVals) - 0.5;
    const hi = Math.max(...allVals) + 0.5;
    const rng = Math.max(hi - lo, 1);
    const xOf = (i) => PL + (i / 29) * gW;
    const yOf = (v) => PT + gH - ((v - lo) / rng) * gH;

    // Catmull-Rom smooth
    const smooth = (arr) => {
      if (arr.length < 2) return "";
      let d = `M${arr[0].x.toFixed(1)},${arr[0].y.toFixed(1)}`;
      if (arr.length === 2) return d + `L${arr[1].x.toFixed(1)},${arr[1].y.toFixed(1)}`;
      for (let i = 0; i < arr.length - 1; i++) {
        const p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(arr.length - 1, i + 2)];
        d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)},${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)},${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
      return d;
    };

    const segs = []; let sg = [];
    pts.forEach((v, i) => { if (v != null) sg.push({ x: xOf(i), y: yOf(v) }); else { if (sg.length >= 2) segs.push(sg); sg = []; } });
    if (sg.length >= 2) segs.push(sg);

    const dots = pts.map((v, i) => v != null ? { x: xOf(i), y: yOf(v) } : null).filter(Boolean);
    const avgPts = movAvg.map((v, i) => v != null ? { x: xOf(i), y: yOf(v) } : null).filter(Boolean);
    const yTicks = Array.from({ length: 5 }, (_, i) => lo + (rng * i) / 4);
    const xLabels = [0, 7, 14, 21, 29].map(i => ({ x: xOf(i), label: last30[i].slice(5).replace("-", "/") }));

    return { CW, CH, PL, PRt, segs, dots, avgPts, yTicks, xLabels, smooth, yOf, goalWeight };
  }, [logs, goalWeight]);

  if (!chartData) return null;
  const { CW, CH, PL, PRt, segs, dots, avgPts, yTicks, xLabels, smooth, yOf } = chartData;

  return (
    <div style={{
      background: T.bgCard, borderRadius: "20px", padding: "1.2rem 1rem .8rem",
      boxShadow: T.shadowCard, marginBottom: "1rem",
    }}>
      <h4 style={{ fontSize: ".85rem", fontWeight: 700, color: T.text, marginBottom: ".6rem", paddingLeft: ".3rem" }}>
        Últimos 30 días
      </h4>
      <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PL} y1={yOf(v)} x2={CW - PRt} y2={yOf(v)} stroke={T.borderGray} strokeWidth="1" />
            <text x={PL - 6} y={yOf(v) + 4} textAnchor="end" fill={T.textMuted} fontSize="10" fontFamily="sans-serif">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={CH - 6} textAnchor="middle" fill={T.textMuted} fontSize="9" fontFamily="sans-serif">
            {l.label}
          </text>
        ))}
        {/* Goal weight line */}
        {goalWeight && (
          <>
            <line x1={PL} y1={yOf(goalWeight)} x2={CW - PRt} y2={yOf(goalWeight)}
              stroke="#4aba6a" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x={CW - PRt + 4} y={yOf(goalWeight) + 3} fill="#4aba6a" fontSize="9" fontFamily="sans-serif">
              Meta
            </text>
          </>
        )}
        {segs.map((s, si) => (
          <polyline key={si} points={s.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            fill="none" stroke={T.textMuted} strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" />
        ))}
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={T.bgCard} stroke={T.textMuted} strokeWidth="1.5" />
        ))}
        {avgPts.length >= 2 && (
          <path d={smooth(avgPts)} fill="none" stroke={T.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: "1.2rem", padding: ".2rem 0 .3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={T.textMuted} strokeWidth="1.5" strokeDasharray="3,2" /></svg>
          <span style={{ fontSize: ".7rem", color: T.textMuted }}>Peso real</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={T.accent} strokeWidth="3" strokeLinecap="round" /></svg>
          <span style={{ fontSize: ".7rem", color: T.textMuted }}>Media 7 días</span>
        </div>
        {goalWeight && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#4aba6a" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
            <span style={{ fontSize: ".7rem", color: T.textMuted }}>Objetivo</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WeightView);
