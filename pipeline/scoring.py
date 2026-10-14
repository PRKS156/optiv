"""Evidentiary weighting (role 03) and AI security risk (role 05)."""
import re
from . import config as C

STRONG_TYPES = {"DEPLOYED_USE", "PRODUCT_FEATURE", "PARTNERSHIP"}
WEAK_ONLY = {"READINESS_MARKETING", "ADVOCACY"}


def weigh(signals, tier: str, n_docs: int):
    """Aggregate signals into usage score, tag and the Yes/No/Inconclusive call."""
    pos = [s for s in signals if s["type"] not in ("NEGATION", "ADVOCACY")]  # advocacy = context, not use
    neg = [s for s in signals if s["type"] == "NEGATION"]
    # Independence: repeated lines from the same kind of source are one voice.
    # Only distinct source classes corroborate each other (noisy-OR across classes).
    best = {}
    for s in pos:
        best[s["source_class"]] = max(best.get(s["source_class"], 0), s["score"])
    prod = 1.0
    for v in best.values():
        prod *= (1 - min(v, 0.95))
    usage = round(1 - prod, 3) if pos else 0.0
    classes = sorted({s["source_class"] for s in pos if s["score"] >= 0.15})
    strong = any(s["type"] in STRONG_TYPES and s["source_weight"] >= 0.7 and s["score"] >= 0.5 for s in pos)

    if not pos:
        tag = "None found"
    elif all(s["type"] in WEAK_ONLY | {"MENTION"} for s in pos) and usage < 0.5:
        tag = "Marketing-only"
    else:
        tag = next(t for t, th in C.TAG_RULES if usage >= th)
        if tag == "Confirmed" and not strong:
            tag = "Probable"

    need = C.DEPTH_MATRIX[tier]["min_docs_for_negative"]
    if tag in ("Confirmed", "Probable"):
        detected = "Yes"
    elif tag in ("Indicative", "Marketing-only"):
        detected = "Inconclusive"
    elif neg or n_docs >= need:
        detected = "No"
    else:
        detected = "Inconclusive"
    coverage_gap = (tag == "None found" and n_docs < need)
    return {"usage_score": usage, "tag": tag, "detected": detected, "source_classes": classes,
            "corroborated": len(classes) >= 2, "coverage_gap": coverage_gap,
            "docs_reviewed": n_docs, "docs_needed_for_negative": need}


def _ai_role(signals):
    txt = " ".join(s["excerpt"] for s in signals if s["type"] not in ("NEGATION",))
    if not signals:
        return "none"
    if any(s["agentic"] for s in signals):
        return "agentic"
    if C.GENERATIVE.search(txt):
        return "generative"
    if C.ANALYTIC.search(txt):
        return "analytic"
    return "unspecified"


def providers_named(signals):
    names = []
    for s in sorted(signals, key=lambda x: -x["score"]):
        if s["score"] >= 0.15:
            names += s["providers"]
    return list(dict.fromkeys(names))


def classify_risk(crit: dict, weighed: dict, signals):
    tier = crit["tier"]
    data = crit["factors"]["data_sensitivity"]
    role = _ai_role([s for s in signals if s["score"] >= 0.15] or signals)
    sev = round(C.RISK_WEIGHTS["tier"] * C.TIER_RANK[tier] + C.RISK_WEIGHTS["data"] * data
                + C.RISK_WEIGHTS["ai_role"] * C.AI_ROLE_SCORE[role], 2)
    raw = next(c for c, th in C.RISK_THRESHOLDS if sev >= th)

    if weighed["detected"] == "No":
        cls = "None identified"
    else:
        cap = C.CONFIDENCE_CAP.get(weighed["tag"], "Medium")
        cls = raw if C.TIER_RANK[raw] <= C.TIER_RANK[cap] else cap
    provs = providers_named(signals)
    flags = []
    if weighed["detected"] in ("Yes",) and not provs:
        flags.append("UNRESOLVED_PROVIDER")
    if role == "agentic":
        flags.append("AUTONOMOUS_ACTIONS")
    if weighed["detected"] in ("Yes", "Inconclusive") and data >= 3 and weighed["tag"] != "None found":
        flags.append("SENSITIVE_DATA_TO_MODELS")
    if any(s["provenance"].startswith("analyst") for s in signals):
        flags.append("ANALYST_RECORDED_EVIDENCE_NOT_MACHINE_VERIFIED")
    if weighed["coverage_gap"]:
        flags.append("COVERAGE_GAP")
    return {"severity": sev, "raw_class": raw, "risk_class": cls, "ai_role": role,
            "providers": provs, "flags": flags}
