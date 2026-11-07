import type { Dataset, OpenWork } from "../lib/types";
import { aggregate } from "../lib/aggregates";
import { formatAsOf, formatCount, sourceLabel, statusLabel } from "../lib/format";

export function Snapshots({ dataset }: { dataset: Dataset }) {
  const totals = aggregate(dataset);
  const snapshots = dataset.snapshots.slice().sort((a, b) => a.as_of.localeCompare(b.as_of));
  const pending = dataset.open_work.filter((item) => item.status !== "done");

  return (
    <div className="stack">
      {pending.map((item) => (
        <Pending key={item.id} item={item} dataset={dataset} />
      ))}
      <ol className="snapshot-list">
        {snapshots.map((snapshot) => (
          <li key={snapshot.id} className="snap">
            <div className="snap-head">
              <time dateTime={snapshot.as_of}>{formatAsOf(snapshot.as_of)}</time>
              <span className="mono dim">{sourceLabel(snapshot.source)}</span>
            </div>
            <dl className="facts">
              <div>
                <dt>X blocks</dt>
                <dd>
                  {typeof snapshot.x_blocks_total === "number"
                    ? formatCount(snapshot.x_blocks_total)
                    : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>List size</dt>
                <dd>
                  {typeof snapshot.list_size === "number"
                    ? formatCount(snapshot.list_size)
                    : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Blocked on list</dt>
                <dd>
                  {typeof snapshot.list_members_blocked === "number"
                    ? formatCount(snapshot.list_members_blocked)
                    : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Not blocked on list</dt>
                <dd>
                  {typeof snapshot.list_members_unblocked === "number"
                    ? formatCount(snapshot.list_members_unblocked)
                    : "Not recorded"}
                </dd>
              </div>
            </dl>
            <p>
              <span className="kicker">Provenance</span> {snapshot.provenance}
            </p>
            <p>{snapshot.notes}</p>
            <p className="dim mono">Record id {snapshot.id}</p>
            <details>
              <summary>Record JSON</summary>
              <pre>{JSON.stringify(snapshot, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ol>
      <p className="note">
        Monitor newly blocked, complete days: {formatCount(totals.completeNewBlocks)}. Recorded
        including partial days: {formatCount(totals.recordedNewBlocks)}. Neither number is
        replaced by an X block snapshot.
      </p>
    </div>
  );
}

function Pending({ item, dataset }: { item: OpenWork; dataset: Dataset }) {
  const event = dataset.events.find((entry) => entry.id === item.related_event_id);
  return (
    <aside className="pending" aria-label="Unfinished batch">
      <p className="kicker">Pending · {statusLabel(item.status)}</p>
      <p className="pending-title">
        <time dateTime={item.as_of}>{formatAsOf(item.as_of)}</time>
      </p>
      <p>
        Approved batch {formatCount(item.approved_count)}. Verified on the related monitor event:{" "}
        {event ? formatCount(event.new_blocks) : "missing"}. Remaining at this timestamp:{" "}
        {formatCount(item.remaining)}. The remaining count is not added into the chart.
      </p>
      <p>
        <span className="kicker">Provenance</span> {item.provenance}
      </p>
      <p>{item.notes}</p>
      <p className="dim mono">
        Open work {item.id}
        {event ? ` · event ${event.id}` : ""}
      </p>
    </aside>
  );
}
