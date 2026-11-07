# Data contract

Schema version **1.0.0**. Canonical file: `data/dataset.json`. JSON Schema: `data/schema/v1.schema.json`. Worked shape: `data/examples/nightly-export.example.json` (do not ingest that file).

The UI reads the dataset at build time. Changing data does not require an edit under `src/`.

## What to export

Path:

```text
data/inbox/<export_id>.json
```

`<export_id>` is the `export_id` field. Use a new id for every submission, including corrections. Recommended form: `2026-11-07T1535Z-gandalf`. Allowed pattern: `^[a-z0-9][a-z0-9._:-]{2,80}$`.

```json
{
  "schema_version": "1.0.0",
  "export_id": "2026-11-07T1535Z-gandalf",
  "exported_at": "2026-11-07T15:35:00Z",
  "exported_by": "gandalf",
  "source": "grok-bot-verified-log",
  "provenance": "One sentence naming the verified log this file came from.",
  "events": [],
  "snapshots": [],
  "open_work": [],
  "accounts": []
}
```

The export must contain at least one record. `source` is a lowercase slug (`^[a-z0-9][a-z0-9-]{0,79}$`), not a URL and not a token. Calendar dates and `slot` values are America/New_York local time. `as_of` is an ISO timestamp with an offset. In November 2026 that offset is `-05:00`.

## Records and stable ids

| Collection | Id | Counts toward the monitor total? |
| --- | --- | --- |
| `events` | `monitor-new:YYYY-MM-DD:HH:MM` | Yes, unless `status` is `superseded`. `new_blocks` is the authoritative count. |
| `snapshots` | `snapshot:` plus the exact `as_of` string | No. Point-in-time list size and full X block list. |
| `open_work` | `open:` plus a slug, e.g. `open:2026-11-06:approved-347` | No. Describes an unfinished batch. `related_event_id` points at the event that holds the verified count. |
| `accounts` | `account:` plus the handle in lowercase | No. |

Reuse an id to correct that row. A second export with the same event id **replaces** the row. It does not add the counts together.

`status` on an event:

- `complete` — the run is finished.
- `partial` — a verified portion of an unfinished day. The chart stripes these days. Do not mark Nov 6 complete unless a later verified log actually finishes it.
- `superseded` — kept on screen and omitted from every total.

If the slot itself was wrong, send one export that sets the old event to `superseded` and inserts the corrected event under the new id. Adding only the new id would double count.

## Fields that must stay distinct

- `events[].new_blocks` — newly blocked by the monitor on that run.
- `monitoring.preexisting_blocked_excluded` — already blocked when monitoring started (7). Not part of the 450.
- `snapshots[].x_blocks_total` — size of the full X block list at `as_of`.
- `snapshots[].list_size`, `list_members_blocked`, `list_members_unblocked` — curated list at `as_of`. When all three are present they must sum.
- `open_work.approved_count` and `remaining` — batch progress. `related event new_blocks + remaining` must equal `approved_count`. Those fields are not added on top of the event.

When `list_size` and `already_blocked` are both present on an event, `already_blocked + new_blocks` cannot exceed `list_size`. They are equal when that run blocked every remaining member. A later verify can record `new_blocks: 0` while newer members are still unblocked; the gap belongs on the same-time snapshot as `list_members_unblocked`, and those three figures must sum to `list_size`. Omit a field rather than inventing it. The Nov 5 11:35 PM snapshot leaves blocked-on-list empty for that reason.

`handles_complete: true` means `handles` lists every account in `new_blocks`. Otherwise send `[]` or a partial list no longer than `new_blocks`, and `handles_complete: false`. The number is still authoritative.

## Accounts

Only include an account from a verified lookup. Required:

```json
{
  "id": "account:somehandle",
  "handle": "somehandle",
  "profile": {
    "as_of": "2026-11-07T09:00:00-05:00",
    "source": "public-profile",
    "provenance": "Public profile counters looked up at this time. Lifetime posts are not measured AI slop volume.",
    "lifetime_posts": 0,
    "followers": 0,
    "following": 0,
    "created_on": "2020-01-01"
  },
  "list_membership": {
    "as_of": "2026-11-07T09:00:00-05:00",
    "source": "list-snapshot",
    "provenance": "Community-list membership at this time. A community assessment, not independent evidence.",
    "on_list": true
  },
  "block": {
    "as_of": "2026-11-07T09:00:00-05:00",
    "source": "monitor-event",
    "provenance": "Block state recorded with the monitor event.",
    "state": "blocked",
    "event_id": "monitor-new:2026-11-05:15:00"
  }
}
```

`profile`, `list_membership`, and `block` may be omitted when that observation was not made. `lifetime_posts` is the public lifetime post counter. The page will not label it as AI slop volume.

## Commands

From the repository root:

```bash
npm run validate
npm run ingest -- --check
npm run ingest
npm test
```

`ingest` reads every `data/inbox/*.json`, ordered by `exported_at`, and writes `data/dataset.json` only when something changed.

- Same `export_id` and same body: no-op.
- Same `export_id` and a different body: error. Use a new export id.
- Same record id and same body: no-op.
- Same record id and a different body: replace, and append a row to `revisions`.

`--check` fails when the inbox has not been merged yet, so CI will catch a forgotten ingest. Leave the inbox file in the pull request. It is the audit trail. Do not edit a file after it has been applied.

`data/examples/` is validated as a shape sample and is not ingested.

## Pull request

Suggested nightly sequence for a cloud agent that already has a verified log:

1. Branch from the default branch.
2. Add only `data/inbox/<export_id>.json`. Do not add keys, cookies, or raw private logs.
3. Run `npm run ingest`.
4. Run `npm test`, `npm run lint`, `npm run validate`, and `npm run ingest -- --check`.
5. Commit `data/dataset.json` and the inbox file.
6. Open a pull request that quotes the new timestamps and says whether any day is partial.
7. Stop. Do not merge, deploy, or change repository visibility.

## Scheduled workflow

`.github/workflows/data-refresh.yml` is optional and off until a repository variable is set:

`Settings → Secrets and variables → Actions → Variables → DATA_REFRESH_SOURCE = inbox`

Any other value fails the job. An empty value skips it. The job never calls X and never pushes. GitHub only runs the schedule from the default branch after this workflow is merged.

## Versioning

`schema_version` must be `1.0.0`. Adding a field or changing a meaning is a schema change in this repository first, then exports. Unknown fields are rejected so a typo cannot land silently.
