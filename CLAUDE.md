# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Flask web dashboard that reads live from a Google Sheet and displays daily OSINT intelligence briefs. It replaces reading HTML emails in Gmail. No local data storage — every page load fetches from Sheets.

## Google Sheet

**Sheet ID:** `1gVpKaZGsRUK6CSfO1P6D7uQOpRgYoyf3FI7OrpTyzW4`

| Tab | Key Columns |
|-----|-------------|
| Intel Log | Date, Video Title, Channel, Video URL, Transcript chars, TAC-INT Brief (HTML), Wire News (HTML), Reddit OSINT (HTML) |
| Reliability Scorecard | Date, Stream Title, Total Claims, Wire Confirmed, Wire Contradicted, Not In Wire, FLAGGED-VERIFY Count, Confirmation Rate %, C3 Count, C2 Count, C1 Count, Notes |
| Claim Tracker | Date Added, Stream Title, Claim, Type, Category, Priority, Status, Days Open, Last Checked, Resolution Notes |
| Daily Memory | Date, Video Title, Stream Summary, Intel Brief Excerpt |
| Topic Breakdown | Date + per-theater confirmation rates (Iran/Hormuz, Ukraine/Russia, Israel/Lebanon, Other) |
| Weekly Rollups | Week Ending, Days Covered, Weekly Assessment (HTML) |

## Pages

1. **Homepage** — recent daily briefs list; date, title, confirmation rate badge
2. **Brief detail** — renders TAC-INT Brief, Wire News, Reddit OSINT HTML sections as-is
3. **Scorecard** — reliability stats table + line chart of confirmation rate over time
4. **Claim Tracker** — filterable table (Status: OPEN/CONFIRMED/CONTRADICTED, Category, Priority)
5. **Search** — across brief titles and dates

## Tech Stack

- **Backend:** Python Flask
- **Frontend:** Plain HTML + CSS + vanilla JS (no React, no build step)
- **Sheets:** Google Sheets API v4 via service account
- **Auth:** Single password gate on all routes (session cookie)
- **Deploy:** Vercel or Railway

## Environment Variables

```
GOOGLE_SHEET_ID=1gVpKaZGsRUK6CSfO1P6D7uQOpRgYoyf3FI7OrpTyzW4
DASHBOARD_PASSWORD=<set this>
GOOGLE_SERVICE_ACCOUNT_JSON=<full JSON contents of service account key>
SECRET_KEY=<flask session secret>
```

## Design Rules

- Dark theme: navy/dark background (`#0d1117` / `#0a1628` range)
- **Confidence badges:** C3 = green, C2 = amber, C1 = red
- **Scorecard row colors:** confirmation rate ≥ 60% green, ≥ 40% amber, below 40% red
- Mobile readable
- TAC-INT/Wire/Reddit HTML content is rendered directly — preserve the source formatting

## Hard Constraints

- No React or heavy frontend frameworks
- No AI API calls — display only
- No local data storage — always read live from Google Sheets
- Keep it simple; one developer maintaining this
