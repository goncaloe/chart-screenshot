# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — start web server at `http://127.0.0.1:3005` (override with `PORT`).
- `node cli/import.js --symbol=KIDZ --timeframe=5m --from="2026-04-29 04:00" --to="2026-04-29 20:00"` — pull candles from IB TWS into `data/{YYYY-MM}/{SYM}_{tf}.json`. `from`/`to` are NY-local. Timeframes: `1m`, `5m`, `1d`.
- `node cli/screenshot.js --file=KIDZ_5m_2026_04` — render PNG to `screenshots/<file>.png` via headless Playwright using the lightweight-charts template.
- `node cli/stockinfo.js --symbol=AAA,BBB` — scrape DilutionTracker. Requires Chrome started manually with `--remote-debugging-port=9222 --user-data-dir="C:\ChromeDebugProfile"` and an interactive login on first run.
- No test, lint, or build scripts.

## External dependencies that must be running

- **IB TWS / Gateway** on `127.0.0.1:7497` for any import. `core/ib.js` instantiates the client at module load — the process will only fail at first request, not at startup.
- **`ib-tws-api`** is a local file dep (`file:../ib-tws-api`); the sibling repo must exist before `npm install`.
- **Chrome with CDP on 9222** for `cli/stockinfo.js` only.

## Architecture

Two entrypoints share one `core/` library:

- **`core/`** — pure logic, no Express. `importer.js` chunks IB requests by `tfMeta.maxChunk`, normalizes bars to `[unixSec, o, h, l, c, v]` tuples, then merges into a per-symbol/per-timeframe JSON via `store.js`. `store.js` is the single source of truth for filesystem layout (`data/{YYYY-MM}/{SYM}_{tf}.json`) and atomic write (`.tmp` + rename). `payload.js` reads a stored file and computes EMA9/EMA20/VWAP + volume series for the chart. `renderer.js` runs a singleton headless chromium and screenshots `#chart` from the lightweight template. `market.js` owns all NY-time math.
- **`web/`** — thin SSR. `server.js` wires routes to `actions/` (which call `core/store`) and `pages/` (which return HTML via `layout.js`). The `/lightweight/:ym/:name` route reuses the **same** `web/views/lightweight.html` template that `core/renderer.js` screenshots — keep them compatible. `/chart/:ym/:name` is a legacy Highcharts page and is being phased out (see commit `679c74b`).
- **`data/`** — gitignored. Bucketed by NY month derived from `toMs` of the import (`store.pathFor`), so a range that crosses a month boundary lands entirely in the **end** month's file.

CLI and web both produce charts from the same `buildPayload` + `lightweight.html` pair, so a screenshot diff vs the live page is a useful sanity check.

## Time handling — read before editing

The codebase uses three time representations and mixing them is the most common bug source:

1. **NY-local strings** (`"YYYY-MM-DD HH:MM"`) — user input. Parse with `market.parseNYLocal` (DST-correct via two-pass offset).
2. **Unix seconds, true UTC** — what IB returns and what `store.js` persists in candle tuples.
3. **Unix seconds, shifted by NY offset** — what `payload.js` emits to lightweight-charts. The library renders `time` values as if they were UTC, so `payload.normalizeCandles` adds `utcNyOffset()/1000` to each timestamp to make the chart display NY wall-clock. Do **not** apply this shift before storage.

`market.js` has a hardcoded `HOLIDAYS_2026` set; `core/util.js` has a duplicate. Both must be updated together when the year rolls over, and `expectedBarTimestamps` / `isMarketOpen` will silently produce wrong results outside 2026.

## Conventions

- File names: `{SYM}_{1m|5m|1d}.json`. The `parseFileName` regex in `store.js` is the canonical validator.
- All actions/pages re-derive routes from `ym` and `name` — never hardcode paths; use `store.pathFor`.
- `payload.js` accepts `"YYYY-MM/SYM_TF.json"` (forward slash) so the same builder works for CLI (`KIDZ_5m_2026_04.json` flat) and web (`2026-05/INOD_5m.json` nested) — note the two naming schemes coexist for historical reasons.
- Server binds `127.0.0.1` only.
