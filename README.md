# Slop-Chop

Block monitor for a community-curated list of AI slop posters. The page shows recorded new blocks for [@ghostnshells](https://x.com/ghostnshells). It is a static site: the numbers live in [`data/dataset.json`](data/dataset.json), and the UI does not need a code change when those numbers change.

List membership is a community assessment, not independent evidence. Public lifetime post counters, when a profile export is present, are profile activity. They are not measured AI slop volume. The monitor’s newly blocked total is not the full X block list.

## Seeded facts

These are the committed observations, not a live reconciliation.

| Measurement | Value | What it is |
| --- | --- | --- |
| Monitor, complete days | 939 | Through Nov 9, excluding Nov 8. Nov 7 remains 64. Nov 9 adds 78 from the Clankwall feed. |
| Nov 8 partial floor | 11 | Recorded before 7:55 AM ET. The X list stopped resolving after that, so 11 is not a full-day count. |
| Recorded including that floor | 950 | 939 complete plus the Nov 8 floor of 11. |
| Nov 10 partial floor | 0 | 93 runs through 11:18 PM ET, all with no new blocks. The routine continues until midnight, so this is not a closed day. |
| Nov 11 | 0 complete | The 11:23 PM ET partial row is superseded. The 11:49 PM ET close-out is complete, still 0 new blocks. |
| Nov 12 partial | 0 | Outage from 1:52 AM to 6:23 PM ET. Every report that exists has 0 writes. |
| Nov 13, 15, and 16 | 0 complete | No new blocks. Nov 15 and Nov 16 are the once-a-day 7 AM runs. |
| Nov 14 partial | 0 | Reports stop at 12:49 PM ET. |
| Recorded through Nov 26 | 950 | The zero days do not change the Nov 1–9 recorded total. Complete days stay 939. |
| Nov 17–24 | 0 complete | Daily 7 AM runs. No new blocks and no live X block-list read. |
| Nov 25 | 0 complete | The 7:11 AM ET run closed at 0 writes. The earlier partial row is replaced. Feed 785, snapshot 38246d50. |
| Nov 26 | 0 partial | The 7:22 AM ET run had 0 writes. The day was still in progress. Feed still 785, snapshot 0012bb47, a record-level change with 0 added and 0 removed. |
| Clankwall feed in the run reports | 787, then 786, then 785 | Nov 20 drops @devvrathans and Nov 23 drops @stefano_caioni. Both are feed removals, not unblocks. This export has no new snapshot, so the last point-in-time list read stays Nov 14. |
| X blocks, last live read | 943 | 3:01 AM ET on Nov 14. Later runs did not read the live list, so this total is not extrapolated. |
| Clankwall feed at that snapshot | 787 | 772 blocked on that feed, 15 unblockable (13 suspended, 2 inactive). |
| X blocks at Nov 10, 11:27 PM ET | 944 | Earlier drop from 946. @veefightclip and @jimmyaicreator were suspended by X. Not unblocks. |
| X blocks at Nov 9, 11:09 PM ET | 946 | Earlier full block list. Separate from the monitor sum. |
| Nov 7 same run | 38 | 37 previously pending accounts, including @mdp_sec, plus @hiimsimsas. The 16:13 row is bookkeeping, not a separate observed minute. |

Nov 6 still has its unresolved one-account gap (452 at 9:00 AM plus 347 would be 799; observed X blocks were 798) and 237 of 347 handles. Lifetime post counts remain public profile counters, not measured AI slop volume. People who left the list stay blocked.

Clankwall’s public flag feed is a separate section. See [docs/CLANKWALL.md](docs/CLANKWALL.md) for the snapshot path and the nightly refresh. Those flags are sampled signals, not proof, and they are not this site’s block totals.

## Preview

```bash
npm install
npm run dev
```

Open the printed local URL. `npm run build` writes a static site to `dist/`. `npm run preview` serves that build.

```bash
npm test
npm run lint
npm run validate
npm run build
```

## Update the numbers

Nightly updates are pull requests. The exact file, schema, and commands are in [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md).

Short version:

1. From a verified log, write `data/inbox/<export_id>.json`.
2. `npm run ingest` upserts by stable id into `data/dataset.json`. Submitting the same export again is a no-op. The same event id replaces a row. It does not add a second copy.
3. `npm test && npm run validate && npm run ingest -- --check`
4. Open a pull request. Do not merge it until the numbers have been reviewed.

No X API key, scraping credential, or other secret belongs in the repo or in the browser bundle. This site never calls X.

## Scheduled check

[`.github/workflows/data-refresh.yml`](.github/workflows/data-refresh.yml) runs on a schedule and does nothing unless the repository variable `DATA_REFRESH_SOURCE` is exactly `inbox`. In that mode it only validates JSON already committed under `data/inbox/`. It does not poll an API, merge data, push, or deploy. The way new observations arrive is still a reviewed pull request.

## Deploy

The build is static files in `dist/`. Any static host can serve them. Nothing here has been deployed, and the repository visibility is unchanged. Publish only after an explicit decision to do so.

## Blockers

- Nov 6 is incomplete. Do not backfill the remaining 237.
- Profile rankings have no verified per-account export. The explorer explains how to add one instead of showing invented handles.
- Run journals did not include full handle lists for the large batches. Those rows keep the count and set `handles_complete` to false.
- The Nov 1 evening block is stored as the 9:00 PM ET journal run (the PM half of the 41). A different clock time is a data correction, using the superseded-id steps in the contract, not a second insert.
