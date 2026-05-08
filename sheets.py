import json
import os
from pathlib import Path

from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build

load_dotenv()

SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "1gVpKaZGsRUK6CSfO1P6D7uQOpRgYoyf3FI7OrpTyzW4")
_SA_PATH = os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH", "service-account.json")
SA_PATH = Path(__file__).parent / _SA_PATH
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


def _build_service():
    json_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    if json_str:
        # Railway / production: full JSON stored as env variable
        info = json.loads(json_str)
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        # Local: read from file
        creds = service_account.Credentials.from_service_account_file(
            str(SA_PATH), scopes=SCOPES
        )
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def _fetch(tab: str) -> list[list[str]]:
    svc = _build_service()
    result = (
        svc.spreadsheets()
        .values()
        .get(spreadsheetId=SHEET_ID, range=f"'{tab}'!A:Z")
        .execute()
    )
    return result.get("values", [])


def _to_dicts(rows: list[list[str]]) -> list[dict]:
    if not rows:
        return []
    headers = rows[0]
    out = []
    for i, row in enumerate(rows[1:], start=1):
        padded = row + [""] * (len(headers) - len(row))
        d = dict(zip(headers, padded[: len(headers)]))
        d["_row_index"] = i
        out.append(d)
    return out


def _is_wire(s: str) -> bool:
    sl = s.lower()
    return any(k in sl for k in ("wire service", "top wire", "wire news", "wire headlines"))


def _is_reddit(s: str) -> bool:
    sl = s.lower()
    return any(k in sl for k in ("reddit", "developments from", "osint scan"))


def get_intel_log() -> list[dict]:
    # Fetch explicitly through column H — columns G and H have no header labels
    # in the sheet so _to_dicts drops them; we recover them by index here.
    svc = _build_service()
    result = (
        svc.spreadsheets()
        .values()
        .get(spreadsheetId=SHEET_ID, range="'Intel Log'!A:H")
        .execute()
    )
    all_rows = result.get("values", [])
    records = _to_dicts(all_rows)

    for i, record in enumerate(records):
        raw = all_rows[i + 1]  # +1 to skip header row
        col_g = raw[6] if len(raw) > 6 else ""
        col_h = raw[7] if len(raw) > 7 else ""

        if col_h:
            # Newer format: G = Wire News, H = Reddit OSINT
            record["Wire News"] = col_g
            record["Reddit OSINT"] = col_h
        elif col_g:
            # Older format: only one extra column — detect by content
            if _is_wire(col_g):
                record["Wire News"] = col_g
                record["Reddit OSINT"] = ""
            else:
                record["Wire News"] = ""
                record["Reddit OSINT"] = col_g

    return records


def get_scorecard() -> list[dict]:
    return _to_dicts(_fetch("Reliability Scorecard"))


def get_claims() -> list[dict]:
    return _to_dicts(_fetch("Claim Tracker"))


def get_daily_memory() -> list[dict]:
    return _to_dicts(_fetch("Daily Memory"))


def get_topic_breakdown() -> list[dict]:
    return _to_dicts(_fetch("Topic Breakdown"))


def get_weekly_rollups() -> list[dict]:
    return _to_dicts(_fetch("Weekly Rollups"))
