import { useState, useEffect, useMemo, memo } from "react";
import { T } from "../theme";
import { Scale, BarChart3, ChevronUp, ChevronDown, Check, X, Trash2, Target } from "lucide-react";
import { pad, formatDateLabel } from "../helpers";
import { fetchWeightLogs, upsertWeightLog, fetchWeightGoal, upsertWeightGoal, deleteWeightLog } from "../api/weightLogs";

function WeightView({ user, today, onCreateAccount }) {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [goalWeight, setGoalWeight] = useState(null);
  const [goalInput, setGoalInput] = useState("");
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [chartRange, setChartRange] = useState(30);
  const [confirmDeleteDate, setConfirmDeleteDate] = useState(null);
  const isGuest = user?.guest;

  useEffect(() => {
    if (!user || isGuest) { setLoading(false); return; }
    Promise.all([
      fetchWeightLogs(user.id),
      fetchWeightGoal(user.id).catch(() => null),
    ]).then(([data, goal]) => {
      setLogs(data);
      const todayLog = data.find(l => l.date === today);
      if (todayLog) setWeightInput(String(todayLog.weight_kg));
      if (goal) { setGoalWeight(goal); setGoalInput(String(goal)); }
      setLoading(false);
    });
  }, [user, today, isGuest]);

  // Update input when switching dates
  useEffect(() => {
    const existing = logs.find(l => l.date === selectedDate);
    setWeightInput(existing ? String(existing.weight_kg) : "");
  }, [selectedDate, logs]);

  const saveWeight = async () => {
    const val = parseFloat(weightInput.replace(",", "."));
    if (isNaN(val) || val < 20 || val > 300) return;
    setSaving(true);
    await upsertWeightLog(user.id, selectedDate, val);
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== selectedDate);
      return [...filtered, { date: selectedDate, weight_kg: val }].sort((a, b) => a.date.localeCompare(b.date));
    });
    setSaving(false);
  };

  const handleDelete = async (logDate) => {
    const log = logs.find(l => l.date === logDate);
    if (!log) return;
    await deleteWeightLog(log.id);
    setLogs(prev => prev.filter(l => l.date !== logDate));
    setConfirmDeleteDate(null);
    if (logDate === selectedDate) setWeightInput("");
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
          background: T.bgCard, borderRadius: T.r5, padding: "2.5rem 1.5rem",
          boxShadow: T.shadowCard, textAlign: "center",
        }}>
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
            <Scale size={48} color={T.accent} strokeWidth={1.5} />
          </div>
          <h3 style={{ color: T.text, fontSize: "1.15rem", fontWeight: 700, marginBottom: ".5rem" }}>
            Seguimiento de peso
          </h3>
          <p style={{ color: T.textMuted, fontSize: ".88rem", lineHeight: 1.5, marginBottom: "1.2rem" }}>
            Necesitas una cuenta para guardar tus registros de peso y ver tu progreso.
          </p>
          <button onClick={onCreateAccount} style={{
            background: T.accentGrad, border: "none", borderRadius: T.r3,
            color: T.textOnAccent, padding: ".75rem 1.5rem", fontWeight: 700,
            fontSize: ".9rem", cursor: "pointer",
            boxShadow: "0 4px 16px var(--accent-shadow)",
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

  const hasExisting = logs.some(l => l.date === selectedDate);
  const isToday = selectedDate === today;

  // --- Stats: nearest entry instead of exact match ---
  const findNearest = (targetDate, maxDaysDiff = 3) => {
    const target = new Date(targetDate + "T00:00:00").getTime();
    let closest = null;
    let minDiff = Infinity;
    for (const l of logs) {
      const d = new Date(l.date + "T00:00:00").getTime();
      const diff = Math.abs(d - target);
      if (diff < minDiff && diff <= maxDaysDiff * 86400000) {
        minDiff = diff;
        closest = l;
      }
    }
    return closest;
  };

  const currentKg = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;

  const weekAgoStr = (() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  const monthAgoStr = (() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  const weekAgoEntry = findNearest(weekAgoStr);
  const monthAgoEntry = findNearest(monthAgoStr, 5);
  const weekChange = currentKg != null && weekAgoEntry ? currentKg - weekAgoEntry.weight_kg : null;
  const monthChange = currentKg != null && monthAgoEntry ? currentKg - monthAgoEntry.weight_kg : null;

  // Streak
  let streak = 0;
  { const d = new Date();
    while (true) {
      const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (logs.some(l => l.date === ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
  }

  // Period stats
  const periodLogs = (() => {
    if (chartRange === 0) return logs;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - chartRange);
    const cutoffStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
    return logs.filter(l => l.date >= cutoffStr);
  })();
  const periodMin = periodLogs.length > 0 ? Math.min(...periodLogs.map(l => l.weight_kg)) : null;
  const periodMax = periodLogs.length > 0 ? Math.max(...periodLogs.map(l => l.weight_kg)) : null;
  const periodAvg = periodLogs.length > 0 ? periodLogs.reduce((s, l) => s + l.weight_kg, 0) / periodLogs.length : null;

  // Goal progress
  const goalProgress = (() => {
    if (!goalWeight || logs.length < 2) return null;
    const first = logs[0].weight_kg;
    const current = logs[logs.length - 1].weight_kg;
    const totalNeeded = first - goalWeight;
    if (Math.abs(totalNeeded) < 0.1) return null;
    const achieved = first - current;
    const pct = Math.min(Math.max((achieved / totalNeeded) * 100, 0), 100);
    const remaining = Math.abs(current - goalWeight);
    const reached = (totalNeeded > 0 && current <= goalWeight) || (totalNeeded < 0 && current >= goalWeight);
    return { pct, remaining, reached };
  })();

  // Motivational message
  const getMessage = () => {
    if (logs.length === 0) return "¡Registra tu peso hoy para empezar el seguimiento!";
    if (streak === 0) return "¡Registra tu peso hoy para no perder la racha!";
    if (goalProgress?.reached) return "¡Has alcanzado tu objetivo! ¡Enhorabuena!";
    if (weekChange != null) {
      const gaining = goalWeight && goalWeight > (logs[0]?.weight_kg ?? 0);
      if (gaining) {
        if (weekChange > 0.1) return "¡Buen progreso esta semana! Sigue así.";
        if (weekChange < -0.1) return "No pasa nada, lo importante es la constancia.";
      } else {
        if (weekChange < -0.1) return "¡Buen progreso esta semana! Sigue así.";
        if (weekChange > 0.1) return "No pasa nada, lo importante es la constancia.";
      }
    }
    if (streak >= 7) return "¡Increíble racha de " + streak + " días! La constancia es la clave.";
    if (streak >= 3) return "¡Vas muy bien! Sigue registrando cada día.";
    return "Cada registro cuenta. ¡Tú puedes!";
  };

  const isEmpty = logs.length === 0;

  return (
    <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
      {/* Weight input card */}
      <div style={{
        background: T.accentGrad, borderRadius: T.r5, padding: "1.5rem",
        marginBottom: "1rem", boxShadow: "0 4px 20px var(--accent-shadow)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".8rem" }}>
          <div>
            <span style={{
              display: "inline-block", background: "rgba(255,255,255,.3)",
              color: T.textOnAccent, fontSize: ".72rem", fontWeight: 700,
              padding: "2px 10px", borderRadius: T.r5, letterSpacing: ".06em",
            }}>{isToday ? "PESO DE HOY" : "REGISTRO"}</span>
            <label style={{ display: "block", cursor: "pointer", position: "relative" }}>
              <h2 style={{
                color: T.textOnAccent, fontSize: "1.1rem", fontWeight: 700,
                margin: ".3rem 0 0", textTransform: "capitalize",
              }}>{formatDateLabel(selectedDate)}</h2>
              <input type="date" value={selectedDate} max={today}
                onChange={e => { if (e.target.value) setSelectedDate(e.target.value); }}
                style={{
                  position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                  opacity: 0, cursor: "pointer",
                }} />
            </label>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".3rem" }}>
            {hasExisting && (
              <div style={{ color: "rgba(255,255,255,.8)", fontSize: ".78rem", fontWeight: 500, display: "flex", alignItems: "center", gap: ".3rem" }}>
                Registrado <Check size={14} strokeWidth={2.5} />
              </div>
            )}
            {!isToday && (
              <button onClick={() => setSelectedDate(today)} style={{
                background: "rgba(255,255,255,.25)", border: "none", borderRadius: T.r3,
                color: T.textOnAccent, padding: "3px 10px", cursor: "pointer",
                fontSize: ".72rem", fontWeight: 600,
              }}>Hoy</button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <input type="number" inputMode="decimal" step="0.1" min="20" max="300"
              placeholder="0.0" value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              style={{
                width: "100%", padding: ".85rem 1rem",
                background: "rgba(255,255,255,.95)", border: "none",
                borderRadius: T.r3, color: T.text, fontSize: "1.5rem",
                fontWeight: 700, outline: "none", textAlign: "center",
              }} />
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".75rem", textAlign: "center", marginTop: ".3rem" }}>kg</div>
          </div>
          <button onClick={saveWeight} disabled={saving || !weightInput} style={{
            padding: ".85rem 1.5rem", background: "rgba(255,255,255,.95)",
            border: "none", borderRadius: T.r3, color: T.accentDark,
            fontWeight: 700, fontSize: ".95rem", flexShrink: 0,
            cursor: !weightInput || saving ? "default" : "pointer",
            opacity: !weightInput || saving ? .6 : 1, transition: "opacity .15s",
          }}>{saving ? "..." : hasExisting ? "Actualizar" : "Guardar"}</button>
        </div>
      </div>

      {isEmpty ? (
        <div style={{
          background: T.bgCard, borderRadius: T.r5, padding: "2.5rem 1.5rem",
          boxShadow: T.shadowCard, textAlign: "center",
        }}>
          <div style={{ marginBottom: ".8rem", display: "flex", justifyContent: "center" }}>
            <BarChart3 size={48} color={T.accent} strokeWidth={1.5} />
          </div>
          <h3 style={{ color: T.text, fontSize: "1.1rem", fontWeight: 700, marginBottom: ".5rem" }}>
            Empieza tu seguimiento
          </h3>
          <p style={{ color: T.textMuted, fontSize: ".88rem", lineHeight: 1.5 }}>
            Registra tu peso cada día para ver tu tendencia y progreso a lo largo del tiempo.
          </p>
        </div>
      ) : (
        <>
          {/* Goal progress bar */}
          {goalProgress && (
            <div style={{
              background: T.bgCard, borderRadius: T.r4, padding: "1rem 1.2rem",
              boxShadow: T.shadowCard, marginBottom: "1rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                  <Target size={14} color={T.accent} strokeWidth={2} />
                  <span style={{ fontSize: ".8rem", fontWeight: 700, color: T.text }}>Progreso al objetivo</span>
                </div>
                <span style={{ fontSize: ".85rem", fontWeight: 700, color: goalProgress.reached ? T.success : T.accent }}>
                  {goalProgress.pct.toFixed(0)}%
                </span>
              </div>
              <div style={{
                height: "8px", background: T.borderGray, borderRadius: "4px",
                overflow: "hidden", marginBottom: ".4rem",
              }}>
                <div style={{
                  height: "100%", borderRadius: "4px", transition: "width .3s ease",
                  width: goalProgress.pct + "%",
                  background: goalProgress.reached ? T.success : T.accentGrad,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: ".72rem", color: T.textMuted }}>
                  {goalProgress.reached ? "¡Objetivo alcanzado!" : `${goalProgress.remaining.toFixed(1)} kg restantes`}
                </span>
                <span style={{ fontSize: ".72rem", color: T.textMuted }}>Meta: {goalWeight} kg</span>
              </div>
            </div>
          )}

          {/* Chart with range selector */}
          <WeightChart logs={logs} goalWeight={goalWeight} today={today} range={chartRange} />
          <div style={{
            display: "flex", justifyContent: "center", gap: ".4rem",
            marginTop: "-0.6rem", marginBottom: "1rem",
          }}>
            {CHART_RANGES.map(r => (
              <button key={r.value} onClick={() => setChartRange(r.value)} style={{
                padding: ".35rem .7rem", border: "none", borderRadius: T.r3, cursor: "pointer",
                fontSize: ".72rem", fontWeight: 600,
                background: chartRange === r.value ? T.accentGrad : T.bgCardWarm,
                color: chartRange === r.value ? T.textOnAccent : T.textMuted,
                transition: "all .15s",
              }}>{r.label}</button>
            ))}
          </div>

          {/* Goal weight */}
          <div style={{
            background: T.bgCard, borderRadius: T.r4, padding: ".9rem 1rem",
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
                    border: `1.5px solid ${T.borderGray}`, borderRadius: T.r3,
                    color: T.text, fontSize: ".9rem", outline: "none",
                  }} />
                <button onClick={saveGoal} style={{
                  background: T.accentGrad, border: "none", borderRadius: T.r3,
                  color: T.textOnAccent, padding: ".5rem .75rem", fontWeight: 700, fontSize: ".82rem", cursor: "pointer",
                }}>OK</button>
                <button onClick={() => setShowGoalInput(false)} style={{
                  background: T.bg, border: "none", borderRadius: T.r3,
                  color: T.textMuted, padding: ".5rem .6rem", cursor: "pointer", fontSize: ".82rem",
                }}><X size={14} /></button>
              </div>
            ) : (
              <>
                <div>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: T.textSub }}>Objetivo: </span>
                  <span style={{ fontSize: ".88rem", fontWeight: 700, color: goalWeight ? T.success : T.textMuted }}>
                    {goalWeight ? `${goalWeight} kg` : "Sin definir"}
                  </span>
                </div>
                <button onClick={() => { setShowGoalInput(true); setGoalInput(goalWeight ? String(goalWeight) : ""); }} style={{
                  background: T.bg, border: `1.5px solid ${T.borderGray}`,
                  borderRadius: T.r3, color: T.textSub, padding: ".4rem .75rem",
                  cursor: "pointer", fontSize: ".78rem", fontWeight: 600,
                }}>{goalWeight ? "Cambiar" : "Definir"}</button>
              </>
            )}
          </div>

          {/* Stats row 1: week, month, streak */}
          <div style={{ display: "flex", gap: ".6rem", marginBottom: ".6rem" }}>
            <StatCard label="SEMANA" value={weekChange} type="change" />
            <StatCard label="MES" value={monthChange} type="change" />
            <div style={{ flex: 1, background: T.bgCard, borderRadius: T.r4, padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
              <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, marginBottom: ".3rem", letterSpacing: ".03em" }}>RACHA</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: streak > 0 ? T.accent : T.textMuted }}>{streak}</div>
              <div style={{ fontSize: ".68rem", color: T.textMuted }}>día{streak !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Stats row 2: min, avg, max */}
          <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem" }}>
            <StatCard label="MÍNIMO" value={periodMin} type="weight" />
            <StatCard label="MEDIA" value={periodAvg} type="weight" />
            <StatCard label="MÁXIMO" value={periodMax} type="weight" />
          </div>

          {/* Motivational message */}
          <div style={{
            background: T.bgCardWarm, borderRadius: T.r4, padding: ".9rem 1.2rem",
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
            borderRadius: T.r4, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
          }}>
            <span style={{ fontSize: ".88rem", fontWeight: 700, color: T.accentDark }}>
              {showDailyLog ? "Ocultar registro" : `Ver registro diario (${logs.length})`}
            </span>
            <span style={{ color: T.accentDark, display: "flex", alignItems: "center" }}>
              {showDailyLog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {/* Daily log list with delete */}
          {showDailyLog && (
            <div style={{
              background: T.bgCard, borderRadius: T.r5, padding: "1rem 1.2rem",
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
                  const isTodayEntry = l.date === today;
                  const isConfirming = confirmDeleteDate === l.date;
                  return (
                    <div key={l.date} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: ".6rem .5rem",
                      background: isTodayEntry ? T.accentLight : "transparent",
                      borderRadius: isTodayEntry ? T.r3 : "0",
                      borderBottom: i < logs.length - 1 && !isTodayEntry ? `1px solid ${T.borderGray}` : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                        <div style={{
                          width: "38px", height: "38px", borderRadius: T.r3,
                          background: isTodayEntry ? T.accentGrad : T.bgCardWarm,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: ".62rem", fontWeight: 600, color: isTodayEntry ? T.textOnAccent : T.textMuted, lineHeight: 1, textTransform: "uppercase" }}>
                            {dayName}
                          </span>
                          <span style={{ fontSize: ".88rem", fontWeight: 700, color: isTodayEntry ? T.textOnAccent : T.text, lineHeight: 1.15 }}>
                            {dayNum}
                          </span>
                        </div>
                        <span style={{ fontSize: ".8rem", color: isTodayEntry ? T.accentDark : T.textMuted, fontWeight: isTodayEntry ? 600 : 400, textTransform: "capitalize" }}>{monthName}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                        {isConfirming ? (
                          <div style={{ display: "flex", gap: ".3rem", alignItems: "center" }}>
                            <span style={{ fontSize: ".7rem", color: T.danger, fontWeight: 600 }}>¿Eliminar?</span>
                            <button onClick={() => handleDelete(l.date)} style={{
                              background: T.dangerBg, border: "none", borderRadius: T.r2,
                              color: T.dangerText, padding: "3px 8px", cursor: "pointer",
                              fontSize: ".7rem", fontWeight: 700,
                            }}>Sí</button>
                            <button onClick={() => setConfirmDeleteDate(null)} style={{
                              background: T.bg, border: "none", borderRadius: T.r2,
                              color: T.textMuted, padding: "3px 8px", cursor: "pointer",
                              fontSize: ".7rem", fontWeight: 600,
                            }}>No</button>
                          </div>
                        ) : (
                          <>
                            {diff != null && (
                              <span style={{ fontSize: ".75rem", fontWeight: 600, color: chgColor(diff) }}>
                                {chgArrow(diff)} {Math.abs(diff).toFixed(1)}
                              </span>
                            )}
                            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: isTodayEntry ? T.accentDark : T.text }}>{l.weight_kg.toFixed(1)}</span>
                            <span style={{ fontSize: ".72rem", color: T.textMuted }}>kg</span>
                            <button onClick={() => setConfirmDeleteDate(l.date)} style={{
                              background: "transparent", border: "none", cursor: "pointer",
                              padding: "4px", display: "flex", alignItems: "center",
                              color: T.textMuted, opacity: .5, transition: "opacity .15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                            onMouseLeave={e => e.currentTarget.style.opacity = ".5"}>
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHART_RANGES = [
  { value: 30, label: "1 mes" },
  { value: 90, label: "3 meses" },
  { value: 180, label: "6 meses" },
  { value: 0, label: "Todo" },
];

const chgColor = (v) => v < -0.05 ? T.success : v > 0.05 ? T.danger : T.textMuted;
const chgArrow = (v) => v < -0.05 ? "↓" : v > 0.05 ? "↑" : "→";

function StatCard({ label, value, type = "change" }) {
  if (type === "weight") {
    return (
      <div style={{ flex: 1, background: T.bgCard, borderRadius: T.r4, padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
        <div style={{ fontSize: ".7rem", color: T.textMuted, fontWeight: 600, marginBottom: ".3rem", letterSpacing: ".03em" }}>{label}</div>
        {value != null ? (<>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: T.text }}>{value.toFixed(1)}</div>
          <div style={{ fontSize: ".68rem", color: T.textMuted }}>kg</div>
        </>) : <div style={{ fontSize: ".8rem", color: T.textMuted }}>—</div>}
      </div>
    );
  }
  return (
    <div style={{ flex: 1, background: T.bgCard, borderRadius: T.r4, padding: ".9rem .7rem", boxShadow: T.shadowCard, textAlign: "center" }}>
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

// ─── Chart sub-component ─────────────────────────────────────────────────────

function WeightChart({ logs, goalWeight, today, range }) {
  const chartData = useMemo(() => {
    let days;
    if (range === 0) {
      // All time
      if (logs.length === 0) return null;
      const first = new Date(logs[0].date + "T00:00:00");
      const last = new Date();
      days = Math.max(Math.ceil((last - first) / 86400000) + 1, 7);
    } else {
      days = range;
    }

    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const pts = dates.map(dt => { const l = logs.find(x => x.date === dt); return l ? l.weight_kg : null; });
    const valid = pts.filter(v => v !== null);
    if (valid.length < 2) return null;

    const movAvgWindow = 7;
    const movAvg = pts.map((_, i) => {
      const w = pts.slice(Math.max(0, i - movAvgWindow + 1), i + 1).filter(v => v !== null);
      return w.length >= 1 ? w.reduce((a, b) => a + b, 0) / w.length : null;
    });

    const CW = 560, CH = 220, PL = 45, PT = 15, PB = 28, PRt = 15;
    const gW = CW - PL - PRt, gH = CH - PT - PB;
    const allVals = [...valid];
    if (goalWeight) allVals.push(goalWeight);
    const lo = Math.min(...allVals) - 0.5;
    const hi = Math.max(...allVals) + 0.5;
    const rng = Math.max(hi - lo, 1);
    const xOf = (i) => PL + (i / (days - 1)) * gW;
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

    // Adaptive x-axis labels (always ~5 labels)
    const labelCount = 5;
    const step = Math.max(1, Math.floor((days - 1) / (labelCount - 1)));
    const xLabels = [];
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.min(i * step, days - 1);
      const dt = dates[idx];
      let label;
      if (days <= 60) {
        label = dt.slice(5).replace("-", "/");
      } else {
        const d = new Date(dt + "T00:00:00");
        label = d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
        if (days > 365) label += " " + dt.slice(2, 4);
      }
      xLabels.push({ x: xOf(idx), label });
    }

    return { CW, CH, PL, PRt, segs, dots, avgPts, yTicks, xLabels, smooth, yOf, goalWeight, days };
  }, [logs, goalWeight, range]);

  if (!chartData) return null;
  const { CW, CH, PL, PRt, segs, dots, avgPts, yTicks, xLabels, smooth, yOf, days } = chartData;

  return (
    <div style={{
      background: T.bgCard, borderRadius: T.r5, padding: "1.2rem 1rem .8rem",
      boxShadow: T.shadowCard, marginBottom: "1rem",
    }}>
      <h4 style={{ fontSize: ".85rem", fontWeight: 700, color: T.text, marginBottom: ".6rem", paddingLeft: ".3rem" }}>
        {days <= 30 ? "Últimos 30 días" : days <= 90 ? "Últimos 3 meses" : days <= 180 ? "Últimos 6 meses" : "Todo el historial"}
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
        {goalWeight && (
          <>
            <line x1={PL} y1={yOf(goalWeight)} x2={CW - PRt} y2={yOf(goalWeight)}
              stroke="#4aba6a" strokeWidth="1.5" strokeDasharray="6,4" style={{ stroke: T.success }} />
            <text x={CW - PRt + 4} y={yOf(goalWeight) + 3} fontSize="9" fontFamily="sans-serif" style={{ fill: T.success }}>
              Meta
            </text>
          </>
        )}
        {segs.map((s, si) => (
          <polyline key={si} points={s.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            fill="none" stroke={T.textMuted} strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" />
        ))}
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={days > 90 ? 2 : 3} fill={T.bgCard} stroke={T.textMuted} strokeWidth="1.5" />
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
            <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" strokeWidth="1.5" strokeDasharray="4,3" style={{ stroke: T.success }} /></svg>
            <span style={{ fontSize: ".7rem", color: T.textMuted }}>Objetivo</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WeightView);
