import { useEffect, useId, useRef, useState } from "react";
import type { DayAggregate } from "../lib/types";
import { formatCount, formatDay } from "../lib/format";
import {
  initialWindow,
  panWindow,
  revealIndex,
  zoomWindow,
  type DateWindow,
} from "../lib/window";

type SeriesMode = "new" | "cumulative";

function valueFor(day: DayAggregate, mode: SeriesMode): number {
  return mode === "new" ? day.newBlocks : day.cumulativeRecorded;
}

function barLabel(day: DayAggregate, mode: SeriesMode): string {
  const kind = mode === "new" ? "newly blocked" : "cumulative newly blocked";
  const partial = day.status === "partial" ? ", partial incomplete day" : "";
  return `${formatDay(day.date, "long")}, ${formatCount(valueFor(day, mode))} ${kind}${partial}`;
}

export function DailyChart({
  days,
  mode,
  onMode,
  selected,
  onSelect,
}: {
  days: DayAggregate[];
  mode: SeriesMode;
  onMode: (mode: SeriesMode) => void;
  selected: string | null;
  onSelect: (date: string | null) => void;
}) {
  const captionId = useId();
  const [window, setWindow] = useState<DateWindow>(() => initialWindow(days.length));
  const suppressClick = useRef(false);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setWindow(initialWindow(days.length));
  }, [days.length]);

  const visible = days.slice(window.start, window.start + window.size);
  const max = Math.max(...visible.map((day) => valueFor(day, mode)), 1);
  const maxStart = Math.max(0, days.length - window.size);
  const selectedIndex = selected ? days.findIndex((day) => day.date === selected) : -1;
  const anchor = selectedIndex >= 0 ? selectedIndex : Math.max(0, days.length - 1);

  function focusDay(index: number) {
    const next = Math.min(days.length - 1, Math.max(0, index));
    setWindow((current) => revealIndex(current, next, days.length));
    onSelect(days[next]?.date ?? null);
    requestAnimationFrame(() => buttonRefs.current[next]?.focus());
  }

  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setWindow((current) =>
        zoomWindow(current, days.length, event.deltaY > 0 ? "out" : "in", anchor),
      );
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [anchor, days.length]);

  const first = visible[0];
  const last = visible[visible.length - 1];
  const windowText =
    first && last
      ? `Showing ${formatDay(first.date)}–${formatDay(last.date)}, ${visible.length} of ${days.length} days`
      : "No days";

  return (
    <div className="chart-panel">
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Series">
          <button
            type="button"
            aria-pressed={mode === "new"}
            onClick={() => onMode("new")}
          >
            Newly blocked
          </button>
          <button
            type="button"
            aria-pressed={mode === "cumulative"}
            onClick={() => onMode("cumulative")}
          >
            Cumulative
          </button>
        </div>
        <div className="segmented" role="group" aria-label="Chart window">
          <button
            type="button"
            onClick={() => setWindow((current) => zoomWindow(current, days.length, "in", anchor))}
          >
            Zoom in
          </button>
          <button
            type="button"
            onClick={() => setWindow((current) => zoomWindow(current, days.length, "out", anchor))}
          >
            Zoom out
          </button>
          <button
            type="button"
            onClick={() => setWindow(zoomWindow(window, days.length, "reset", anchor))}
          >
            Reset view
          </button>
          <button
            type="button"
            onClick={() => setWindow((current) => panWindow(current, -1, days.length))}
            disabled={window.start === 0}
          >
            Pan earlier
          </button>
          <button
            type="button"
            onClick={() => setWindow((current) => panWindow(current, 1, days.length))}
            disabled={window.start >= maxStart}
          >
            Pan later
          </button>
        </div>
        <p className="window-status" aria-live="polite">
          {windowText}
        </p>
      </div>

      <div
        className={`chart ${mode}`}
        role="group"
        aria-label={
          mode === "new" ? "Daily newly blocked accounts" : "Cumulative newly blocked accounts"
        }
        aria-describedby={captionId}
      >
        <div className="chart-layout">
          <div className="y-axis" aria-hidden="true">
            <span className="value-spacer" />
            <span className="track-axis">
              <span>{formatCount(max)}</span>
              <span>{formatCount(Math.round(max / 2))}</span>
              <span>0</span>
            </span>
            <span className="label-spacer" />
          </div>
          <div
            className="plot"
            ref={plotRef}
            onPointerDown={(event) => {
              drag.current = { x: event.clientX, start: window.start, moved: false };
            }}
            onPointerMove={(event) => {
              if (!drag.current || maxStart === 0) return;
              const dx = event.clientX - drag.current.x;
              if (Math.abs(dx) < 12) return;
              drag.current.moved = true;
              suppressClick.current = true;
              const shift = Math.round(-dx / 72);
              setWindow((current) => ({
                ...current,
                start: panWindow(
                  { start: drag.current?.start ?? current.start, size: current.size },
                  shift,
                  days.length,
                ).start,
              }));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
          >
            {days.map((day, index) => {
              const inView = index >= window.start && index < window.start + window.size;
              if (!inView) return null;
              const amount = valueFor(day, mode);
              const height = Math.max(2, Math.round((amount / max) * 180));
              return (
                <button
                  key={day.date}
                  type="button"
                  ref={(node) => {
                    buttonRefs.current[index] = node;
                  }}
                  className={`day-col ${day.status}`}
                  aria-pressed={selected === day.date}
                  aria-label={barLabel(day, mode)}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    onSelect(selected === day.date ? null : day.date);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      focusDay(index + 1);
                    } else if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      focusDay(index - 1);
                    } else if (event.key === "+" || event.key === "=") {
                      event.preventDefault();
                      setWindow((current) => zoomWindow(current, days.length, "in", index));
                    } else if (event.key === "-" || event.key === "_") {
                      event.preventDefault();
                      setWindow((current) => zoomWindow(current, days.length, "out", index));
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      focusDay(0);
                    } else if (event.key === "End") {
                      event.preventDefault();
                      focusDay(days.length - 1);
                    }
                  }}
                >
                  <span className="value">{formatCount(amount)}</span>
                  <span className="track">
                    <span className="bar" style={{ height }} />
                  </span>
                  <span className="day-name">{formatDay(day.date)}</span>
                  <span className={`day-flag ${day.status}`}>
                    {day.status === "partial" ? "Partial" : "Complete"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="chart-foot">
          <ul className="legend">
            <li>
              <span className={`swatch solid ${mode}`} /> Complete day
            </li>
            <li>
              <span className={`swatch hatch ${mode}`} /> Partial day, striped
            </li>
          </ul>
          <label className="pan-range">
            Pan date window
            <input
              type="range"
              min={0}
              max={maxStart}
              step={1}
              value={window.start}
              disabled={maxStart === 0}
              aria-valuetext={windowText}
              onChange={(event) =>
                setWindow((current) => ({ ...current, start: Number(event.target.value) }))
              }
            />
          </label>
        </div>
        <p id={captionId} className="caption">
          {mode === "new" ? "New blocks per day." : "Running total, including partial days."} ET dates.
          Drag to pan, Ctrl-scroll to zoom.
        </p>
      </div>
    </div>
  );
}
