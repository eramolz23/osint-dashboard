import sys
import os

# Make the project root importable so app.py and sheets.py can be found
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app  # noqa: F401 — Vercel looks for `app` in this file
