import json
import pathlib
import re

p = pathlib.Path(__file__).parent / "build_deck.js"
s = p.read_text(encoding="utf-8")


def J(x):
    return json.dumps(x)  # JS-safe string literal, non-ASCII escaped


# ---- 1. new header for every content slide (order = slide 2..18) ----
H = [
    ("The challenge: vendor AI is invisible to Meridian",
     "Vendors embed AI in their products and services, often without saying so, and the risk lands on Meridian.",
     "CONTEXT",
     "Three risks matter: sensitive data reaching AI models, undisclosed AI sub-processors, and reduced transparency over decisions. The hard part is telling real use from marketing."),
    ("Objectives and what we will show today",
     "Five goals shaped the solution; each one is demonstrated in the next few minutes.",
     "CONTEXT",
     "Frame the session in about thirty seconds: the goals on the left, what the audience will see on the right."),
    ("Our solution at a glance",
     "Upload the Meridian vendor inventory; get tier, AI usage, evidence strength, providers, risk and next action for every vendor.",
     "SOLUTION",
     "This is the whole project on one slide. Each step is a module; the next slides open them up one by one."),
    ("Solution design: from OSINT collection to risk output",
     "The components and the data that flows between them.",
     "SOLUTION",
     "Walk left to right. Emphasise two things: the tier drives how deep we go, and the two exits at the end: the workbook for Meridian and the questionnaire items for the vendor."),
    ("Technical architecture",
     "A local web app over a Python pipeline. Every rule lives in one configuration file.",
     "SOLUTION",
     "Top to bottom: what the user touches, the API, the six pipeline modules, and the stores. The key design choice is that all weights and thresholds are in config.py, so results are auditable and tunable."),
    ("How we rate vendor criticality",
     "Five weighted factors, scored from the provided columns, so any analyst reaches the same tier.",
     "METHOD",
     "Another analyst gets the same rating because the inputs are the provided columns and the rules are written down. The threshold was calibrated on the benchmark row V-000 only; say so if asked."),
    ("Matching assessment depth to risk",
     "A Critical vendor gets a deep sweep and a Low one a light touch. Depth follows the tier, not how easy the vendor is to research.",
     "METHOD",
     "The pipeline enforces the page budget and the minimum pages before a negative finding is accepted. The source-class list and stop rule guide the analyst's manual follow-up and are written into the workbook."),
    ("Which public sources reveal real AI use",
     "Each source class carries a weight that reflects how reliably it shows genuine AI use.",
     "METHOD",
     "Filings and technical documentation outweigh blogs and marketing pages. The weights live in config.py, so they can be challenged and tuned."),
    ("Weighing evidence: how sure are we?",
     "Repetition from one source adds nothing; agreement between different kinds of source raises confidence.",
     "METHOD",
     "Left: how one signal is scored. Middle: signals from the same source class collapse to the strongest one, then classes combine. Right: the tag the stakeholder sees and the Yes / No / Inconclusive call it produces."),
    ("Detection capability: collect, extract, classify",
     "Public pages in; typed, traceable AI signals out, with safeguards built in.",
     "METHOD",
     "Be honest about the AI-based technique: a curated AI lexicon with typed signals, plus an optional LLM assist that only re-labels ambiguous sentences, always keeping the rule label alongside it. The LLM assist is implemented but was not exercised in this build."),
    ("From evidence to AI security risk",
     "A weak finding can never produce a Critical rating, and a strong one is not softened.",
     "METHOD",
     "Left to right: severity from tier, data sensitivity and AI role; then the cap from the evidence tag. Below: how the three key risks appear as flags. Bottom: the action deadline per class."),
    ("Results across Meridian's vendors", None, "RESULTS",
     "Read across a row: tier, whether AI is used, how sure we are, who the providers are, the risk class. Two things to land: Fiserv and BNY are escalated; TCH and AutomWorx are inconclusive, not cleared."),
    ("Every finding is traceable",
     "An explainable result needs the excerpt, its source, when it was read and what it said at the time.",
     "RESULTS",
     "Left: one real finding with all its metadata. Right: how we treat a negative result. We never present absence of evidence as clearance; the vendor goes back for a questionnaire."),
    ("Live demonstration",
     "A local web application that runs fully offline; live mode adds a sweep of the vendors' public pages.",
     "DEMO",
     "Run this live: Upload & Analyse, choose Offline, Run. Point at the benchmark tile, open Fiserv to show the evidence, then download the workbook and open the Evidence Log sheet."),
    ("Recommended actions for Meridian",
     "Actions are generated per vendor from the risk class and evidence strength, with owners and deadlines in the workbook.",
     "RESULTS",
     "Urgent: sub-processor and retention verification for the Critical-risk vendors. 30 days: governance briefings and closing evidence gaps. Annual: preventative notice clauses where no AI was found."),
    ("Limitations and next steps",
     "OSINT narrows the questions; it does not replace the vendor questionnaire.",
     "WRAP-UP",
     "Say the limits before they are asked. The strongest answer to 'how reliable is this' is that every weight is visible, the benchmark is re-checked each run, and weak evidence cannot produce a Critical rating."),
    ("Appendix: key terms", "", "APPENDIX", "Reference slide for questions."),
]

