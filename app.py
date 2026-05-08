import os
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, flash, redirect, render_template, request, session, url_for

import sheets

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")
DASHBOARD_PASSWORD = os.getenv("DASHBOARD_PASSWORD", "changeme")


# ── Auth ──────────────────────────────────────────────────────────────────────

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("authed"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("authed"):
        return redirect(url_for("index"))
    error = None
    if request.method == "POST":
        if request.form.get("password") == DASHBOARD_PASSWORD:
            session["authed"] = True
            return redirect(url_for("index"))
        error = "Incorrect password."
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
@require_auth
def index():
    briefs = sheets.get_intel_log()
    scorecard = sheets.get_scorecard()

    rate_by_date = {}
    for row in scorecard:
        date = row.get("Date", "").strip()
        try:
            rate = float(row.get("Confirmation Rate %", "") or 0)
        except (ValueError, TypeError):
            rate = None
        if date:
            rate_by_date[date] = rate

    for b in briefs:
        b["_rate"] = rate_by_date.get(b.get("Date", "").strip())

    briefs = sorted(briefs, key=lambda x: x.get("Date", ""), reverse=True)
    return render_template("index.html", briefs=briefs)


@app.route("/brief/<int:row_index>")
@require_auth
def brief(row_index):
    briefs = sheets.get_intel_log()
    match = next((b for b in briefs if b["_row_index"] == row_index), None)
    if not match:
        return render_template("error.html", message="Brief not found."), 404
    return render_template("brief.html", brief=match)


@app.route("/scorecard")
@require_auth
def scorecard():
    rows = sheets.get_scorecard()

    def parse_rate(r):
        try:
            return float(r.get("Confirmation Rate %", "") or 0)
        except (ValueError, TypeError):
            return 0.0

    rows_desc = sorted(rows, key=lambda x: x.get("Date", ""), reverse=True)

    chart_rows = sorted(rows, key=lambda x: x.get("Date", ""))
    chart_labels = [r.get("Date", "") for r in chart_rows]
    chart_data = [parse_rate(r) for r in chart_rows]

    return render_template(
        "scorecard.html",
        rows=rows_desc,
        chart_labels=chart_labels,
        chart_data=chart_data,
    )


@app.route("/claims")
@require_auth
def claims():
    all_claims = sheets.get_claims()

    status_filter = request.args.get("status", "").strip()
    category_filter = request.args.get("category", "").strip()
    priority_filter = request.args.get("priority", "").strip()

    filtered = all_claims
    if status_filter:
        filtered = [c for c in filtered if c.get("Status", "").upper() == status_filter.upper()]
    if category_filter:
        filtered = [c for c in filtered if c.get("Category", "").lower() == category_filter.lower()]
    if priority_filter:
        filtered = [c for c in filtered if c.get("Priority", "").upper() == priority_filter.upper()]

    filtered = sorted(filtered, key=lambda x: x.get("Date Added", ""), reverse=True)

    all_statuses = sorted({c.get("Status", "") for c in all_claims if c.get("Status")})
    all_categories = sorted({c.get("Category", "") for c in all_claims if c.get("Category")})
    all_priorities = sorted({c.get("Priority", "") for c in all_claims if c.get("Priority")})

    return render_template(
        "claims.html",
        claims=filtered,
        all_statuses=all_statuses,
        all_categories=all_categories,
        all_priorities=all_priorities,
        status_filter=status_filter,
        category_filter=category_filter,
        priority_filter=priority_filter,
    )


@app.route("/search")
@require_auth
def search():
    q = request.args.get("q", "").strip()
    results = []
    if q:
        briefs = sheets.get_intel_log()
        ql = q.lower()
        results = [
            b for b in briefs
            if ql in b.get("Video Title", "").lower()
            or ql in b.get("Date", "").lower()
            or ql in b.get("Channel", "").lower()
        ]
        results = sorted(results, key=lambda x: x.get("Date", ""), reverse=True)
    return render_template("search.html", results=results, q=q)


# ── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(Exception)
def handle_error(e):
    return render_template("error.html", message=str(e)), 500


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
