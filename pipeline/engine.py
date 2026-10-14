"""Orchestrates the whole chain for one vendor or a whole workbook."""
import re
from datetime import date

from . import config as C
from .criticality import score_vendor
from .collect import collect
from .signals import extract
from .scoring import weigh, classify_risk

TYPE_LABEL = {
    "DEPLOYED_USE": "stated deployment", "PRODUCT_FEATURE": "AI embedded in product",
    "PARTNERSHIP": "partnership / integration with a model provider", "HIRING": "AI work referenced in hiring",
    "ROADMAP": "planned / pilot use", "MENTION": "AI mentioned, role unclear",
    "READINESS_MARKETING": "AI-readiness positioning only", "ADVOCACY": "advocacy for others' adoption",
    "NEGATION": "explicit statement of no AI use",
}
ROLE_TEXT = {
    "agentic": "agentic / autonomous actions on operational data",
    "generative": "generative / LLM-assisted processing of content",
    "analytic": "ML-based analytics, scoring or anomaly detection",
    "unspecified": "AI use of unspecified type", "none": "no AI role identified",
}


def _how_used(signals, role, detected):
    if detected == "No":
        return ("None identified from public sources reviewed. Absence of evidence is not proof of absence; "
                "coverage and date are recorded in the Evidence Log.")
    useful = [s for s in sorted(signals, key=lambda x: -x["score"]) if s["score"] >= 0.15][:3]
    if not useful:
        return "Signals are too weak to describe a usage; carried to vendor questionnaire."
    parts = []
    for i, s in enumerate(useful, 1):
        parts.append(f"({i}) {TYPE_LABEL[s['type']]} - {s['excerpt'][:190].rstrip()}"
                     f"{'...' if len(s['excerpt']) > 190 else ''}")
    return (f"Role of AI: {ROLE_TEXT[role]}. " + " ".join(parts) +
            " Extent of human review and data flows are not determinable from public material.")


def _providers_cell(provs, detected, flags):
    if provs:
        return "; ".join(provs) + " (named in public material)."
    if detected == "Yes":
        return "None named - Inconclusive. AI use is evidenced but no model provider is identified; raised with vendor."
    return "None named - None identified." if detected == "No" else "None named - Inconclusive."


def _risk_rationale(crit, weighed, risk):
    t = weighed["tag"]
    base = (f"Severity {risk['severity']}/4 = 0.4 x tier ({crit['tier']}) + 0.4 x data sensitivity "
            f"({crit['factors']['data_sensitivity']}) + 0.2 x AI role ({risk['ai_role']}). "
            f"Evidence confidence: {t} (usage score {weighed['usage_score']}, "
            f"{len(weighed['source_classes'])} source class(es)). ")
    if risk["risk_class"] != risk["raw_class"] and risk["risk_class"] != "None identified":
        base += f"Classification held at {risk['risk_class']} because evidence is only '{t}' (raw severity {risk['raw_class']}). "
    if "SENSITIVE_DATA_TO_MODELS" in risk["flags"]:
        base += "Sensitive Meridian data may be exposed to AI models. "
    if "UNRESOLVED_PROVIDER" in risk["flags"]:
        base += "Model provider / sub-processor is undisclosed, so onward data flows and retention are untraceable. "
    if "AUTONOMOUS_ACTIONS" in risk["flags"]:
        base += "Automated actions reduce transparency over decisions affecting Meridian. "
    if "COVERAGE_GAP" in risk["flags"]:
        base += (f"Only {weighed['docs_reviewed']} document(s) reviewed against {weighed['docs_needed_for_negative']} "
                 "required before a negative finding is accepted; result is a coverage gap, not clearance. ")
    if "ANALYST_RECORDED_EVIDENCE_NOT_MACHINE_VERIFIED" in risk["flags"]:
        base += "Some evidence was analyst-recorded and not machine-verified in this run (trust x0.9). "
    return base.strip()


