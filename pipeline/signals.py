"""Role 04 - extract, classify and tag AI signals from collected documents.

Rule-based by default (deterministic, explainable, works offline). If the
ANTHROPIC_API_KEY env var and the `anthropic` package are present, ambiguous
sentences (type MENTION) are re-classified by an LLM - an *assist*, never the
only judge: the rule label is kept alongside so a reviewer can see both.
"""
import hashlib
import json
import os
import re

from . import config as C


def _sentences(text: str):
    parts = []
    # listing pages run titles together; "Read more >" is a reliable item boundary
    text = re.sub(r"(Read more|Learn more|Read the (full )?(article|story))\s*[>»…\.]*", ". ", text, flags=re.I)
    for chunk in re.split(r"\s\|\s|\n", text):
        parts += re.split(r"(?<=[.!?])\s+(?=[A-Z\"'])", chunk)
    for p in parts:
        p = p.strip()
        if 25 <= len(p) <= 1200:
            yield p
        elif len(p) > 1200:  # long un-punctuated scrape: window it
            for i in range(0, len(p), 600):
                yield p[i:i + 700]


def _providers(sentence: str):
    found = []
    for pat, name in C.PROVIDERS:
        if re.search(pat, sentence, re.I) and not C.NOT_MODEL_PROVIDERS.fullmatch(name):
            found.append(name)
    # 'Microsoft' catch-all must not double-list when a specific Azure/Copilot hit exists
    return list(dict.fromkeys(found))


def _classify(sentence: str, source_class: str) -> str:
    for stype, pat in C.SIGNAL_PATTERNS:
        if pat.search(sentence):
            if stype in ("DEPLOYED_USE", "PARTNERSHIP", "PRODUCT_FEATURE") and source_class == "job_posting":
                return "HIRING"
            return stype
    return "HIRING" if source_class == "job_posting" else "MENTION"


def _llm_refine(sentence: str):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        msg = client.messages.create(
            model=os.environ.get("TPRM_LLM_MODEL", "claude-haiku-5-5"),
            max_tokens=60,
            messages=[{"role": "user", "content":
                       "Classify how this vendor sentence relates to AI use inside the vendor's service. "
                       f"Choose exactly one of {list(C.SIGNAL_TYPES)}. Reply with JSON {{\"type\": ...}}.\n\n"
                       f"Sentence: {sentence}"}],
        )
        t = json.loads(re.search(r"\{.*\}", msg.content[0].text, re.S).group(0))["type"]
        return t if t in C.SIGNAL_TYPES else None
    except Exception:
        return None


def extract(docs):
    """Return a de-duplicated list of signal dicts across all docs."""
    signals, seen = [], set()
    for d in docs:
        sw, _why = C.SOURCE_CLASSES.get(d["source_class"], C.SOURCE_CLASSES["unknown"])
        trust = 1.0
        if d.get("provenance", "").startswith("analyst"):
            trust *= C.ANALYST_RECORDED_TRUST
        if d.get("attribution") == "supplier_product":
            trust *= C.SUPPLIER_ATTRIBUTION_TRUST
        per_doc = []
        for s in _sentences(d["text"]):
            if not C.AI_TERMS.search(s):
                if C.SIGNAL_PATTERNS[0][1].search(s):  # explicit negation without AI keyword
                    pass
                else:
                    continue
            h = hashlib.md5(s.lower().encode()).hexdigest()
            if h in seen:
                continue
            seen.add(h)
            stype = _classify(s, d["source_class"])
            llm = None
            if stype == "MENTION":
                llm = _llm_refine(s)
                if llm:
                    stype = llm
            score = round(sw * C.SIGNAL_TYPES[stype] * trust, 3)
            per_doc.append({
                "excerpt": s if len(s) <= 500 else s[:497] + "...",
                "type": stype, "llm_assisted": bool(llm),
                "source_class": d["source_class"], "source_weight": sw, "trust": round(trust, 2),
                "score": score, "url": d["url"], "retrieved": d["retrieved"], "sha256": d["sha256"][:16],
                "provenance": d.get("provenance", ""), "title": d.get("title", ""),
                "providers": _providers(s),
                "agentic": bool(C.AGENTIC.search(s)),
            })
        # a single noisy page may not dominate: keep its 3 strongest signals
        per_doc.sort(key=lambda x: -x["score"])
        signals += per_doc[:3]
    return signals
