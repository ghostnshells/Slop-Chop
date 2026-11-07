import { describe, expect, it } from "vitest";
import { initialWindow, panWindow, zoomWindow } from "./window";

describe("chart window", () => {
  it("starts on the latest two weeks and zooms around the anchor", () => {
    expect(initialWindow(6)).toEqual({ start: 0, size: 6 });
    expect(initialWindow(20)).toEqual({ start: 6, size: 14 });
    expect(zoomWindow({ start: 0, size: 6 }, 6, "in", 5)).toEqual({ start: 3, size: 3 });
    expect(zoomWindow({ start: 3, size: 3 }, 6, "out", 5).size).toBe(6);
    expect(zoomWindow({ start: 3, size: 3 }, 6, "reset", 0)).toEqual({ start: 0, size: 6 });
  });

  it("pans without leaving the series", () => {
    expect(panWindow({ start: 3, size: 3 }, -10, 6).start).toBe(0);
    expect(panWindow({ start: 3, size: 3 }, 10, 6).start).toBe(3);
    expect(panWindow({ start: 0, size: 3 }, 1, 6)).toEqual({ start: 1, size: 3 });
  });
});
