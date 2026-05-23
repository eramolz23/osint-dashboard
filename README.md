# Luke Command Center

Personal command center and OSINT intelligence dashboard. Built with Flask, Jinja2, and Google Sheets as the live data source. Hosted on Vercel.

## What it does

| Module | Route | Description |
|---|---|---|
| **Home** | `/` | Command center dashboard: system status, OSINT snapshot, latest brief, weekly assessment, module cards |
| **OSINT** | `/osint` | Intel Log: daily briefings with TAC-INT analysis, confidence ratings, video links |
| **Weekly** | `/weekly` | Weekly intelligence rollup assessments |
| **Search** | `/search` | Full-text search across Intel Log entries and weekly rollups |
| **Timeline** | `/timeline` | Chronological keyword search across all brief content |
| **Chat** | `/chat` | AI analyst chatbot grounded in the last 30 days of briefs (requires Gemini API key) |
| **Projects** | `/projects` | Placeholder — ready for integration |
| **ROTC** | `/rotc` | Placeholder — Advanced Camp, Air Assault, duty logs |
| **School** | `/school` | Placeholder — coursework and academic planning |
| **Notes** | `/notes` | Placeholder — quick notes and reference material |

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/eramolz23/osint-dashboard.git
cd osint-dashboard
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set environment variables

Create a `.env` file at the project root. **Never commit `.env`.**

```
GOOGLE_SHEET_ID=1gVpKaZGsRUK6CSfO1P6D7uQOpRgYoyf3FI7OrpTyzW4
DASHBOARD_PASSWORD=your-password-here
SECRET_KEY=a-long-random-string
GEMINI_API_KEY=your-gemini-key-here
```

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_SHEET_ID` | Yes | Default in code points to the correct sheet |
| `DASHBOARD_PASSWORD` | Yes | Password for the login gate |
| `SECRET_KEY` | Yes | Flask session secret — any long random string |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Production | Full JSON of service account key as a single string |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | Local dev | Path to key file (defaults to `service-account.json`) |
| `GEMINI_API_KEY` | Optional | Required only for `/chat` |

> **Warning:** `DASHBOARD_PASSWORD` defaults to `changeme` and `SECRET_KEY` defaults to `dev-secret-change-me` if not set. Always override in production.

### 3. Service account (Google Sheets access)

- **Local dev:** Place your service account JSON file at `service-account.json` in the project root.
- **Production:** Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the full JSON contents as a single-line string in Vercel environment variables.

### 4. Run locally

```bash
python app.py
```

App runs at `http://127.0.0.1:5000`. Log in with your `DASHBOARD_PASSWORD`.

## Deploy on Vercel

1. Push the repo to GitHub.
2. Import the repo at [vercel.com](https://vercel.com).
3. Set all required environment variables in the Vercel project **Settings → Environment Variables**. Do not use `.env` — Vercel reads them from the dashboard.
4. Deploy. `vercel.json` routes all traffic through `api/index.py`, which imports the Flask `app`.

## Google Sheet structure

| Tab | Columns used |
|---|---|
| `Intel Log` | Date, Video Title, Channel, Video URL, Transcript (chars), TAC-INT Brief (col F), Wire News (col G — no header label), Reddit OSINT (col H — no header label) |
| `Reliability Scorecard` | Date, Confirmation Rate % |
| `Weekly Rollups` | Week Ending, Days Covered, Weekly Assessment (HTML) |

Other tabs (`Claim Tracker`, `Daily Memory`, `Topic Breakdown`) have fetch functions in `sheets.py` but no active routes. They can be activated by adding routes in `app.py`.

## Notes

- All page data is fetched live from Google Sheets on every request — no local cache.
- `cache_discovery=False` is set on all Sheets API calls (required to prevent filesystem writes on Vercel's read-only filesystem).
- Templates `calibration.html`, `claims.html`, `contradictions.html`, and `flagged.html` exist but have no active routes. They are not linked from the nav.
- The service worker (`static/sw.js`) handles offline mode with an inline fallback — no `offline.html` file is needed.
