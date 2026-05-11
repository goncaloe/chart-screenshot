# chart-screenshot

A small toolkit for pulling US-equity intraday/daily candles from Interactive Brokers, storing them as JSON on disk, browsing them through a local web UI, and rendering chart screenshots with [lightweight-charts](https://github.com/tradingview/lightweight-charts) via headless Chromium.

A second feature pulls DilutionTracker metadata (float, institutional ownership, cash position, etc.) and annotates each stored chart with the visible time range so that future sessions can recall what was being studied.

## Requirements

- Node.js 18+
- **Interactive Brokers TWS or IB Gateway** running on `127.0.0.1:7497` with API access enabled. All imports go through it.
- **`ib-tws-api`** as a sibling repository — it is referenced as a local file dependency (`file:../ib-tws-api`), so it must exist on disk before `npm install`.
- **Chrome with remote debugging** on port `9222` is needed for DilutionTracker scraping (both the CLI and the web `↓` button). Start it manually:

    ```
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebugProfile"
    ```

  Log in to DilutionTracker once in that profile; the session persists.

## Install

```bash
npm install
```

## Web UI

```bash
npm start
```

Serves at `http://127.0.0.1:3005` (override with `PORT`). The server binds `127.0.0.1` only.

Routes:

- `/` — list of `data/{YYYY-MM}` folders.
- `/folder/:ym` — files in a month. Filterable by `?day=1..31` and `?timeframe=1m|5m|1d`. When a day is selected, **Range** and **Meta** columns appear with checkboxes showing whether the per-day sidecar already contains a saved chart range or a dilution scrape for that file.
- `/file/:ym/:name` — file detail with contiguous-range summary and an inline SVG preview.
- `/chart/:ym/:name` — legacy Highcharts page (being phased out).
- `/lightweight/:ym/:name` — interactive lightweight-charts page (the same template the screenshot CLI renders).
- `/import` — form for pulling new candles. Defaults to today 04:00 → 20:00 NY; when invoked from an existing file (`?ym=&symbol=&timeframe=`) it pre-fills from the file's first and last candle.

### Keyboard shortcuts on the chart page

- `Alt+S` — save the current visible chart range to the per-day sidecar (`POST /api/range`).

### API

- `POST /api/import` — `{ symbol, timeframe, from, to }`, NY-local strings.
- `POST /api/range` — `{ filename, datestart, dateend }`. Persists to `data/{YYYY-MM}/stockinfo-{DD}.json`, where `YYYY-MM` and `DD` come from `dateend`.
- `POST /api/stockinfo` — `{ ym, day, filename }`. Triggers `core/dilution.js` for the file's symbol and merges the result (float, inst-own, cash, etc.) into the same sidecar entry. Requires the Chrome+CDP session.

## CLI

```bash
# Pull candles into data/{YYYY-MM}/{SYM}_{tf}.json
node cli/import.js --symbol=KIDZ --timeframe=5m --from="2026-04-29 04:00" --to="2026-04-29 20:00"

# Render a PNG screenshot to screenshots/<file>.png
node cli/screenshot.js --file=KIDZ_5m_2026_04

# Scrape DilutionTracker for one or more symbols
node cli/stockinfo.js --symbol=AAA,BBB
```

`from` / `to` are NY-local. Supported timeframes: `1m`, `5m`, `1d`. There is no test, lint, or build step.

## Storage layout

Everything lives under `data/` (gitignored). Two file shapes share each month folder:

```
data/
  2026-05/
    KIDZ_5m.json          # candle tuples [unixSec, o, h, l, c, v]
    INOD_1m.json
    stockinfo-09.json     # per-day sidecar (one per NY day)
    stockinfo-10.json
```

- **`{SYM}_{tf}.json`** — array of `[unixSec, open, high, low, close, volume]` tuples in true UTC. Bucketed by the NY month of the import's end timestamp, so a range that crosses a month boundary lands entirely in the **end** month's file.
- **`stockinfo-{DD}.json`** — array of `{ filename, rangestart, rangeend, cfloat, inst_own, cps, cash, country }` objects, keyed by `filename`. The `DD` bucket is the NY day of `rangeend`. The chart's saved view range and the DilutionTracker scrape both write into the same record; different `(symbol, timeframe)` charts for the same day share one file.

## Architecture

Two entrypoints share one `core/` library:

- **`core/`** — pure logic, no Express.
  - `importer.js` — chunks IB requests by `tfMeta.maxChunk`, normalizes bars, merges into per-symbol JSON via `store.js`.
  - `store.js` — single source of truth for filesystem layout and atomic writes (`.tmp` + `rename`).
  - `payload.js` — reads a stored file and computes EMA9/EMA20/VWAP + volume series for the chart.
  - `renderer.js` — singleton headless Chromium that screenshots `#chart` from the lightweight template.
  - `market.js` — all NY-time math (DST-correct via two-pass offset). Owns the `HOLIDAYS_2026` set.
  - `dilution.js` — Playwright-over-CDP DilutionTracker scraper, shared by the CLI and the web endpoint.
- **`web/`** — thin SSR. `server.js` wires routes to `actions/` (which call `core/store`) and `pages/` (which return HTML via `layout.js`).

## Time handling — read before editing

The codebase uses three time representations and mixing them is the most common bug source:

1. **NY-local strings** (`"YYYY-MM-DD HH:MM"`) — user input. Parse with `market.parseNYLocal` (DST-correct via two-pass offset).
2. **Unix seconds, true UTC** — what IB returns and what `store.js` persists in candle tuples.
3. **Unix seconds, shifted by NY offset** — what `payload.js` emits to lightweight-charts. The library renders `time` values as if they were UTC, so `payload.normalizeCandles` adds `utcNyOffset()/1000` to each timestamp to make the chart display NY wall-clock. Do **not** apply this shift before storage.

`rangestart` / `rangeend` written to `stockinfo-DD.json` are the **shifted** form, since they come straight from `chart.timeScale().getVisibleRange()`. The server derives `DD` using UTC parts of `rangeend` — which is correct precisely *because* the value is pre-shifted.

`market.js` has a hardcoded `HOLIDAYS_2026` set; `core/util.js` has a duplicate. Both must be updated together when the year rolls over.

## Conventions

- File names: `{SYM}_{1m|5m|1d}.json`. `parseFileName` in `store.js` is the canonical validator.
- All actions/pages re-derive routes from `ym` and `name` — never hardcode paths; use `store.pathFor`.
- `payload.js` accepts `"YYYY-MM/SYM_TF.json"` (forward slash) so the same builder works for the CLI's flat filenames (`KIDZ_5m_2026_04.json`) and the web's nested layout (`2026-05/INOD_5m.json`).

## License

Private / unpublished.
