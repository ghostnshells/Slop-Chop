export interface DateWindow {
  start: number;
  size: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function initialWindow(length: number): DateWindow {
  const size = Math.min(length, 14);
  return { start: Math.max(0, length - size), size };
}

function place(size: number, anchor: number, length: number): DateWindow {
  const start = clamp(anchor - Math.floor((size - 1) / 2), 0, Math.max(0, length - size));
  return { start, size };
}

export function zoomWindow(
  window: DateWindow,
  length: number,
  direction: "in" | "out" | "reset",
  anchor: number,
): DateWindow {
  if (direction === "reset" || length === 0) return initialWindow(length);
  const size =
    direction === "in"
      ? Math.max(1, Math.ceil(window.size / 2))
      : Math.min(length, Math.max(window.size + 1, window.size * 2));
  return place(size, anchor, length);
}

export function panWindow(window: DateWindow, delta: number, length: number): DateWindow {
  return {
    size: window.size,
    start: clamp(window.start + delta, 0, Math.max(0, length - window.size)),
  };
}

export function revealIndex(window: DateWindow, index: number, length: number): DateWindow {
  if (index < window.start) return { ...window, start: index };
  if (index >= window.start + window.size) {
    return {
      ...window,
      start: clamp(index - window.size + 1, 0, Math.max(0, length - window.size)),
    };
  }
  return window;
}
