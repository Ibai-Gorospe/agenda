import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WeightView from "../components/WeightView";

const mockFetchWeightLogs = vi.fn();
const mockUpsertWeightLog = vi.fn();
const mockFetchWeightGoal = vi.fn();
const mockUpsertWeightGoal = vi.fn();
const mockDeleteWeightLog = vi.fn();

vi.mock("../api/weightLogs", () => ({
  fetchWeightLogs: (...args) => mockFetchWeightLogs(...args),
  upsertWeightLog: (...args) => mockUpsertWeightLog(...args),
  fetchWeightGoal: (...args) => mockFetchWeightGoal(...args),
  upsertWeightGoal: (...args) => mockUpsertWeightGoal(...args),
  deleteWeightLog: (...args) => mockDeleteWeightLog(...args),
}));

describe("WeightView", () => {
  beforeEach(() => {
    mockFetchWeightLogs.mockReset();
    mockUpsertWeightLog.mockReset();
    mockFetchWeightGoal.mockReset();
    mockUpsertWeightGoal.mockReset();
    mockDeleteWeightLog.mockReset();
    mockFetchWeightLogs.mockResolvedValue([]);
    mockFetchWeightGoal.mockResolvedValue(null);
    mockUpsertWeightLog.mockResolvedValue({ id: "log-1", date: "2026-03-11", weight_kg: 80 });
    mockUpsertWeightGoal.mockResolvedValue(undefined);
    mockDeleteWeightLog.mockResolvedValue(undefined);
  });

  it("shows an error instead of staying in loading state when load fails", async () => {
    mockFetchWeightLogs.mockRejectedValueOnce(new Error("network"));

    render(<WeightView user={{ id: "user-1" }} today="2026-03-11" onCreateAccount={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar los registros de peso.");
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
  });

  it("surfaces save errors and re-enables the button", async () => {
    mockUpsertWeightLog.mockRejectedValueOnce(new Error("save failed"));

    render(<WeightView user={{ id: "user-1" }} today="2026-03-11" onCreateAccount={vi.fn()} />);
    await screen.findByText("Empieza tu seguimiento");

    fireEvent.change(screen.getByPlaceholderText("0.0"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar el peso.");
    expect(await screen.findByRole("button", { name: "Guardar" })).not.toBeDisabled();
  });

  it("keeps the saved log id so the new record can be deleted without reloading", async () => {
    render(<WeightView user={{ id: "user-1" }} today="2026-03-11" onCreateAccount={vi.fn()} />);
    await screen.findByText("Empieza tu seguimiento");

    fireEvent.change(screen.getByPlaceholderText("0.0"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("button", { name: /Ver registro diario \(1\)/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver registro diario \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar registro de peso del 2026-03-11" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminacion del registro 2026-03-11" }));

    await waitFor(() => expect(mockDeleteWeightLog).toHaveBeenCalledWith("log-1"));
  });
});
