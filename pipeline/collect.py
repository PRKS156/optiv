"""Roles 03/04 - OSINT collection.

Live mode fetches the vendor's own public pages (polite, robots.txt-respecting,
cached to disk, content-hashed). Offline mode - and a merge step in live mode -
uses analyst-recorded evidence from data/evidence_seed.json so the demo works
without network access. Every document keeps URL, retrieval date, SHA-256 and
provenance so a finding can always be traced back.
"""
import hashlib
import json
import re
import time
import urllib.robotparser
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, urlparse

from . import config as C

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "evidence_store"
SEED = ROOT / "data" / "evidence_seed.json"
UA = "OptivTPRM-OSINT/1.0 (academic case study; contact: team)"
LINK_HINTS = ["news", "press", "release", "blog", "insight", "resource", "career", "job", "trust", "security",
              "ai", "intelligen", "innovation", "product", "solution", "platform", "subprocessor",
              "sub-processor", "privacy", "compliance", "docs", "investor", "technology", "about"]
FIXED_PATHS = ["/", "/newsroom", "/news", "/press", "/blog", "/insights", "/resources", "/careers", "/trust",
               "/security", "/privacy", "/ai", "/about"]


def classify_source(url: str, title: str = "") -> str:
    probe = f"{url} {title}".lower()
    for cls, pat in C.SOURCE_URL_HINTS:
        if re.search(pat, probe):
            return cls
    return "vendor_marketing" if urlparse(url).path in ("", "/") else "unknown"


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", "ignore")).hexdigest()


def load_seed(vendor_id: str):
    if not SEED.exists():
        return []
    data = json.loads(SEED.read_text(encoding="utf-8"))
    docs = []
    for d in data.get(vendor_id, []):
        d = dict(d)
        d.setdefault("source_class", classify_source(d.get("url", ""), d.get("title", "")))
        d.setdefault("retrieved", "13-10-2026")
        d["sha256"] = _sha(d["text"])
        d["provenance"] = d.get("provenance", "analyst-recorded")
        docs.append(d)
    return docs


def _is_public_host(hostname) -> bool:
    """SSRF guard: uploaded workbooks must not be able to point the fetcher at internal addresses."""
    import ipaddress
    import socket
    if not hostname:
        return False
    try:
        for info in socket.getaddrinfo(hostname, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        return True
    except Exception:
        return False


def _robots(base: str):
    rp = urllib.robotparser.RobotFileParser()
    try:
        rp.set_url(urljoin(base, "/robots.txt"))
        rp.read()
    except Exception:
        return None
    return rp


def fetch_live(vendor: dict, max_pages: int, log=print):
    """Fetch up to max_pages from the vendor's own domain. Returns (docs, errors)."""
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        return [], ["requests/bs4 not installed"]

    site = (vendor.get("Public Website") or "").strip()
    if not site or site.endswith(".example"):
        return [], ["no fetchable website (fictional benchmark or empty)"]
    base = site if site.startswith("http") else "https://" + site
    host = urlparse(base).netloc.replace("www.", "")
    if not _is_public_host(urlparse(base).hostname):
        return [], [f"blocked: {site} does not resolve to a public internet address"]
    CACHE.mkdir(exist_ok=True)
    rp = _robots(base)
    sess = requests.Session()
    sess.headers.update({"User-Agent": UA})
    docs, errors, seen = [], [], set()

    def get(url):
        if url in seen:
            return None
        seen.add(url)
        if rp is not None and not rp.can_fetch(UA, url):
            errors.append(f"robots.txt disallows {url}")
            return None
        key = CACHE / (_sha(url)[:24] + ".json")
        if key.exists():
            return json.loads(key.read_text(encoding="utf-8"))
        try:
            r = sess.get(url, timeout=10)
            time.sleep(0.6)
            if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
                errors.append(f"{url} -> HTTP {r.status_code}")
                return None
            soup = BeautifulSoup(r.content, "lxml")
            title = (soup.title.string or "").strip() if soup.title else ""
            for t in soup(["script", "style", "noscript", "svg", "nav", "footer", "header", "form"]):
                t.decompose()
            text = re.sub(r"\s+", " ", soup.get_text(" ")).strip()
            links = [urljoin(url, a["href"]) for a in BeautifulSoup(r.content, "lxml").find_all("a", href=True)]
            rec = {"url": r.url, "title": title, "text": text[:60000], "links": links[:400],
                   "retrieved": date.today().strftime("%d-%m-%Y")}
            key.write_text(json.dumps(rec), encoding="utf-8")
            return rec
        except Exception as e:  # network errors are data, not crashes
            errors.append(f"{url} -> {type(e).__name__}")
            return None

    queue = [urljoin(base, p) for p in FIXED_PATHS]
    first = get(queue[0])
    if first:
        # rank discovered same-domain links by keyword hints
        scored = []
        for l in first["links"]:
            p = urlparse(l)
            if host not in p.netloc or p.scheme not in ("http", "https"):
                continue
            s = sum(h in l.lower() for h in LINK_HINTS)
            if s:
                scored.append((s, l.split("#")[0]))
        queue += [l for _, l in sorted(scored, key=lambda x: -x[0])]
    fetched, hashes = 0, set()
    for url in queue:
        if fetched >= max_pages:
            break
        rec = first if url == queue[0] and first else get(url)
        if not rec or not rec["text"]:
            continue
        # Reject soft-404s, thin pages and duplicates so they never count as coverage.
        h = _sha(rec["text"])
        if (re.search(r"/404|not[-_ ]?found|/error", rec["url"], re.I)
                or re.search(r"\b404\b|not found|page cannot be found|access denied", rec["title"], re.I)
                or len(rec["text"]) < 300 or h in hashes):
            errors.append(f"{rec['url']} -> rejected (error page, thin or duplicate content)")
            continue
        hashes.add(h)
        fetched += 1
        docs.append({
            "url": rec["url"], "title": rec["title"], "text": rec["text"],
            "source_class": classify_source(rec["url"], rec["title"]),
            "retrieved": rec["retrieved"], "sha256": _sha(rec["text"]), "provenance": "machine-fetched",
        })
        log(f"    fetched {rec['url']}")
    return docs, errors


def collect(vendor: dict, max_pages: int, mode: str = "offline", log=print):
    """mode: 'live' (fetch + merge seed) or 'offline' (seed only)."""
    vid = vendor["Vendor ID"]
    docs, errors = [], []
    if mode == "live":
        docs, errors = fetch_live(vendor, max_pages, log)
    docs += load_seed(vid)
    return docs, errors
