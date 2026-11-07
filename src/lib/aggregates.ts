import type { Aggregates, Dataset, DayAggregate, MonitorEvent } from "./types";

function byAsOf(a: { as_of: string }, b: { as_of: string }): number {
  return a.as_of.localeCompare(b.as_of);
}

export function countableEvents(dataset: Dataset): MonitorEvent[] {
  return dataset.events
    .filter((event) => event.kind === "monitor_new_blocks" && event.status !== "superseded")
    .slice()
    .sort(byAsOf);
}

export function aggregate(dataset: Dataset): Aggregates {
  const events = countableEvents(dataset);
  const byDate = new Map<string, MonitorEvent[]>();
  for (const event of events) {
    const group = byDate.get(event.date);
    if (group) group.push(event);
    else byDate.set(event.date, [event]);
  }

  const dates = [...byDate.keys()].sort();
  let recorded = 0;
  let complete = 0;
  const days: DayAggregate[] = dates.map((date) => {
    const dayEvents = byDate.get(date) ?? [];
    const completeNewBlocks = dayEvents
      .filter((event) => event.status === "complete")
      .reduce((sum, event) => sum + event.new_blocks, 0);
    const partialNewBlocks = dayEvents
      .filter((event) => event.status === "partial")
      .reduce((sum, event) => sum + event.new_blocks, 0);
    const newBlocks = completeNewBlocks + partialNewBlocks;
    recorded += newBlocks;
    complete += completeNewBlocks;
    return {
      date,
      newBlocks,
      completeNewBlocks,
      partialNewBlocks,
      status: partialNewBlocks > 0 || dayEvents.some((event) => event.status === "partial")
        ? "partial"
        : "complete",
      cumulativeRecorded: recorded,
      cumulativeComplete: complete,
      events: dayEvents,
    };
  });

  const lastComplete = [...days].reverse().find((day) => day.status === "complete") ?? null;
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return {
    days,
    completeNewBlocks: complete,
    partialNewBlocks: recorded - complete,
    recordedNewBlocks: recorded,
    preexistingBlockedExcluded: dataset.monitoring.preexisting_blocked_excluded,
    lastCompleteDate: lastComplete?.date ?? null,
    latestEventAsOf: latestEvent?.as_of ?? null,
  };
}

export function latestSnapshot(dataset: Dataset) {
  return dataset.snapshots.slice().sort(byAsOf).at(-1) ?? null;
}

export function pendingWork(dataset: Dataset) {
  return dataset.open_work
    .filter((item) => item.status !== "done")
    .slice()
    .sort(byAsOf);
}
