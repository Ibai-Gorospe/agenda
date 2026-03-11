import { describe, expect, it } from "vitest";
import { buildWeightChartData, deriveWeightInsights } from "../weightHelpers";

describe("deriveWeightInsights", () => {
  it("keeps weekly and period stats stable for a fixed reference date", () => {
    const insights = deriveWeightInsights({
      logs: [
        { id: "log-1", date: "2026-03-04", weight_kg: 80 },
        { id: "log-2", date: "2026-03-10", weight_kg: 79.6 },
        { id: "log-3", date: "2026-03-11", weight_kg: 79.2 },
      ],
      chartRange: 30,
      goalWeight: 75,
      referenceDate: new Date("2026-03-11T12:00:00"),
    });

    expect(insights.weekChange).toBeCloseTo(-0.8);
    expect(insights.monthChange).toBeNull();
    expect(insights.streak).toBe(2);
    expect(insights.periodMin).toBeCloseTo(79.2);
    expect(insights.periodMax).toBe(80);
    expect(insights.periodAvg).toBeCloseTo(79.6);
    expect(insights.goalProgress).toEqual(expect.objectContaining({
      reached: false,
    }));
    expect(insights.goalProgress.pct).toBeCloseTo(16);
    expect(insights.goalProgress.remaining).toBeCloseTo(4.2);
    expect(insights.isEmpty).toBe(false);
  });

  it("returns an empty-state message when there are no logs", () => {
    const insights = deriveWeightInsights({
      logs: [],
      chartRange: 30,
      goalWeight: null,
      referenceDate: new Date("2026-03-11T12:00:00"),
    });

    expect(insights).toEqual(expect.objectContaining({
      weekChange: null,
      monthChange: null,
      streak: 0,
      periodMin: null,
      periodMax: null,
      periodAvg: null,
      goalProgress: null,
      isEmpty: true,
    }));
    expect(insights.message).toContain("Registra tu peso hoy");
  });
});

describe("buildWeightChartData", () => {
  it("builds chart geometry for a fixed range", () => {
    const chartData = buildWeightChartData({
      logs: [
        { id: "log-1", date: "2026-03-09", weight_kg: 80 },
        { id: "log-2", date: "2026-03-10", weight_kg: 79.7 },
        { id: "log-3", date: "2026-03-11", weight_kg: 79.4 },
      ],
      goalWeight: 75,
      range: 30,
      referenceDate: new Date("2026-03-11T12:00:00"),
    });

    expect(chartData).toEqual(expect.objectContaining({
      days: 30,
      goalWeight: 75,
    }));
    expect(chartData.yTicks).toHaveLength(5);
    expect(chartData.xLabels).toHaveLength(5);
    expect(chartData.dots).toHaveLength(3);
    expect(chartData.avgPts.length).toBeGreaterThanOrEqual(3);
    expect(chartData.smooth(chartData.avgPts)).toMatch(/^M/);
  });

  it("returns null when there are not enough points to render the chart", () => {
    expect(buildWeightChartData({
      logs: [{ id: "log-1", date: "2026-03-11", weight_kg: 80 }],
      goalWeight: null,
      range: 30,
      referenceDate: new Date("2026-03-11T12:00:00"),
    })).toBeNull();
  });
});
