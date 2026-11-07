import type { Dataset, DayAggregate } from "../lib/types";
import { formatAsOf, formatCount, formatDay, formatSlot, sourceLabel, statusLabel } from "../lib/format";

export function DayTimeline({
  dataset,
  days,
  selected,
  onSelect,
}: {
  dataset: Dataset;
  days: DayAggregate[];
  selected: string | null;
  onSelect: (date: string | null) => void;
}) {
  return (
    <div className="timeline">
      {days.map((day) => {
        const open = selected === day.date;
        return (
          <details
            key={day.date}
            className="day-block"
            open={open}
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              if (isOpen && selected !== day.date) onSelect(day.date);
              if (!isOpen && selected === day.date) onSelect(null);
            }}
          >
            <summary>
              <span>{formatDay(day.date, "long")}</span>
              <span className="mono">
                {formatCount(day.newBlocks)} new
                {day.status === "partial" ? " · partial" : ""}
              </span>
              <span className="mono dim">
                cumulative {formatCount(day.cumulativeRecorded)}
              </span>
            </summary>
            {day.date === dataset.monitoring.started_on ? (
              <p className="note">
                {dataset.monitoring.preexisting_note} Those{" "}
                {formatCount(dataset.monitoring.preexisting_blocked_excluded)} accounts are the
                same ones counted in the first run’s already-blocked figure. They are not added
                again on top of the {formatCount(day.newBlocks)} newly blocked.
              </p>
            ) : null}
            <div className="table-wrap">
              <table>
                <caption>
                  Monitor runs on {formatDay(day.date, "long")}. New blocks are the recorded
                  monitor count for that run.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">New</th>
                    <th scope="col">Status</th>
                    <th scope="col">List size</th>
                    <th scope="col">Already blocked</th>
                    <th scope="col">Source</th>
                    <th scope="col">As of</th>
                  </tr>
                </thead>
                <tbody>
                  {day.events.map((event) => (
                    <tr key={event.id}>
                      <th scope="row">{formatSlot(event.slot)}</th>
                      <td className="num">{formatCount(event.new_blocks)}</td>
                      <td>{statusLabel(event.status)}</td>
                      <td className="num">
                        {typeof event.list_size === "number" ? formatCount(event.list_size) : "—"}
                      </td>
                      <td className="num">
                        {typeof event.already_blocked === "number"
                          ? formatCount(event.already_blocked)
                          : "—"}
                      </td>
                      <td>
                        {sourceLabel(event.source)}
                        {event.approval_id ? ` · approval ${event.approval_id}` : ""}
                      </td>
                      <td>
                        <time dateTime={event.as_of}>{formatAsOf(event.as_of)}</time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {day.events.map((event) => (
              <div key={`${event.id}-meta`} className="event-meta">
                <p>
                  <span className="kicker">Provenance</span> {event.provenance}
                </p>
                <p>{event.notes}</p>
                {event.handles.length > 0 ? (
                  <p>
                    Handles
                    {event.handles_complete ? "" : " (incomplete list)"}:{" "}
                    {event.handles.map((handle) => `@${handle}`).join(", ")}
                  </p>
                ) : (
                  <p>
                    {event.handles_complete
                      ? "No account handles on this run."
                      : "Handle list was not recorded. The new-block count is the authoritative figure."}
                  </p>
                )}
                <p className="dim mono">Record id {event.id}</p>
              </div>
            ))}
            {dataset.events
              .filter((event) => event.date === day.date && event.status === "superseded")
              .map((event) => (
                <p key={event.id} className="note">
                  Superseded record {event.id} ({formatCount(event.new_blocks)} new) is kept for
                  inspection and left out of the totals. {event.provenance}
                </p>
              ))}
          </details>
        );
      })}
    </div>
  );
}