calls = list(re.finditer(r'const s = content\(.*?\);\n', s, re.S))
assert len(calls) == len(H), (len(calls), len(H))
for m, h in reversed(list(zip(calls, H))):
    title, sub, chip, notes = h
    sub_js = "`Offline snapshot from ${DATA.meta.generated}; a live sweep refreshes the same table with fetched pages.`" if sub is None else J(sub)
    new = "const s = content(" + J(title) + ",\n    " + sub_js + ", " + J(chip) + ",\n    " + J(notes) + ");\n"
    s = s[:m.start()] + new + s[m.end():]

# ---- 2. slide 3 body: objectives instead of a brief-coverage map ----
a = s.index("  const roles = [")
b = s.index("/* ======================= 4.")
body3 = r'''  const goals = [
    ["Rate criticality consistently", "Criteria another analyst can reproduce"],
    ["Match depth to risk", "More effort where the exposure is greatest"],
    ["Find and weigh the evidence", "Which public sources show real AI use, and how much each is worth"],
    ["Build a working capability", "Collect, extract, classify, tag and trace"],
    ["Surface the risk to Meridian", "Data exposure, sub-processors, transparency"],
  ];
  const shows = [
    ["Solution design and architecture", "Components, data flow and technology"],
    ["Source and evidence strategy", "Weights, tags and confidence"],
    ["Criticality ratings and depth", "Rating, criteria and effort for every vendor"],
    ["Results and recommended actions", "What AI each vendor uses and what to do about it"],
    ["Live demonstration", "Upload the vendor list, analyse, classify"],
  ];
  T(s, "WHAT WE SET OUT TO DO", { x: 0.6, y: 1.85, w: 6, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  T(s, "WHAT YOU WILL SEE", { x: 6.85, y: 1.85, w: 6, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  goals.forEach((g, i) => {
    const y = 2.25 + i * 0.9;
    box(s, 0.6, y, 5.95, 0.78);
    circle(s, 0.78, y + 0.19, 0.4, i + 1, C.accent2);
    T(s, g[0], { x: 1.4, y: y + 0.08, w: 5.0, h: 0.32, fontSize: 15, bold: true, color: C.text2 });
    T(s, g[1], { x: 1.4, y: y + 0.4, w: 5.0, h: 0.3, fontSize: 12, color: C.text1 });
  });
  shows.forEach((g, i) => {
    const y = 2.25 + i * 0.9;
    box(s, 6.85, y, 5.88, 0.78);
    circle(s, 7.0, y + 0.19, 0.4, i + 1, C.accent1);
    T(s, g[0], { x: 7.6, y: y + 0.08, w: 4.9, h: 0.32, fontSize: 15, bold: true, color: C.text2 });
    T(s, g[1], { x: 7.6, y: y + 0.4, w: 4.9, h: 0.3, fontSize: 12, color: C.text1 });
  });
}

'''
s = s[:a] + body3 + s[b:]

# ---- 3. neutral framing everywhere else ----
def rep(old, new):
    global s
    assert old in s, "missing: " + old[:70]
    s = s.replace(old, new, 1)

rep('"Optiv  |  Vendor AI Usage Analysis  |  Meridian Financial"', '"Vendor AI Usage Analysis  |  Meridian Financial"')
rep('"CASE STUDY 1  |  THIRD-PARTY RISK  |  OPTIV CYBER STRATEGY"', '"CASE STUDY 1  |  THIRD-PARTY RISK MANAGEMENT"')
rep("`Prepared for Meridian Financial  |  ${TEAM}`", '"Prepared for Meridian Financial"')
rep("pres.author = TEAM;", 'pres.author = "Vendor AI Usage Analysis";')
rep('"THE THREE RISKS IN THE BRIEF, AS FLAGS"', '"HOW THE THREE KEY RISKS SHOW UP IN THE OUTPUT"')

p.write_text(s, encoding="utf-8")
print("patched; leftover mentions:", [w for w in ("Optiv", "brief", "BRIEF", "Slide ") if w in s.replace("// brief risks", "")])