def _action(crit, weighed, risk):
    sla = C.ACTION_SLA.get(risk["risk_class"] if risk["risk_class"] in C.ACTION_SLA else "Low")
    cls = risk["risk_class"]
    if cls == "None identified" and not weighed["coverage_gap"]:
        return ("Continue standard oversight for the vendor's tier. Add a preventative clause requiring written "
                "notice before AI / third-party model sub-processors are introduced. Re-assess annually and on "
                "material product announcements.")
    acts = []
    if weighed["coverage_gap"] or weighed["detected"] == "Inconclusive":
        acts.append(f"Extend OSINT coverage (live sweep / further source classes) and issue a targeted AI "
                    f"questionnaire {sla}")
    if cls in ("Critical", "High", "Medium") and weighed["detected"] == "Yes":
        acts.append(f"Issue a formal AI security & sub-processor questionnaire {sla}: model provider identity, "
                    "hosting region, retention, training use of Meridian data, human-review thresholds")
    if "UNRESOLVED_PROVIDER" in risk["flags"]:
        acts.append("Register on the AI sub-processor inventory with an unresolved-provider flag")
    if "AUTONOMOUS_ACTIONS" in risk["flags"]:
        acts.append("Require human-in-the-loop authorisation for any agent action touching Meridian data or transactions")
    if cls in ("Critical", "High"):
        acts.append("Add AI clauses (no-training, sub-processor change notification, audit rights) at next contract "
                    "event and escalate to the Third-Party Risk Committee if unanswered")
    return ". ".join(acts) + "." if acts else f"Review {sla}."


def analyze_vendor(row: dict, mode="offline", log=print):
    crit = score_vendor(row)
    docs, errors = collect(row, crit["depth"]["max_pages"], mode, log)
    signals = extract(docs)
    weighed = weigh(signals, crit["tier"], sum(d.get("pages", 1) for d in docs))
    risk = classify_risk(crit, weighed, signals)

    ev_lines = []
    for s in sorted(signals, key=lambda x: -x["score"])[:5]:
        if s["score"] < 0.1 and s["type"] != "NEGATION":
            continue
        ev_lines.append(f'[{s["type"]} | {s["source_class"]} | weight {s["source_weight"]} | '
                        f'retrieved {s["retrieved"]} | {s["provenance"]}] "{s["excerpt"]}" - {s["url"]}')
    if not ev_lines:
        ev_lines.append(f"No AI signal found in {len(docs)} document(s) reviewed "
                        f"({', '.join(sorted({d['source_class'] for d in docs})) or 'none retrieved'}). "
                        "Negative finding; see Evidence Log for coverage.")
    if errors:
        ev_lines.append(f"Fetch notes: {len(errors)} page(s) unavailable or disallowed (details in Evidence Log).")

    provided = {k: row.get(k) for k in (
        "Vendor ID", "Vendor Name", "Vendor Description", "Service / Product Provided", "Category",
        "Public Website", "Business Process Supported", "Operational Dependency",
        "Data Classification Accessed", "Data Volume (annual)")}
    return {
        "vendor_id": row["Vendor ID"], "vendor_name": row["Vendor Name"], "provided": provided,
        "docs": docs, "signals": signals,
        "errors": errors, "crit": crit, "weighed": weighed, "risk": risk,
        "cells": {
            "Criticality Tier": crit["tier"],
            "Criticality Rationale": crit["rationale"],
            "Assessment Depth Applied": crit["depth_text"],
            "AI Usage Detected": weighed["detected"],
            "Evidence Description": "\n".join(ev_lines),
            "How Vendor May Be Using AI": _how_used(signals, risk["ai_role"], weighed["detected"]),
            "Named AI Sub-processors": _providers_cell(risk["providers"], weighed["detected"], risk["flags"]),
            "AI Security Risk Classification": risk["risk_class"],
            "Risk Rationale": _risk_rationale(crit, weighed, risk),
            "Recommended Action": _action(crit, weighed, risk),
            "Assessed": f"{{team}} / {date.today().strftime('%d-%m-%Y')}",
        },
    }


BENCHMARK_EXPECTED = {"tier": "Critical", "detected": "Yes", "risk_class": "Critical"}


def benchmark_check(result):
    got = {"tier": result["crit"]["tier"], "detected": result["weighed"]["detected"],
           "risk_class": result["risk"]["risk_class"]}
    return {"expected": BENCHMARK_EXPECTED, "got": got, "pass": got == BENCHMARK_EXPECTED}
