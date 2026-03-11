import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import StatsView from "../components/StatsView";

describe("StatsView", () => {
  it("uses the Monday of the current week even when today is Sunday", () => {
    render(
      <StatsView
        today="2026-03-08"
        onClose={() => {}}
        tasks={{
          "2026-03-02": [{ id: "current-week", text: "Actual", done: true }],
          "2026-02-24": [
            { id: "previous-week-1", text: "Anterior 1", done: true },
            { id: "previous-week-2", text: "Anterior 2", done: true },
          ],
        }}
      />
    );

    const thisWeek = screen.getByText("Esta semana").parentElement;
    const lastWeek = screen.getByText("Semana anterior").parentElement;

    expect(within(thisWeek).getByText("1")).toBeInTheDocument();
    expect(within(lastWeek).getByText("2")).toBeInTheDocument();
  });
});
