"""Local app server: serves the dashboard and runs the analysis pipeline on uploaded workbooks.

    python server.py            ->  http://127.0.0.1:5000

Bound to localhost only. Findings stay on this machine (the brief forbids publishing them).
"""
import json
import threading
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory, abort

from pipeline import config as C
from run_pipeline import run_workbook, to_json, build_dashboard

ROOT = Path(__file__).resolve().parent
JOBS_DIR = ROOT / "output" / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)
STATIC_OK = {"index.html", "style.css", "analysis.css", "professional.css", "app.js", "analyze.js", "vendors_data.js", "config_snapshot.js", "pipeline_results.js", "dashboard_bind.js"}
MAX_UPLOAD = 5 * 1024 * 1024

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD
JOBS = {}


def config_payload():
    return {
        "criticality_weights": C.CRITICALITY_WEIGHTS,
        "tier_thresholds": C.TIER_THRESHOLDS,
        "depth": {t: {k: v for k, v in d.items()} for t, d in C.DEPTH_MATRIX.items()},
        "source_classes": {k: {"weight": w, "why": why} for k, (w, why) in C.SOURCE_CLASSES.items()},
        "signal_types": C.SIGNAL_TYPES,
        "tag_rules": C.TAG_RULES,
        "risk_weights": C.RISK_WEIGHTS,
        "risk_thresholds": C.RISK_THRESHOLDS,
        "confidence_cap": C.CONFIDENCE_CAP,
        "floors": [{"id": i, "tier": t, "why": w} for i, t, w in C.TIER_FLOORS],
    }


def write_config_snapshot():
    (ROOT / "config_snapshot.js").write_text(
        "window.PIPELINE_CONFIG = " + json.dumps(config_payload(), indent=1) + ";\n", encoding="utf-8")


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:name>")
def static_files(name):
    if name in STATIC_OK or name in ("Meridian_Vendor_Input.xlsx", "Meridian_Vendor_Input_Original.xlsx"):
        return send_from_directory(ROOT, name)
    abort(404)


@app.get("/api/config")
def api_config():
    return jsonify(config_payload())


def _run(job_id, path, mode, team):
    job = JOBS[job_id]
    out = JOBS_DIR / f"{job_id}_output.xlsx"

    def log(msg):
        job["log"].append(str(msg))

    def progress(i, n):
        job["progress"] = round(100 * i / n)

    try:
        results, summary, _ = run_workbook(str(path), mode, team, str(out), log=log, progress=progress)
        job["result"] = to_json(results, summary)
        job["status"] = "done"
        job["progress"] = 100
        log("Finished. Download the completed workbook from the button above.")
    except Exception as e:  # surfaced to the UI, never swallowed silently
        job["status"] = "error"
        job["error"] = f"{type(e).__name__}: {e}"
        log("ERROR " + job["error"])


@app.post("/api/analyze")
def api_analyze():
    mode = request.form.get("mode", "offline")
    if mode not in ("offline", "live"):
        return jsonify(error="mode must be offline or live"), 400
    team = (request.form.get("team") or "Team")[:60]
    job_id = uuid.uuid4().hex[:12]
    dest = JOBS_DIR / f"{job_id}_input.xlsx"
    f = request.files.get("file")
    if f and f.filename:
        if not f.filename.lower().endswith(".xlsx"):
            return jsonify(error="Please upload an .xlsx workbook"), 400
        f.save(dest)
    else:
        dest.write_bytes((ROOT / "Meridian_Vendor_Input_Original.xlsx").read_bytes())
    JOBS[job_id] = {"status": "running", "progress": 0, "log": [f"Job {job_id} started ({mode} mode)"],
                    "result": None, "error": None}
    threading.Thread(target=_run, args=(job_id, dest, mode, team), daemon=True).start()
    return jsonify(job_id=job_id)


@app.get("/api/job/<job_id>")
def api_job(job_id):
    job = JOBS.get(job_id)
    if not job:
        abort(404)
    return jsonify(job)


@app.get("/api/download/<job_id>")
def api_download(job_id):
    job = JOBS.get(job_id)
    if not job or job["status"] != "done":
        abort(404)
    p = JOBS_DIR / f"{job_id}_output.xlsx"
    return send_file(p, as_attachment=True, download_name="Meridian_Vendor_Output.xlsx")


if __name__ == "__main__":
    write_config_snapshot()
    build_dashboard("offline")
    print("Meridian TPRM pipeline running at http://127.0.0.1:5000  (localhost only)")
    app.run(host="127.0.0.1", port=5000, debug=False, threaded=True)
