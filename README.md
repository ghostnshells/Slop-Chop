# Slop-Chop

Block monitor for a community-curated list of AI slop posters. The page shows recorded new blocks for [@ghostnshells](https://x.com/ghostnshells). It is a static site: the numbers live in [`data/dataset.json`](data/dataset.json), and the UI does not need a code change when those numbers change.

List membership is a community assessment, not independent evidence. Public lifetime post counters, when a profile export is present, are profile activity. They are not measured AI slop volume. The monitor’s newly blocked total is not the full X block list.

## Seeded facts

These are the committed observations, not a live reconciliation.

| Measurement | Value | What it is |
| --- | --- | --- |
| Monitor, complete through Nov 6 | 797 | Nov 1–5 remain 450. Nov 6 is a completed 347. The earlier partial 110 is superseded and is not added again. |
| X blocks at Nov 6, 11:37 PM ET | 798 | Latest full block list. List size at that timestamp: 794, with 757 blocked on the list and 37 not blocked. |
| X blocks at Nov 6, 9:43 PM ET | 798 | Completion-report snapshot. List size 796, 759 blocked on the list, 37 not blocked. |
| Pending | 37 | Newer list members not blocked, awaiting a decision. One of them, @mdp_sec, is followed. |
| Earlier timestamps | kept | Nov 6 9:00 AM ET is still X blocks 452 and list 775. Nov 6 11:35 AM ET is still X blocks 562. Nov 5 11:35 PM ET is still X blocks 453 and list 561. |

The completion note records an unresolved one-account gap: 452 at 9:00 AM plus the completed 347 would be 799, and the observed X block list is 798. Those figures stay separate. Lifetime post counts on the 37 pending profiles are public profile counters, not measured AI slop volume. Nov 6 keeps 237 handles, so `handles_complete` is false; 90 mid-batch completions have no separate timestamps and are inside the 347.

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
