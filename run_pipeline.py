"""CLI:  python run_pipeline.py [input.xlsx] [--mode offline|live] [--team NAME] [--out out.xlsx]"""
import argparse
import json
from pathlib import Path

from pipeline.excel_io import read_inventory, write_results
from pipeline.engine import analyze_vendor, benchmark_check

ROOT = Path(__file__).resolve().parent


def run_workbook(path, mode="offline", team="Team", out=None, log=print, progress=None):
    rows = read_inventory(path)
    results, bench = [], None
    for i, row in enumerate(rows, 1):
        log(f"[{i}/{len(rows)}] {row['Vendor ID']} {row['Vendor Name']}")
        res = analyze_vendor(row, mode, log)
        if row["Vendor ID"] == "V-000":
            bench = benchmark_check(res)
        results.append(res)
        if progress:
            progress(i, len(rows))
    scored = [r for r in results if r["vendor_id"] != "V-000"]
    summary = {
        "vendors": len(scored),
        "ai_yes": sum(r["weighed"]["detected"] == "Yes" for r in scored),
        "ai_no": sum(r["weighed"]["detected"] == "No" for r in scored),
        "ai_inconclusive": sum(r["weighed"]["detected"] == "Inconclusive" for r in scored),
        "critical_tier": sum(r["crit"]["tier"] == "Critical" for r in scored),
        "high_or_critical_risk": sum(r["risk"]["risk_class"] in ("Critical", "High") for r in scored),
        "benchmark": bench, "mode": mode,
    }
    out_path = None
    if out:
        out_path = write_results(path, out, results, team=team)
    return results, summary, out_path


def to_json(results, summary):
    def slim(r):
        return {
            "vendor_id": r["vendor_id"], "vendor_name": r["vendor_name"],
            "benchmark": r["vendor_id"] == "V-000", "provided": r["provided"],
            "tier": r["crit"]["tier"], "criticality_score": r["crit"]["weighted_score"],
            "factors": r["crit"]["factors"], "floors": r["crit"]["floors_applied"],
            "depth": r["crit"]["depth"]["label"], "max_pages": r["crit"]["depth"]["max_pages"],
            "ai_detected": r["weighed"]["detected"], "tag": r["weighed"]["tag"],
            "usage_score": r["weighed"]["usage_score"], "corroborated": r["weighed"]["corroborated"],
            "source_classes": r["weighed"]["source_classes"],
            "docs_reviewed": r["weighed"]["docs_reviewed"], "coverage_gap": r["weighed"]["coverage_gap"],
            "risk_class": r["risk"]["risk_class"], "severity": r["risk"]["severity"],
            "ai_role": r["risk"]["ai_role"], "providers": r["risk"]["providers"], "flags": r["risk"]["flags"],
            "cells": r["cells"],
            "signals": r["signals"], "errors": r["errors"],
            "documents": [{k: d[k] for k in ("url", "title", "source_class", "retrieved", "provenance")}
                          for d in r["docs"]],
        }
    return {"summary": summary, "results": [slim(r) for r in results]}


def export_dashboard_js(results, summary, path, team="Team"):
    """Write window.PIPELINE_RESULTS so every dashboard tab renders from pipeline output (works from file://)."""
    from datetime import date
    payload = to_json(results, summary)
    payload["meta"] = {"generated": date.today().strftime("%d-%m-%Y"), "mode": summary.get("mode"), "team": team}
    Path(path).write_text("window.PIPELINE_RESULTS = " + json.dumps(payload, ensure_ascii=False) + ";\n",
                          encoding="utf-8")
    return path


def build_dashboard(mode="offline", team="Team Optiv", src=None, log=lambda *_: None):
    src = src or str(ROOT / "Meridian_Vendor_Input_Original.xlsx")
    results, summary, _ = run_workbook(src, mode, team, None, log=log)
    return export_dashboard_js(results, summary, ROOT / "pipeline_results.js", team)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("input", nargs="?", default=str(ROOT / "Meridian_Vendor_Input_Original.xlsx"))
    ap.add_argument("--mode", choices=["offline", "live"], default="offline")
    ap.add_argument("--team", default="Team")
    ap.add_argument("--out", default=str(ROOT / "output" / "Meridian_Vendor_Output.xlsx"))
    a = ap.parse_args()
    res, summ, out = run_workbook(a.input, a.mode, a.team, a.out)
    print(json.dumps(summ, indent=2))
    for r in res:
        print(f"{r['vendor_id']:6} {r['crit']['tier']:9} score={r['crit']['weighted_score']:<5} "
              f"AI={r['weighed']['detected']:12} tag={r['weighed']['tag']:15} risk={r['risk']['risk_class']:15} "
              f"flags={','.join(r['risk']['flags'])}")
    print("written:", out)
