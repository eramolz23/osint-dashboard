# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Flask web dashboard that reads live from a Google Sheet and displays daily OSINT intelligence briefs compiled from stream analysis of "The Enforcer" (TIER C source). No local data storage — every page load fetches from Sheets.

## Google Sheet

**Sheet ID:** `1gVpKaZGsRUK6CSfO1P6D7uQOpRgYoyf3FI7OrpTyzW4`

| Tab | Key Columns |
|-----|-------------|
| Intel Log | Date, Video Title, Channel, Video URL, Transcript chars, TAC-INT Brief (HTML), + cols G/H (Wire News HTML, Reddit OSINT HTML — no header labels in sheet, fetched by index) |
| Reliability Scorecard | Date, Stream Title, Total Claims, Wire Confirmed, Wire Contradicted, Not In Wire, FLAGGED-VERIFY Count, Confirmation Rate %, C3 Count, C2 Count, C1 Count, Notes |
| Claim Tracker | Date Added, Stream Title, Claim, Type, Category, Priority, Status, Days Open, Last Checked, Resolution Notes |
| Daily Memory | Date, Video Title, Stream Summary, Intel Brief Excerpt |
| Topic Breakdown | Date + per-theater confirmation rates (Iran/Hormuz, Ukraine/Russia, Israel/Lebanon, Other) |
| Weekly Rollups | Week Ending, Days Covered, Weekly Assessment (HTML column — rendered with `\|safe`) |

**Intel Log quirk:** Columns G and H have no header labels. `get_intel_log()` in `sheets.py` fetches `A:H` explicitly and uses index-based access. If col H is present → G=Wire News, H=Reddit OSINT. If only G → content-sniffed via `_is_wire()` / `_is_reddit()`.

**Claim Tracker Type values:** `FLAGGED-VERIFY`, `DISCREPANCY` (exact uppercase match used in all filters).

## Nav Bar Order (current)

Briefs · Scorecard · Claims · Weekly · Timeline · Flagged · Contradictions · Calibration · Chat

## Pages

| Route | Function | Source tabs |
|-------|----------|-------------|
| `/` | Daily briefs list, sorted newest-first, confirmation rate badge per row | Intel Log + Scorecard |
| `/brief/<row_index>` | Full brief detail: TAC-INT, Wire News, Reddit OSINT rendered as HTML. Inline confidence tag highlighting (JS TreeWalker) | Intel Log |
| `/scorecard` | Reliability stats table + line chart (Chart.js) of confirmation rate over time | Reliability Scorecard |
| `/claims` | 3-column kanban board: OPEN (amber), CONFIRMED (green), CONTRADICTED (red). Category + priority filters | Claim Tracker |
| `/search` | Searches brief titles, dates, channels | Intel Log |
| `/weekly` | Grid of weekly rollup cards sorted newest-first | Weekly Rollups |
| `/weekly/<row_index>` | Full weekly assessment HTML rendered on detail page | Weekly Rollups |
| `/timeline` | Keyword search across all briefs — returns matching sentences highlighted in amber, sorted oldest-to-newest | Intel Log |
| `/flagged` | All `Type=FLAGGED-VERIFY` claims as cards + summary stats (total, open, confirmed, contradicted, confirmation rate %) | Claim Tracker |
| `/contradictions` | All `Type=DISCREPANCY` claims as cards + bar chart by theater + ranked theater list | Claim Tracker |
| `/calibration` | Full source reliability analysis: summary stats, line chart over time, per-theater bar chart, flagged resolution breakdown, dynamic verdict paragraph | Scorecard + Claim Tracker |
| `/chat` | Gemini Flash chatbot (`gemini-2.5-flash`) grounded in last 30 days of briefs. `GEMINI_API_KEY` required | Intel Log |
| `/map` | **Removed** — replaced by `/timeline` | — |

## Tech Stack

- **Backend:** Python Flask
- **Frontend:** Plain HTML + CSS + vanilla JS (no React, no build step)
- **Charts:** Chart.js 4.4.4 from CDN (used on Scorecard, Contradictions, Calibration)
- **Markdown:** marked.js from CDN (used in Chat)
- **Sheets:** Google Sheets API v4 via service account (`google-api-python-client`)
- **AI:** `google-generativeai` — Gemini Flash only, only on `/chat`
- **Auth:** Single password gate on all routes (session cookie, `require_auth` decorator)
- **Deploy:** Vercel (primary) via `api/index.py` + `vercel.json`, or Railway via `Procfile`
- **PWA:** Web app manifest at `/static/manifest.json`, service worker at `/sw.js` (Flask route serving from static so it has root scope), iOS meta tags in `base.html`

## Environment Variables

```
GOOGLE_SHEET_ID=1gVpKaZGsRUK6CSfO1P6D7uQOpRgYoyf3FI7OrpTyzW4
DASHBOARD_PASSWORD=<set this>
GOOGLE_SERVICE_ACCOUNT_JSON=<full JSON contents of service account key>
SECRET_KEY=<flask session secret>
GEMINI_API_KEY=<required only for /chat>
```

Local dev uses file-based service account (`service-account.json`). Production uses `GOOGLE_SERVICE_ACCOUNT_JSON` env var (full JSON as a single string).

## Design Rules

- Dark navy theme: `--bg: #060e1f`, `--surface: #0b1830`, `--nav: #040a16`
- Confidence badge colors: C3 = green, C2 = amber, C1 = red
- Status colors: OPEN = amber, CONFIRMED = green, CONTRADICTED = red
- Confirmation rate thresholds (scorecard rows, calibration charts): ≥60% green, ≥40% amber, <40% red
- HTML content from sheets (TAC-INT Brief, Wire News, Reddit OSINT, Weekly Assessment) is rendered with `|safe` — preserve as-is
- Chart.js charts use `gridColor: '#1e3a5f'` and `tickColor: '#64748b'` to match theme

## Confidence Tag Highlighting

`/brief/<row_index>` runs a JS TreeWalker over the rendered HTML to replace confidence tags with styled `<span>` elements (text-node-safe — does not break innerHTML). Tags highlighted:

- `[FLAGGED-VERIFY]` — red pill
- `[WIRE CONFIRMED]` — green pill
- `[NOT IN WIRE]` — gray pill
- `[DISCREPANCY]` — amber pill
- `[C3]`, `[C2]`, `[C1]` — green/amber/red pills respectively

## Timeline Search Implementation

`/timeline` strips HTML tags from TAC-INT Brief, Wire News, and Reddit OSINT, splits on sentence boundaries (`(?<=[.!?])\s+`), and finds sentences containing the keyword. Highlights are generated server-side by HTML-escaping the sentence then wrapping matches in `<mark class="kw">`. Results link back to the full brief via `row_index`.

## Hard Constraints

- No React or heavy frontend frameworks
- No local data storage — always read live from Google Sheets
- `cache_discovery=False` on all Sheets API calls (prevents filesystem writes on Vercel)
- Never AI-generate content except in `/api/chat` — all other pages are pure display
