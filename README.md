# Meridian TPRM - Vendor AI Usage Pipeline (Case Study 1)

Findings are confidential: keep this folder local (no public repository, no vendor contact).

## Run

```bash
pip install -r requirements.txt
python server.py            # http://127.0.0.1:5000  -> "Live Analysis" tab
# or headless:
python run_pipeline.py Meridian_Vendor_Input_Original.xlsx --mode offline --team "Team Optiv"
python run_pipeline.py Meridian_Vendor_Input_Original.xlsx --mode live
```

Output: `output/Meridian_Vendor_Output.xlsx` - columns L-V filled, plus `Evidence Log`,
`Criticality Scores`, `Rubric & Weights`. Provided columns A-K and the V-000 benchmark are never edited.

## Pipeline

| Stage | Module | What it does |
|---|---|---|
| 1 Criticality | `pipeline/criticality.py` | 5-factor weighted rubric + hard floors -> tier, rationale, depth plan |
| 2 Collection | `pipeline/collect.py` | tier-sized page budget; robots.txt, rate limit, SSRF guard, soft-404 filter, SHA-256 + date |
| 3 Signals | `pipeline/signals.py` | sentence-level AI signals, 8 types, provider detection, optional LLM assist |
| 4 Weighting | `pipeline/scoring.py` | source-class weight x signal type x trust; noisy-OR across *independent classes*; tags |
| 5 Risk | `pipeline/scoring.py`, `engine.py` | severity x evidence-confidence cap; flags; action + SLA |
| 6 Output | `pipeline/excel_io.py` | workbook + Evidence Log |

Every weight/threshold lives in `pipeline/config.py` and is echoed into the output workbook.

## Modes

* **offline** - uses `data/evidence_seed.json` (analyst-recorded evidence, discounted x0.9 and flagged
  "not machine-verified"). Instant; good for demos.
* **live** - fetches each vendor's own public pages, then merges the seed. Cached in `evidence_store/`.

## Benchmark check

V-000 (Larkspur) is run through the engine on every analysis and compared with the worked example
(Critical / Yes / Critical). The tier threshold was calibrated on this single row.

## Known limits

* Rule-based sentence typing misreads context (e.g. a women-in-tech partnership release mentioning "deploying AI at scale").
  Corroboration across source classes and the tag rules limit the damage; a human must review excerpts.
* "No" is only returned when enough pages were reviewed for the tier; otherwise it is "Inconclusive (coverage gap)".
* The optional LLM assist (`ANTHROPIC_API_KEY`) is implemented but has not been exercised in this repo.
* Dashboard tabs 1-6 are rendered by `dashboard_bind.js` from `pipeline_results.js` (regenerated on every server start
  and after every Live Analysis run), so they cannot disagree with the pipeline or the downloaded workbook.
  `vendors_data.js` is intentionally an empty array filled at load; do not hand-edit vendor data.

## Deck

`node deck/build_deck.js` (needs `npm install pptxgenjs` inside `deck/`) builds `Meridian_Case_Study_1_Deck.pptx` from
`pipeline_results.js` and `config_snapshot.js`, so slide numbers always match the site and the workbook.
Set `NODE_PATH=deck/node_modules` when running.
