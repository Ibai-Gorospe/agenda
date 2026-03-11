import { describe, expect, it } from "vitest";
import { getChecklistMeta } from "../checklist";

describe("getChecklistMeta", () => {
  it("summarizes checklist counts and keeps pending items first in the preview", () => {
    expect(getChecklistMeta([
      { id: "sub-1", text: "Preparar informe", done: false },
      { id: "sub-2", text: "Enviar email", done: true },
      { id: "sub-3", text: "Cerrar pendientes", done: false },
    ])).toEqual(expect.objectContaining({
      total: 3,
      completed: 1,
      pending: 2,
      previewText: "Preparar informe • Cerrar pendientes",
      remainingPreviewCount: 0,
    }));
  });

  it("falls back to completed items when everything is already done", () => {
    expect(getChecklistMeta([
      { id: "sub-1", text: "Serie A", done: true },
      { id: "sub-2", text: "Serie B", done: true },
      { id: "sub-3", text: "Serie C", done: true },
    ])).toEqual(expect.objectContaining({
      total: 3,
      completed: 3,
      pending: 0,
      previewText: "Serie A • Serie B",
      remainingPreviewCount: 1,
    }));
  });
});
