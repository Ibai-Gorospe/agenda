import { pad } from "./helpers";

const DAY_MS = 86400000;
const MOVING_AVERAGE_WINDOW = 7;
const Y_TICK_COUNT = 5;
const X_LABEL_COUNT = 5;

const CHART_DIMENSIONS = {
  CW: 560,
  CH: 220,
  PL: 45,
  PT: 15,
  PB: 28,
  PRt: 15,
};

const toDateStr = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
);

const cloneDate = (value) => (
  value instanceof Date ? new Date(value) : new Date(value)
);

const findNearestLog = (logs, targetDate, maxDaysDiff = 3) => {
  const target = new Date(targetDate + "T00:00:00").getTime();
  let closest = null;
  let minDiff = Infinity;

  for (const log of logs) {
    const logTime = new Date(log.date + "T00:00:00").getTime();
    const diff = Math.abs(logTime - target);
    if (diff < minDiff && diff <= maxDaysDiff * DAY_MS) {
      minDiff = diff;
      closest = log;
    }
  }

  return closest;
};

const getGoalProgress = (logs, goalWeight) => {
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
};

const getWeightMessage = ({ logs, streak, goalProgress, weekChange, goalWeight }) => {
  if (logs.length === 0) return "\u00a1Registra tu peso hoy para empezar el seguimiento!";
  if (streak === 0) return "\u00a1Registra tu peso hoy para no perder la racha!";
  if (goalProgress?.reached) return "\u00a1Has alcanzado tu objetivo! \u00a1Enhorabuena!";

  if (weekChange != null) {
    const gaining = goalWeight && goalWeight > (logs[0]?.weight_kg ?? 0);
    if (gaining) {
      if (weekChange > 0.1) return "\u00a1Buen progreso esta semana! Sigue asi.";
      if (weekChange < -0.1) return "No pasa nada, lo importante es la constancia.";
    } else {
      if (weekChange < -0.1) return "\u00a1Buen progreso esta semana! Sigue asi.";
      if (weekChange > 0.1) return "No pasa nada, lo importante es la constancia.";
    }
  }

  if (streak >= 7) return `\u00a1Increible racha de ${streak} dias! La constancia es la clave.`;
  if (streak >= 3) return "\u00a1Vas muy bien! Sigue registrando cada dia.";
  return "Cada registro cuenta. \u00a1Tu puedes!";
};

