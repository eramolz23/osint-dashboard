import os
from datetime import datetime, timedelta
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, send_from_directory, session, url_for

import sheets

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")
DASHBOARD_PASSWORD = os.getenv("DASHBOARD_PASSWORD", "changeme")

SYSTEM_PROMPT = """You are an OSINT analyst assistant embedded in an intelligence dashboard.
You have access to daily intelligence briefs compiled from stream analysis of The Enforcer,
a TIER C source. Maximum confidence on any claim from this source is C3 (wire-confirmed).

Rules:
- Answer ONLY from the provided brief data. Do not use outside knowledge.
- Always cite the date of the brief you are referencing.
- Use confidence tags in your answers: [C3] wire-confirmed, [C2] plausible/partially confirmed, [C1] unverified claim.
- If the data does not contain an answer, say so explicitly.
- Be concise, direct, and analytical. This is an operational intelligence context.
- Do not speculate beyond what the source material supports."""


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


# ── Chat ──────────────────────────────────────────────────────────────────────

@app.route("/chat")
@require_auth
def chat():
    return render_template("chat.html")


@app.route("/api/chat", methods=["POST"])
@require_auth
def api_chat():
    import google.generativeai as genai

    data = request.get_json(force=True) or {}
    question = (data.get("message") or "").strip()
    if not question:
        return jsonify({"error": "Empty message"}), 400

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return jsonify({"error": "GEMINI_API_KEY is not configured on this server."}), 500

    # Fetch Intel Log and filter to last 30 days
    briefs = sheets.get_intel_log()
    cutoff = datetime.utcnow().date() - timedelta(days=30)

    def parse_date(s):
        for fmt in ("%B %d, %Y", "%B %d %Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(s.strip(), fmt).date()
            except ValueError:
                pass
        return None

    # Deduplicate by (date, title) and keep only recent rows
    seen, recent = set(), []
    for b in briefs:
        d = parse_date(b.get("Date", ""))
        if not d or d < cutoff:
            continue
        key = (str(d), b.get("Video Title", ""))
        if key not in seen:
            seen.add(key)
            recent.append(b)

    recent.sort(key=lambda b: b.get("Date", ""), reverse=True)

    def trunc(s, n):
        return s[:n] + "…" if len(s) > n else s

    sections = []
    for b in recent:
        lines = [f"=== {b.get('Date', '?')} — {b.get('Video Title', '?')} ==="]
        if b.get("TAC-INT Brief"):
            lines.append("TAC-INT:\n" + trunc(b["TAC-INT Brief"], 4000))
        if b.get("Wire News"):
            lines.append("WIRE NEWS:\n" + trunc(b["Wire News"], 2000))
        if b.get("Reddit OSINT"):
            lines.append("REDDIT OSINT:\n" + trunc(b["Reddit OSINT"], 1000))
        sections.append("\n".join(lines))

    context = "\n\n".join(sections) if sections else "(No briefs found for the last 30 days.)"

    prompt = (
        f"INTELLIGENCE BRIEFS ({len(recent)} entries, last 30 days):\n\n"
        f"{context}\n\n"
        f"ANALYST QUESTION: {question}"
    )

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=SYSTEM_PROMPT,
    )
    response = model.generate_content(prompt)
    return jsonify({"response": response.text, "brief_count": len(recent)})


# ── PWA ───────────────────────────────────────────────────────────────────────

@app.route("/sw.js")
def service_worker():
    # Must be served from root scope so it can control all pages
    return send_from_directory("static", "sw.js", mimetype="application/javascript")


# ── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(Exception)
def handle_error(e):
    return render_template("error.html", message=str(e)), 500


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
