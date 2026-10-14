"""Role 01 - deterministic, explainable criticality scoring from the provided columns."""
import re
from . import config as C


def _max_number(text: str) -> float:
    """Largest quantity mentioned in a string ('2.1 million', '38,000', '240 million')."""
    best = 0.0
    for m in re.finditer(r"(\d[\d,]*\.?\d*)\s*(billion|million|thousand|bn|m|k)?\b", text or "", re.I):
        try:
            n = float(m.group(1).replace(",", ""))
        except ValueError:
            continue
        unit = (m.group(2) or "").lower()
        n *= {"billion": 1e9, "bn": 1e9, "million": 1e6, "m": 1e6, "thousand": 1e3, "k": 1e3}.get(unit, 1)
        best = max(best, n)
    return best


def _first_rule(rules, text, default):
    for score, pat in rules:
        if re.search(pat, text or "", re.I):
            return score
    return default


def score_vendor(row: dict) -> dict:
    """Return factor scores, weighted score, tier, floors applied and a plain-English rationale."""
    data_txt = row.get("Data Classification Accessed") or ""
    vol_txt = row.get("Data Volume (annual)") or ""
    proc_txt = " ".join(str(row.get(k) or "") for k in
                        ("Business Process Supported", "Service / Product Provided", "Category", "Vendor Description"))
    dep_raw = str(row.get("Operational Dependency") or "").strip().lower()

    # --- factor scores ---------------------------------------------------
    data = _first_rule(C.DATA_SENSITIVITY_RULES, data_txt, 2)
    if re.search(C.DATA_SENSITIVITY_FLOOR_PATTERN, data_txt, re.I):
        data = max(data, 3)
    dep = C.DEPENDENCY_SCORE.get(dep_raw, 2)
    pay_cat = re.search(C.PAYMENT_CATEGORY_PATTERN, str(row.get("Category") or ""), re.I)
    if pay_cat:
        pay = 4
    elif re.search(C.PAYMENT_PATTERN, proc_txt + " " + data_txt, re.I):
        pay = 2
    else:
        pay = 1
    reg = _first_rule(C.REGULATORY_RULES, proc_txt + " " + data_txt, 1)
    biggest = max(_max_number(vol_txt), _max_number(data_txt))
    vol = next(score for lim, score in C.VOLUME_STEPS if biggest >= lim)

    factors = {
        "data_sensitivity": data,
        "operational_dependency": dep,
        "payment_flow": pay,
        "regulatory_exposure": reg,
        "data_volume": vol,
    }
    weighted = round(sum(factors[k] * w for k, w in C.CRITICALITY_WEIGHTS.items()), 2)
    tier = next(t for t, th in C.TIER_THRESHOLDS if weighted >= th)

    # --- hard floors -----------------------------------------------------
    floors = []
    if dep_raw in ("critical", "total"):
        floors.append(C.TIER_FLOORS[0])
    if re.search(C.DATA_SENSITIVITY_FLOOR_PATTERN, data_txt, re.I) and \
            re.search(r"no direct customer", data_txt, re.I):
        floors.append(C.TIER_FLOORS[1])
    if data == 4:
        floors.append(C.TIER_FLOORS[2])
    applied = []
    for _, floor_tier, why in floors:
        if C.TIER_RANK[floor_tier] > C.TIER_RANK[tier]:
            tier = floor_tier
            applied.append(why)

    rationale = (
        f"Weighted score {weighted}/4 from data sensitivity {data}, operational dependency {dep} "
        f"('{row.get('Operational Dependency')}'), payment flow {pay}, regulatory exposure {reg}, "
        f"data volume {vol} (largest figure {int(biggest):,}). "
        + (" ".join(applied) + " " if applied else "")
        + f"Tier: {tier}."
    )
    depth = C.DEPTH_MATRIX[tier]
    return {
        "factors": factors, "weighted_score": weighted, "tier": tier,
        "floors_applied": applied, "rationale": rationale,
        "depth": depth,
        "depth_text": (f"{depth['label']} - tier-driven ({tier}). Source classes consulted: "
                       f"{', '.join(depth['sources'])}. Page budget {depth['max_pages']}. "
                       f"Manual follow-up: {depth['manual']} Stop rule: {depth['stop_rule']}"),
    }