const smoothPoints = (points) => {
  if (points.length < 2) return "";

  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return path + `L${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    path += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)},${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)},${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return path;
};

export function deriveWeightInsights({
  logs,
  chartRange,
  goalWeight,
  referenceDate,
}) {
  const now = cloneDate(referenceDate);
  const currentKg = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;

  const weekAgo = cloneDate(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = cloneDate(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const weekAgoEntry = findNearestLog(logs, toDateStr(weekAgo));
  const monthAgoEntry = findNearestLog(logs, toDateStr(monthAgo), 5);
  const weekChange = currentKg != null && weekAgoEntry ? currentKg - weekAgoEntry.weight_kg : null;
  const monthChange = currentKg != null && monthAgoEntry ? currentKg - monthAgoEntry.weight_kg : null;

  let streak = 0;
  const streakCursor = cloneDate(now);
  while (true) {
    const cursorDate = toDateStr(streakCursor);
    if (logs.some(log => log.date === cursorDate)) {
      streak++;
      streakCursor.setDate(streakCursor.getDate() - 1);
      continue;
    }
    break;
  }

  const periodLogs = (() => {
    if (chartRange === 0) return logs;
    const cutoff = cloneDate(now);
    cutoff.setDate(cutoff.getDate() - chartRange);
    const cutoffStr = toDateStr(cutoff);
    return logs.filter(log => log.date >= cutoffStr);
  })();

  const periodMin = periodLogs.length > 0 ? Math.min(...periodLogs.map(log => log.weight_kg)) : null;
  const periodMax = periodLogs.length > 0 ? Math.max(...periodLogs.map(log => log.weight_kg)) : null;
  const periodAvg = periodLogs.length > 0
    ? periodLogs.reduce((sum, log) => sum + log.weight_kg, 0) / periodLogs.length
    : null;

  const goalProgress = getGoalProgress(logs, goalWeight);

  return {
    weekChange,
    monthChange,
    streak,
    periodMin,
    periodMax,
    periodAvg,
    goalProgress,
    message: getWeightMessage({ logs, streak, goalProgress, weekChange, goalWeight }),
    isEmpty: logs.length === 0,
  };
}

export function buildWeightChartData({
  logs,
  goalWeight,
  range,
  referenceDate,
}) {
  const now = cloneDate(referenceDate);
  let days;

  if (range === 0) {
    if (logs.length === 0) return null;
    const first = new Date(logs[0].date + "T00:00:00");
    days = Math.max(Math.ceil((now - first) / DAY_MS) + 1, 7);
  } else {
    days = range;
  }

  const dates = Array.from({ length: days }, (_, index) => {
    const date = cloneDate(now);
    date.setDate(date.getDate() - (days - 1 - index));
    return toDateStr(date);
  });

  const points = dates.map((date) => {
    const log = logs.find(entry => entry.date === date);
    return log ? log.weight_kg : null;
  });
  const validPoints = points.filter(point => point !== null);
  if (validPoints.length < 2) return null;

  const movingAverage = points.map((_, index) => {
    const window = points
      .slice(Math.max(0, index - MOVING_AVERAGE_WINDOW + 1), index + 1)
      .filter(point => point !== null);
    return window.length >= 1
      ? window.reduce((sum, point) => sum + point, 0) / window.length
      : null;
  });

  const { CW, CH, PL, PT, PB, PRt } = CHART_DIMENSIONS;
  const graphWidth = CW - PL - PRt;
  const graphHeight = CH - PT - PB;
  const allValues = [...validPoints];
  if (goalWeight) allValues.push(goalWeight);

  const low = Math.min(...allValues) - 0.5;
  const high = Math.max(...allValues) + 0.5;
  const rangeValue = Math.max(high - low, 1);
  const xOf = (index) => PL + (index / (days - 1)) * graphWidth;
  const yOf = (value) => PT + graphHeight - ((value - low) / rangeValue) * graphHeight;

  const segments = [];
  let segment = [];
  points.forEach((value, index) => {
    if (value != null) {
      segment.push({ x: xOf(index), y: yOf(value) });
      return;
    }
    if (segment.length >= 2) segments.push(segment);
    segment = [];
  });
  if (segment.length >= 2) segments.push(segment);

  const dots = points
    .map((value, index) => (value != null ? { x: xOf(index), y: yOf(value) } : null))
    .filter(Boolean);
  const avgPts = movingAverage
    .map((value, index) => (value != null ? { x: xOf(index), y: yOf(value) } : null))
    .filter(Boolean);
  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, index) => low + (rangeValue * index) / (Y_TICK_COUNT - 1));

  const step = Math.max(1, Math.floor((days - 1) / (X_LABEL_COUNT - 1)));
  const xLabels = [];
  for (let i = 0; i < X_LABEL_COUNT; i++) {
    const index = Math.min(i * step, days - 1);
    const date = dates[index];
    let label;

    if (days <= 60) {
      label = date.slice(5).replace("-", "/");
    } else {
      const labelDate = new Date(date + "T00:00:00");
      label = labelDate.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
      if (days > 365) label += " " + date.slice(2, 4);
    }

    xLabels.push({ x: xOf(index), label });
  }

  return {
    CW,
    CH,
    PL,
    PRt,
    segs: segments,
    dots,
    avgPts,
    yTicks,
    xLabels,
    smooth: smoothPoints,
    yOf,
    goalWeight,
    days,
  };
}
