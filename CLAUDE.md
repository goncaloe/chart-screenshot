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
- **Chrome with CDP on 9222** for `cli/stockinfo.js` **and** the web `POST /api/stockinfo` endpoint (the `↓` link in the files table). `core/dilution.js` is shared by both paths.

## Architecture

Two entrypoints share one `core/` library:

- **`core/`** — pure logic, no Express. `importer.js` chunks IB requests by `tfMeta.maxChunk`, normalizes bars to `[unixSec, o, h, l, c, v]` tuples, then merges into a per-symbol/per-timeframe JSON via `store.js`. `store.js` is the single source of truth for filesystem layout (`data/{YYYY-MM}/{SYM}_{tf}.json`) and atomic write (`.tmp` + rename). `payload.js` reads a stored file and computes EMA9/EMA20/VWAP + volume series for the chart. `renderer.js` runs a singleton headless chromium and screenshots `#chart` from the lightweight template. `market.js` owns all NY-time math.
- **`web/`** — thin SSR. `server.js` wires routes to `actions/` (which call `core/store`) and `pages/` (which return HTML via `layout.js`). The `/lightweight/:ym/:name` route reuses the **same** `web/views/lightweight.html` template that `core/renderer.js` screenshots — keep them compatible. `/chart/:ym/:name` is a legacy Highcharts page and is being phased out (see commit `679c74b`).
- **`data/`** — gitignored. Two file shapes coexist in `data/{YYYY-MM}/`:
  - `{SYM}_{tf}.json` — candle tuples. Bucketed by NY month of `toMs` (`store.pathFor`), so a range crossing a month boundary lands entirely in the **end** month's file.
  - `stockinfo-{DD}.json` — per-day sidecar, a list of `{ filename, rangestart, rangeend, cfloat, inst_own, cps, cash, country }` objects keyed by `filename`. The `DD` bucket comes from the NY day of `rangeend`. Both the chart's visible-range (Alt+S → `POST /api/range`) and the DilutionTracker scrape (`POST /api/stockinfo`) write into the same record — different `(symbol, timeframe)` for the same day share one file. On merge, the existing entry's fields win over freshly-fetched values (intentional: keeps manual edits stable across re-fetches).

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
- `rangestart` / `rangeend` in `stockinfo-DD.json` are **NY-shifted unix seconds** (the lightweight-charts view of time, not true UTC) — they come straight from `chart.timeScale().getVisibleRange()` on a payload whose candle times were already shifted by `payload.normalizeCandles`. The server uses UTC parts of `rangeend` to derive the `DD` bucket (which is correct precisely *because* the value is pre-shifted).
- `/folder/:ym` accepts `?day=` (1–31) and `?timeframe=` (1m/5m/1d) filters. The Range / Meta columns in the files table only render when a day is selected; their checkboxes reflect presence of `rangestart` / dilution fields in the matching `stockinfo-DD.json` entry.
- `/import` defaults `from` to today 04:00 NY and `to` to today 20:00 NY. When `ym`+`symbol`+`timeframe` resolve to an existing candle file, the form is pre-filled with the file's first and last candle times instead.
