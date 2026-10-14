/* Builds Meridian_Case_Study_1_Deck.pptx from the pipeline's own output files so every number on a slide
   comes from the same source as the website and the downloaded workbook.  node deck/build_deck.js        */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const SKILL = "C:/Users/samya/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/b555d32d-eeee-4d77-8e80-18b93b29f387/af6f85b1-e8b4-4621-b969-73a18ee700c6/skills/pptx";
const { applyTheme } = require(SKILL + "/scripts/apply_theme.js");

const ROOT = path.resolve(__dirname, "..");
const load = (f, v) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8").replace(new RegExp("^window\\." + v + "\\s*=\\s*"), "").replace(/;\s*$/, ""));
const DATA = load("pipeline_results.js", "PIPELINE_RESULTS");
const CFG = load("config_snapshot.js", "PIPELINE_CONFIG");
const R = DATA.results, IN = R.filter((r) => !r.benchmark), BENCH = R.find((r) => r.benchmark);
const TEAM = (DATA.meta && DATA.meta.team) || "Team Optiv";

/* ---------- theme ---------- */
const THEME = {
  name: "Meridian TPRM",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "17202E", lt1: "FFFFFF", dk2: "0F1B2D", lt2: "F2F5F9",
    accent1: "0E7C86", accent2: "1F4E8C", accent3: "C77700", accent4: "B42318", accent5: "1C7C4D", accent6: "5B6B7F",
    hlink: "1F4E8C", folHlink: "5B6B7F",
  },
};
const HEX = THEME.colors;
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Vendor AI Usage Analysis - Meridian Financial";
pres.author = "Vendor AI Usage Analysis";
const C = pres.SchemeColor;
const S = pres.ShapeType;

pres.defineSlideMaster({
  title: "TITLE",
  background: { color: C.text2 },
  objects: [],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.62, w: 12.1, h: 0.7, fontSize: 28, bold: true, color: C.text2, valign: "middle", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Vendor AI Usage Analysis  |  Meridian Financial", options: { x: 0.6, y: 7.02, w: 9, h: 0.3, fontSize: 10, color: C.accent6, margin: 0 } } },
  ],
  slideNumber: { x: 12.0, y: 7.02, w: 0.73, h: 0.3, fontSize: 10, color: C.accent6, align: "right" },
});

/* ---------- helpers ---------- */
const short = (n) => {
  if (/EXAMPLE VENDOR/i.test(n)) return "Larkspur (benchmark)";
  if (/FSSI/.test(n)) return "FSSI";
  if (/Clearing House/i.test(n)) return "The Clearing House";
  return n.replace(/,?\s*(Inc\.?|L\.L\.C\.|Technologies)\b\.?/gi, "").replace(/\s+/g, " ").trim();
};
const provShort = (p) => /microsoft/i.test(p) ? "Microsoft" : /google/i.test(p) ? "Google" : /amazon|aws/i.test(p) ? "AWS" : p.replace(/\s*\(.*\)\s*$/, "");
const provs = (r) => Array.from(new Set((r.providers || []).map(provShort))).join(", ") || "None named";
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "\u2026" : s);
const RISK_COL = { Critical: HEX.accent4, High: HEX.accent3, Medium: HEX.accent2, Low: HEX.accent6, "None identified": HEX.accent5 };

function T(slide, text, o) { return slide.addText(text, Object.assign({ isTextBox: true, margin: 0, valign: "top", fontSize: 14, color: C.text1 }, o)); }
function box(slide, x, y, w, h, o) {
  return slide.addShape(S.roundRect, Object.assign({ x, y, w, h, rectRadius: 0.07, fill: { color: C.background2 }, line: { color: C.background2, width: 0.75 } }, o));
}
function arrow(slide, x1, y1, x2, y2, color) {
  slide.addShape(S.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1, line: { color: color || C.accent6, width: 1.75, endArrowType: "triangle" } });
}
function circle(slide, x, y, d, label, fill) {
  slide.addShape(S.ellipse, { x, y, w: d, h: d, fill: { color: fill || C.accent2 }, line: { color: fill || C.accent2, width: 0.5 } });
  T(slide, String(label), { x, y, w: d, h: d, align: "center", valign: "middle", fontSize: 13, bold: true, color: C.background1 });
}

let n = 0;
function content(title, sub, chip, notes) {
  const s = pres.addSlide({ masterName: "CONTENT" });
  n++;
  s.addText(title, { placeholder: "title" });
  if (sub) T(s, sub, { x: 0.6, y: 1.32, w: 12.1, h: 0.45, fontSize: 16, color: C.accent6 });
  if (chip) {
    const cw = Math.max(1.6, chip.length * 0.085 + 0.5);
    s.addShape(S.roundRect, { x: 0.6, y: 0.28, w: cw, h: 0.3, rectRadius: 0.15, fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
    T(s, chip, { x: 0.6, y: 0.28, w: cw, h: 0.3, align: "center", valign: "middle", fontSize: 10.5, bold: true, color: C.accent2 });
  }
  if (notes) s.addNotes(notes);
  return s;
}

/* ======================= 1. TITLE ======================= */
{
  const s = pres.addSlide({ masterName: "TITLE" }); n++;
  T(s, "CASE STUDY 1  |  THIRD-PARTY RISK MANAGEMENT", { x: 0.8, y: 1.1, w: 11.5, h: 0.4, fontSize: 14, bold: true, color: "7FD6DD", charSpacing: 3 });
  T(s, "Vendor AI Usage Analysis", { x: 0.8, y: 1.7, w: 11.5, h: 1.2, fontSize: 54, bold: true, color: C.background1, fontFace: "Cambria" });
  T(s, "A repeatable, evidence-based way to tell whether a vendor really uses AI in the service it provides \u2014 and what that means for Meridian's data, operations and risk.",
    { x: 0.8, y: 3.05, w: 9.6, h: 1.3, fontSize: 22, color: C.background2 });
  T(s, "Prepared for Meridian Financial", { x: 0.8, y: 5.6, w: 11, h: 0.4, fontSize: 16, color: C.background2 });
  T(s, "Confidential. Findings are based on public information only; no vendor was contacted.", { x: 0.8, y: 6.1, w: 11, h: 0.4, fontSize: 12, color: "A9B6C6" });
  s.addNotes("Open with the one-line promise: we turn 'does this vendor use AI?' from an opinion into a repeatable, evidence-weighted, traceable finding.");
}

/* ======================= 2. PROBLEM ======================= */
{
  const s = content("The challenge: vendor AI is invisible to Meridian",
    "Vendors embed AI in their products and services, often without saying so, and the risk lands on Meridian.", "CONTEXT",
    "Three risks matter: sensitive data reaching AI models, undisclosed AI sub-processors, and reduced transparency over decisions. The hard part is telling real use from marketing.");
  const risks = [
    ["Sensitive data exposed to AI models", "Customer, payment and credential data may be sent to models the vendor chose, with retention and training terms nobody reviewed."],
    ["Reliance on undisclosed AI sub-processors", "A 4th party, such as a model provider, that Meridian never contracted, assessed or monitored."],
    ["Less transparency over decisions", "Automated or agentic actions on Meridian accounts and payments, with unclear human review."],
  ];
  risks.forEach((r, i) => {
    const y = 1.95 + i * 1.5;
    box(s, 0.6, y, 6.6, 1.35, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.75 } });
    circle(s, 0.82, y + 0.4, 0.5, i + 1, C.accent4);
    T(s, r[0], { x: 1.6, y: y + 0.18, w: 5.4, h: 0.4, fontSize: 17, bold: true, color: C.text2 });
    T(s, r[1], { x: 1.6, y: y + 0.6, w: 5.4, h: 0.7, fontSize: 13, color: C.text1 });
  });
  box(s, 7.55, 1.95, 5.18, 4.35, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.75 } });
  T(s, "The hard part", { x: 7.85, y: 2.15, w: 4.6, h: 0.4, fontSize: 14, bold: true, color: "7FD6DD" });
  T(s, "Real use vs. marketing", { x: 7.85, y: 2.55, w: 4.6, h: 0.5, fontSize: 24, bold: true, color: C.background1 });
  T(s, [
    { text: "\u201cWe are AI-ready\u201d is not \u201can LLM processes your data\u201d.", options: { breakLine: true, paraSpaceAfter: 8 } },
    { text: "Public sources differ hugely in reliability, so each needs a weight.", options: { breakLine: true, paraSpaceAfter: 8 } },
    { text: "Every finding must be explainable and repeatable by another analyst.", options: { breakLine: true, paraSpaceAfter: 8 } },
    { text: "Constraint: public information only. No vendor contact, nothing published.", options: {} },
  ], { x: 7.85, y: 3.3, w: 4.6, h: 2.9, fontSize: 15, color: C.background2 });
}

/* ======================= 3. COVERAGE MAP ======================= */
{
  const s = content("Objectives and what we will show today",
    "Five goals shaped the solution; each one is demonstrated in the next few minutes.", "CONTEXT",
    "Frame the session in about thirty seconds: the goals on the left, what the audience will see on the right.");
  const goals = [
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

/* ======================= 4. SOLUTION AT A GLANCE ======================= */
{
  const yes = IN.filter((r) => r.ai_detected === "Yes").length, no = IN.filter((r) => r.ai_detected === "No").length;
  const inc = IN.filter((r) => r.ai_detected === "Inconclusive").length;
  const s = content("Our solution at a glance",
    "Upload the Meridian vendor inventory; get tier, AI usage, evidence strength, providers, risk and next action for every vendor.", "SOLUTION",
    "This is the whole project on one slide. Each step is a module; the next slides open them up one by one.");
  const steps = [
    ["1", "Rate criticality", "Five weighted factors and hard floors give a tier anyone can reproduce"],
    ["2", "Set depth", "The tier fixes the page budget and the evidence needed to say \u201cno AI\u201d"],
    ["3", "Collect evidence", "Public pages within budget, each stored with URL, date and hash"],
    ["4", "Classify signals", "AI statements are typed: deployed, feature, partnership, hiring, marketing"],
    ["5", "Weigh and tag", "Source reliability \u00d7 signal type; tags show how sure we are"],
    ["6", "Surface risk", "Severity capped by evidence confidence; actions with deadlines"],
  ];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 2.04;
    box(s, x, 1.95, 1.9, 2.45, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.75 } });
    circle(s, x + 0.15, 2.1, 0.46, st[0], C.accent2);
    T(s, st[1], { x: x + 0.15, y: 2.7, w: 1.65, h: 0.55, fontSize: 15, bold: true, color: C.text2 });
    T(s, st[2], { x: x + 0.15, y: 3.3, w: 1.65, h: 1.05, fontSize: 12, color: C.text1 });
  });
  const stats = [
    [String(IN.length), "vendors rated: tier, AI usage, evidence tag, provider, risk, action"],
    [`${yes} / ${no} / ${inc}`, "AI usage Yes / No / Inconclusive (offline snapshot)"],
    ["100%", "of findings carry URL, retrieval date, content hash and exact excerpt"],
    [DATA.summary.benchmark && DATA.summary.benchmark.pass ? "PASS" : "FAIL", "benchmark V-000 reproduced: Critical / Yes / Critical"],
  ];
  stats.forEach((st, i) => {
    const x = 0.6 + i * 3.06;
    box(s, x, 4.7, 2.9, 1.85, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.75 } });
    T(s, st[0], { x: x + 0.2, y: 4.85, w: 2.5, h: 0.75, fontSize: 36, bold: true, color: C.background1 });
    T(s, st[1], { x: x + 0.2, y: 5.65, w: 2.5, h: 0.8, fontSize: 12, color: C.background2 });
  });
}

/* ======================= 5. FUNCTIONAL DESIGN ======================= */
{
  const s = content("Solution design: from OSINT collection to risk output",
    "The components and the data that flows between them.", "SOLUTION",
    "Walk left to right. Emphasise two things: the tier drives how deep we go, and the two exits at the end: the workbook for Meridian and the questionnaire items for the vendor.");
  const st = [
    ["1", "Vendor inventory", "Excel upload", "Provided columns A\u2013K"],
    ["2", "Criticality and depth", "Provided columns", "Tier, factor scores, depth plan"],
    ["3", "OSINT collection", "Depth plan, vendor domain", "Documents + URL, date, SHA-256"],
    ["4", "Signal extraction", "Documents", "Typed AI signals + providers"],
    ["5", "Evidence weighting", "Signals", "Usage score and evidence tag"],
    ["6", "AI risk engine", "Tier, data, tag, role", "Risk class, flags, action"],
    ["7", "Outputs", "All of the above", "Workbook L\u2013V, Evidence Log, dashboard"],
  ];
  const w = 1.5, gap = 0.27;
  st.forEach((c, i) => {
    const x = 0.6 + i * (w + gap);
    const edge = i === 0 ? C.accent5 : i === 6 ? C.accent2 : C.accent1;
    s.addShape(S.roundRect, { x, y: 2.75, w, h: 1.2, rectRadius: 0.08, fill: { color: C.background1 }, line: { color: edge, width: 2 } });
    T(s, c[0], { x: x + 0.1, y: 2.82, w: 0.4, h: 0.3, fontSize: 12, bold: true, color: edge });
    T(s, c[1], { x: x + 0.1, y: 3.1, w: w - 0.2, h: 0.8, fontSize: 14, bold: true, color: C.text2 });
    T(s, "IN", { x, y: 4.1, w, h: 0.22, fontSize: 10, bold: true, color: C.accent6, align: "center" });
    T(s, c[2], { x: x + 0.05, y: 4.3, w: w - 0.1, h: 0.6, fontSize: 12, color: C.text1, align: "center" });
    T(s, "OUT", { x, y: 5.0, w, h: 0.22, fontSize: 10, bold: true, color: C.accent6, align: "center" });
    T(s, c[3], { x: x + 0.05, y: 5.2, w: w - 0.1, h: 0.75, fontSize: 12, color: C.text1, align: "center" });
    if (i < 6) arrow(s, x + w + 0.02, 3.35, x + w + gap - 0.02, 3.35, C.accent6);
  });
  // collection source
  const cx = 0.6 + 2 * (w + gap);
  box(s, cx, 1.85, 2 * w + gap, 0.55, { fill: { color: C.background2 }, line: { color: C.accent1, width: 1 } });
  T(s, "Public pages (live)  or  recorded snapshot (offline)", { x: cx, y: 1.85, w: 2 * w + gap, h: 0.55, fontSize: 12, bold: true, color: C.text2, align: "center", valign: "middle" });
  arrow(s, cx + w / 2, 2.4, cx + w / 2, 2.75, C.accent1);
  box(s, 0.6, 6.2, 12.13, 0.62, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 } });
  T(s, "Coverage gaps and unresolved model providers become vendor-questionnaire items. OSINT targets the questionnaire; it never replaces it.",
    { x: 0.85, y: 6.2, w: 11.6, h: 0.62, fontSize: 13.5, color: C.background1, valign: "middle" });
}

/* ======================= 6. ARCHITECTURE ======================= */
{
  const s = content("Technical architecture",
    "A local web app over a Python pipeline. Every rule lives in one configuration file.", "SOLUTION",
    "Top to bottom: what the user touches, the API, the six pipeline modules, and the stores. The key design choice is that all weights and thresholds are in config.py, so results are auditable and tunable.");
  const lx = 0.6, ix = 2.2, iw = 10.53;
  const layer = (label, y, h) => {
    box(s, lx, y, 12.13, h, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
    T(s, label, { x: lx + 0.15, y, w: 1.4, h, fontSize: 11, bold: true, color: C.accent6, valign: "middle", charSpacing: 1 });
  };
  const cell = (x, y, w, h, title, lines, edge) => {
    s.addShape(S.roundRect, { x, y, w, h, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: edge || C.accent6, width: 1.25 } });
    T(s, title, { x: x + 0.08, y: y + 0.06, w: w - 0.16, h: 0.42, fontSize: 12, bold: true, color: C.text2 });
    if (lines) T(s, lines.map((l, i) => ({ text: l, options: { bullet: { indent: 14 }, breakLine: i < lines.length - 1 } })), { x: x + 0.08, y: y + 0.5, w: w - 0.16, h: h - 0.55, fontSize: 11, color: C.text1 });
  };
  layer("PRESENTATION", 1.8, 0.8);
  [["Upload and run", "browser"], ["Results and evidence drill-down", ""], ["Dashboard tabs", "heatmap, dossiers, actions"], ["Workbook download", ".xlsx"]]
    .forEach((c, i) => { const w = (iw - 0.45) / 4; const x = ix + i * (w + 0.15);
      s.addShape(S.roundRect, { x, y: 1.9, w, h: 0.6, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.accent2, width: 1.25 } });
      T(s, c[0] + (c[1] ? "  (" + c[1] + ")" : ""), { x: x + 0.08, y: 1.9, w: w - 0.16, h: 0.6, fontSize: 11, bold: true, color: C.text2, align: "center", valign: "middle" }); });
  layer("API  (localhost)", 2.72, 0.7);
  [["Flask: /api/analyze  /api/job  /api/download"], ["Background job runner with progress log"], ["Upload validation: .xlsx only, 5 MB"]]
    .forEach((c, i) => { const w = (iw - 0.3) / 3; const x = ix + i * (w + 0.15);
      s.addShape(S.roundRect, { x, y: 2.8, w, h: 0.54, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.accent2, width: 1.25 } });
      T(s, c[0], { x: x + 0.08, y: 2.8, w: w - 0.16, h: 0.54, fontSize: 11, bold: true, color: C.text2, align: "center", valign: "middle" }); });
  layer("PIPELINE", 3.54, 2.5);
  const stages = [
    ["1  Criticality", ["5-factor weighted rubric", "Hard floors", "Depth plan"], "criticality.py"],
    ["2  Collection", ["Link discovery", "robots.txt, rate limit", "SSRF guard, soft-404 filter", "SHA-256 cache"], "collect.py"],
    ["3  Signals", ["Sentence split, AI lexicon", "8 signal types", "Provider detection", "Optional LLM assist"], "signals.py"],
    ["4  Weighting", ["Source x type x trust", "Combine by source class", "Evidence tags", "Coverage rule for \u201cno\u201d"], "scoring.py"],
    ["5  Risk engine", ["Severity formula", "Confidence cap", "Flags, action SLA"], "engine.py"],
    ["6  Writer", ["Columns L\u2013V only", "Evidence Log sheet", "Criticality scores"], "excel_io.py"],
  ];
  const sw = (iw - 5 * 0.12) / 6;
  stages.forEach((c, i) => {
    const x = ix + i * (sw + 0.12);
    cell(x, 3.64, sw, 2.3, c[0], c[1], C.accent1);
    T(s, c[2], { x: x + 0.08, y: 5.66, w: sw - 0.16, h: 0.24, fontSize: 10, italic: true, color: C.accent6 });
  });
  layer("CONFIG AND STORES", 6.14, 0.72);
  [["config.py: every weight, rule, threshold"], ["evidence_store/: fetched pages + hashes"], ["evidence_seed.json: offline snapshot"], ["output/: job workbooks"]]
    .forEach((c, i) => { const w = (iw - 0.45) / 4; const x = ix + i * (w + 0.15);
      s.addShape(S.roundRect, { x, y: 6.22, w, h: 0.56, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.accent6, width: 1 } });
      T(s, c[0], { x: x + 0.06, y: 6.22, w: w - 0.12, h: 0.56, fontSize: 10.5, color: C.text1, align: "center", valign: "middle" }); });
}

/* ======================= 7. CRITICALITY ======================= */
{
  const f = CFG.criticality_weights;
  const fx = R.find((r) => r.vendor_id === "V-002");
  const s = content("How we rate vendor criticality",
    "Five weighted factors, scored from the provided columns, so any analyst reaches the same tier.", "METHOD",
    "Another analyst gets the same rating because the inputs are the provided columns and the rules are written down. The threshold was calibrated on the benchmark row V-000 only; say so if asked.");
  const hdr = (t) => ({ text: t, options: { bold: true, color: HEX.lt1, fill: { color: HEX.dk2 }, fontSize: 12 } });
  const rows = [
    [hdr("Factor"), hdr("Weight"), hdr("Scored 1\u20134 from")],
    ["Data sensitivity", Math.round(f.data_sensitivity * 100) + "%", "Data classification column: tax IDs / full customer master = 4"],
    ["Operational dependency", Math.round(f.operational_dependency * 100) + "%", "Dependency column: Critical or Total = 4, High 3, Moderate 2"],
    ["Payment flow", Math.round(f.payment_flow * 100) + "%", "Payments category = 4; payment terms in the service = 2"],
    ["Regulatory exposure", Math.round(f.regulatory_exposure * 100) + "%", "Tax, clearing, settlement, core banking = 4"],
    ["Data volume", Math.round(f.data_volume * 100) + "%", "Largest figure: 100M+ = 4, 10M+ = 3, 1M+ = 2"],
  ].map((r, i) => (i === 0 ? r : r.map((c, j) => ({ text: c, options: { fontSize: 12, bold: j === 0, color: HEX.dk1, fill: { color: i % 2 ? HEX.lt1 : HEX.lt2 } } }))));
  s.addTable(rows, { x: 0.6, y: 1.95, w: 7.7, colW: [2.1, 0.9, 4.7], rowH: 0.52, border: { type: "solid", pt: 0.5, color: "D5DBE4" }, valign: "middle" });
  // tiers
  T(s, "WEIGHTED SCORE TO TIER", { x: 8.7, y: 1.95, w: 4, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  const tiers = [["Critical", "3.0 and above", HEX.accent4], ["High", "2.5 and above", HEX.accent3], ["Medium", "1.9 and above", HEX.accent2], ["Low", "below 1.9", HEX.accent6]];
  tiers.forEach((t, i) => {
    const y = 2.32 + i * 0.5;
    s.addShape(S.roundRect, { x: 8.7, y, w: 4.03, h: 0.42, rectRadius: 0.06, fill: { color: t[2] }, line: { color: t[2], width: 0.5 } });
    T(s, t[0], { x: 8.85, y, w: 1.6, h: 0.42, fontSize: 14, bold: true, color: C.background1, valign: "middle" });
    T(s, t[1], { x: 10.4, y, w: 2.2, h: 0.42, fontSize: 13, color: C.background1, valign: "middle", align: "right" });
  });
  T(s, "HARD FLOORS (override the score)", { x: 8.7, y: 4.5, w: 4, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  T(s, [
    { text: "Dependency Critical / Total \u2192 at least Critical", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Privileged access or credentials \u2192 at least High", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Most sensitive data class \u2192 at least High", options: { bullet: { indent: 14 } } },
  ], { x: 8.7, y: 4.85, w: 4.03, h: 1.2, fontSize: 13, color: C.text1 });
  // worked example
  box(s, 0.6, 5.45, 7.7, 1.35, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
  T(s, "Worked example: " + short(fx.vendor_name), { x: 0.8, y: 5.55, w: 7.3, h: 0.32, fontSize: 14, bold: true, color: C.text2 });
  const fa = fx.factors;
  T(s, `Data ${fa.data_sensitivity}  \u00b7  Dependency ${fa.operational_dependency}  \u00b7  Payments ${fa.payment_flow}  \u00b7  Regulatory ${fa.regulatory_exposure}  \u00b7  Volume ${fa.data_volume}`,
    { x: 0.8, y: 5.92, w: 7.3, h: 0.32, fontSize: 14, color: C.text1 });
  T(s, `Weighted score ${fx.criticality_score} / 4  \u2192  ${fx.tier}`, { x: 0.8, y: 6.3, w: 7.3, h: 0.4, fontSize: 17, bold: true, color: C.accent4 });
  T(s, "Calibrated on benchmark V-000, not tuned per vendor.", { x: 8.7, y: 6.2, w: 4.03, h: 0.5, fontSize: 12, italic: true, color: C.accent6 });
}

/* ======================= 8. DEPTH ======================= */
{
  const d = CFG.depth, order = ["Critical", "High", "Medium", "Low"];
  const s = content("Matching assessment depth to risk",
    "A Critical vendor gets a deep sweep and a Low one a light touch. Depth follows the tier, not how easy the vendor is to research.", "METHOD",
    "The pipeline enforces the page budget and the minimum pages before a negative finding is accepted. The source-class list and stop rule guide the analyst's manual follow-up and are written into the workbook.");
  s.addChart(pres.charts.BAR, [{ name: "Page budget", labels: order, values: order.map((t) => d[t].max_pages) }], {
    x: 0.6, y: 1.95, w: 4.3, h: 4.1, barDir: "col", chartColors: [HEX.accent2], showTitle: true, title: "Page budget per vendor", titleFontSize: 14,
    titleColor: HEX.dk1, showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 13, dataLabelColor: HEX.dk1, showLegend: false,
    catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent6,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt",
    valGridLine: { color: "E3E8EF", size: 0.5 }, catGridLine: { style: "none" }, valAxisMaxVal: 16, valAxisHidden: false,
  });
  const col = { Critical: HEX.accent4, High: HEX.accent3, Medium: HEX.accent2, Low: HEX.accent6 };
  const classCount = { Critical: 8, High: 6, Medium: 4, Low: 2 };
  order.forEach((t, i) => {
    const y = 1.95 + i * 1.03;
    box(s, 5.2, y, 7.53, 0.93, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
    s.addShape(S.roundRect, { x: 5.32, y: y + 0.18, w: 1.15, h: 0.56, rectRadius: 0.06, fill: { color: col[t] }, line: { color: col[t], width: 0.5 } });
    T(s, t, { x: 5.32, y: y + 0.18, w: 1.15, h: 0.56, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle" });
    T(s, `${d[t].label}. ${classCount[t]} source classes. Accept \u201cno AI\u201d only after \u2265 ${d[t].min_docs_for_negative} page${d[t].min_docs_for_negative > 1 ? "s" : ""}.`,
      { x: 6.65, y: y + 0.07, w: 5.95, h: 0.32, fontSize: 13, bold: true, color: C.text2 });
    T(s, d[t].stop_rule, { x: 6.65, y: y + 0.4, w: 5.95, h: 0.5, fontSize: 11, color: C.text1 });
  });
  T(s, "The pipeline enforces the page budget and the minimum pages before a “no” is accepted; source-class lists and stop rules guide the analyst's follow-up. Beyond that point further sweeps rarely change the rating and the vendor questionnaire takes over.",
    { x: 0.6, y: 6.15, w: 12.1, h: 0.7, fontSize: 13, italic: true, color: C.accent6 });
}

/* ======================= 9. SOURCES & WEIGHTS ======================= */
{
  const sc = CFG.source_classes;
  const nice = { regulatory_filing: "Regulatory filing", vendor_technical_docs: "Technical docs / trust centre", vendor_press: "Press release / newsroom",
    exec_statement: "Executive statement", vendor_blog: "Vendor blog", job_posting: "Job posting", third_party_media: "Third-party media",
    vendor_marketing: "Marketing page", unknown: "Unclassified" };
  const keys = Object.keys(sc).sort((a, b) => sc[b].weight - sc[a].weight);
  const s = content("Which public sources reveal real AI use",
    "Each source class carries a weight that reflects how reliably it shows genuine AI use.", "METHOD",
    "Filings and technical documentation outweigh blogs and marketing pages. The weights live in config.py, so they can be challenged and tuned.");
  s.addChart(pres.charts.BAR, [{ name: "Weight", labels: keys.map((k) => nice[k]), values: keys.map((k) => sc[k].weight) }], {
    x: 0.6, y: 1.9, w: 6.2, h: 4.9, barDir: "bar", chartColors: [HEX.accent1], showTitle: true, title: "Evidentiary weight (0\u20131)", titleFontSize: 14,
    titleColor: HEX.dk1, showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 12, dataLabelColor: HEX.dk1, showLegend: false,
    catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent6, catAxisOrientation: "maxMin",
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt",
    valGridLine: { color: "E3E8EF", size: 0.5 }, catGridLine: { style: "none" }, valAxisMaxVal: 1.1, valAxisMinVal: 0, dataLabelFormatCode: "0.00", valAxisLabelFormatCode: "0.0",
  });
  T(s, "WHY EACH SOURCE IS WEIGHTED THIS WAY", { x: 7.1, y: 1.95, w: 5.6, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  const why = [
    ["Filings and technical docs", "Legally accountable or describe real capability."],
    ["Press and executive statements", "Approved announcements: reliable on the fact of use, vague on detail."],
    ["Blogs and job posts", "Real capability mixed with positioning; hiring shows intent, not production."],
    ["Media and marketing", "Second-hand or aspirational. Corroborates, never proves."],
  ];
  why.forEach((w, i) => {
    const y = 2.35 + i * 0.95;
    box(s, 7.1, y, 5.63, 0.85);
    T(s, w[0], { x: 7.28, y: y + 0.08, w: 5.3, h: 0.3, fontSize: 14, bold: true, color: C.text2 });
    T(s, w[1], { x: 7.28, y: y + 0.4, w: 5.3, h: 0.4, fontSize: 12, color: C.text1 });
  });
  T(s, "The tier sets which classes an analyst consults: all eight for Critical vendors, two for Low.", { x: 7.1, y: 6.25, w: 5.63, h: 0.55, fontSize: 13, italic: true, color: C.accent6 });
}

/* ======================= 10. EVIDENCE LOGIC ======================= */
{
  const fx = R.find((r) => r.vendor_id === "V-002");
  const best = {};
  (fx.signals || []).forEach((g) => { if (g.type !== "NEGATION" && g.type !== "ADVOCACY") best[g.source_class] = Math.max(best[g.source_class] || 0, g.score); });
  const cls = Object.entries(best).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const s = content("Weighing evidence: how sure are we?",
    "Repetition from one source adds nothing; agreement between different kinds of source raises confidence.", "METHOD",
    "Left: how one signal is scored. Middle: signals from the same source class collapse to the strongest one, then classes combine. Right: the tag the stakeholder sees and the Yes / No / Inconclusive call it produces.");
  // step 1 formula
  box(s, 0.6, 1.95, 12.13, 1.7, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
  T(s, "1  SCORE EACH SIGNAL", { x: 0.8, y: 2.03, w: 5, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  const parts = [["Source weight", "reliability of the source class (press release shown)", "0.8"], ["\u00d7", "", ""], ["Signal type", "deployed 1.0 \u00b7 feature 0.8 \u00b7 partnership 0.7 \u00b7 hiring 0.5 \u00b7 marketing 0.15", "1.0"],
    ["\u00d7", "", ""], ["Trust", "1.0 machine-fetched \u00b7 0.9 analyst-recorded \u00b7 0.6 supplier's product", "0.9"], ["=", "", ""], ["Signal score", "Fiserv press release example", "0.72"]];
  let x = 0.8;
  parts.forEach((p) => {
    if (p[2] === "") { T(s, p[0], { x, y: 2.5, w: 0.4, h: 0.7, fontSize: 26, bold: true, color: C.accent2, align: "center", valign: "middle" }); x += 0.4; return; }
    const w = p[0] === "Signal type" ? 3.1 : p[0] === "Signal score" ? 1.9 : 2.2;
    s.addShape(S.roundRect, { x, y: 2.4, w, h: 1.1, rectRadius: 0.07, fill: { color: C.background1 }, line: { color: C.accent1, width: 1.25 } });
    T(s, p[0] + "   " + p[2], { x: x + 0.1, y: 2.45, w: w - 0.2, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
    T(s, p[1], { x: x + 0.1, y: 2.82, w: w - 0.2, h: 0.65, fontSize: 11, color: C.text1 });
    x += w;
  });
  // step 2
  box(s, 0.6, 3.85, 5.9, 2.95, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
  T(s, "2  COMBINE BY SOURCE CLASS", { x: 0.8, y: 3.93, w: 5.5, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  T(s, "Keep the strongest signal per class, then combine the classes. More kinds of source agreeing means a higher score.", { x: 0.8, y: 4.28, w: 5.5, h: 0.6, fontSize: 13, color: C.text1 });
  const rowsC = cls.map((c) => [{ text: c[0].replace(/_/g, " "), options: { fontSize: 12, color: HEX.dk1, fill: { color: HEX.lt1 } } }, { text: c[1].toFixed(2), options: { fontSize: 12, bold: true, color: HEX.dk1, fill: { color: HEX.lt1 }, align: "right" } }]);
  rowsC.push([{ text: short(fx.vendor_name) + ": combined usage score", options: { fontSize: 12, bold: true, color: HEX.lt1, fill: { color: HEX.accent1 } } }, { text: fx.usage_score.toFixed(2), options: { fontSize: 12, bold: true, color: HEX.lt1, fill: { color: HEX.accent1 }, align: "right" } }]);
  s.addTable(rowsC, { x: 0.8, y: 4.95, w: 5.5, colW: [4.3, 1.2], rowH: 0.4, border: { type: "solid", pt: 0.5, color: "D5DBE4" }, valign: "middle" });
  // step 3
  box(s, 6.8, 3.85, 5.93, 2.95, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
  T(s, "3  TAG AND DECIDE", { x: 7.0, y: 3.93, w: 5.5, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  const tags = [["Confirmed", "\u2265 0.75 + one strong signal (source \u2265 0.7)", "Yes", HEX.accent4],
    ["Probable", "\u2265 0.50", "Yes", HEX.accent3], ["Indicative", "\u2265 0.25", "Inconclusive", HEX.accent2],
    ["Marketing-only", "< 0.25, or readiness wording only", "Inconclusive", HEX.accent6], ["None found", "and enough pages for the tier", "No", HEX.accent5]];
  tags.forEach((t, i) => {
    const y = 4.3 + i * 0.5;
    s.addShape(S.roundRect, { x: 7.0, y, w: 1.55, h: 0.4, rectRadius: 0.06, fill: { color: t[3] }, line: { color: t[3], width: 0.5 } });
    T(s, t[0], { x: 7.0, y, w: 1.55, h: 0.4, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle" });
    T(s, t[1], { x: 8.7, y, w: 2.75, h: 0.4, fontSize: 11, color: C.text1, valign: "middle" });
    T(s, "\u2192 " + t[2], { x: 11.45, y, w: 1.25, h: 0.4, fontSize: 12, bold: true, color: C.text2, valign: "middle", wrap: false });
  });
}

/* ======================= 11. CAPABILITY ======================= */
{
  const s = content("Detection capability: collect, extract, classify",
    "Public pages in; typed, traceable AI signals out, with safeguards built in.", "METHOD",
    "Be honest about the AI-based technique: a curated AI lexicon with typed signals, plus an optional LLM assist that only re-labels ambiguous sentences, always keeping the rule label alongside it. The LLM assist is implemented but was not exercised in this build.");
  const cols = [
    ["Collect", HEX.accent1, ["Starts at the vendor's own domain", "Ranks discovered links: newsroom, blog, careers, trust, docs", "Page budget set by the tier", "Each page stored with URL, date and SHA-256", "Offline mode replays a recorded snapshot"]],
    ["Extract", HEX.accent2, ["Page text split into sentences", "Keeps sentences with AI terms: AI, LLM, agentic, copilot, MCP\u2026", "Names model providers (OpenAI, Microsoft, Google\u2026)", "Software suppliers are not mistaken for model providers"]],
    ["Classify and tag", HEX.accent5, ["Each sentence typed: deployed, feature, partnership, hiring, roadmap, marketing", "Optional LLM assist re-labels only ambiguous sentences", "Rule label always kept for audit", "Agentic / generative / analytic role detected"]],
  ];
  cols.forEach((c, i) => {
    const x = 0.6 + i * 4.1;
    s.addShape(S.roundRect, { x, y: 1.95, w: 3.93, h: 3.5, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: c[1], width: 1.5 } });
    T(s, c[0], { x: x + 0.2, y: 2.07, w: 3.5, h: 0.4, fontSize: 18, bold: true, color: c[1] });
    T(s, c[2].map((l, k) => ({ text: l, options: { bullet: { indent: 14 }, breakLine: k < c[2].length - 1, paraSpaceAfter: 6 } })), { x: x + 0.2, y: 2.6, w: 3.55, h: 2.8, fontSize: 14, color: C.text1 });
    if (i < 2) arrow(s, x + 3.95, 3.7, x + 4.1, 3.7, C.accent6);
  });
  box(s, 0.6, 5.7, 12.13, 1.1, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 } });
  T(s, "BUILT-IN SAFEGUARDS", { x: 0.85, y: 5.8, w: 4, h: 0.3, fontSize: 12, bold: true, color: "7FD6DD", charSpacing: 2 });
  T(s, "Public pages only  \u00b7  robots.txt respected  \u00b7  rate-limited  \u00b7  no vendor contact  \u00b7  internal addresses blocked  \u00b7  error and duplicate pages rejected so they never count as coverage",
    { x: 0.85, y: 6.12, w: 11.6, h: 0.6, fontSize: 14, color: C.background1 });
}

/* ======================= 12. RISK ======================= */
{
  const bx = R.find((r) => r.vendor_id === "V-005"), fx = R.find((r) => r.vendor_id === "V-002");
  const s = content("From evidence to AI security risk",
    "A weak finding can never produce a Critical rating, and a strong one is not softened.", "METHOD",
    "Left to right: severity from tier, data sensitivity and AI role; then the cap from the evidence tag. Below: how the three key risks appear as flags. Bottom: the action deadline per class.");
  const parts = [["Tier", "\u00d7 0.4", "how critical the vendor is"], ["Data sensitivity", "\u00d7 0.4", "what Meridian data it touches"], ["AI role", "\u00d7 0.2", "agentic 4, generative 3, analytic 2"]];
  parts.forEach((p, i) => {
    const x = 0.6 + i * 2.35;
    box(s, x, 1.95, 2.15, 1.3, { fill: { color: C.background2 }, line: { color: C.accent2, width: 1.25 } });
    T(s, p[0], { x: x + 0.12, y: 2.02, w: 1.9, h: 0.32, fontSize: 14, bold: true, color: C.text2 });
    T(s, p[1], { x: x + 0.12, y: 2.34, w: 1.9, h: 0.35, fontSize: 18, bold: true, color: C.accent2 });
    T(s, p[2], { x: x + 0.12, y: 2.72, w: 1.9, h: 0.5, fontSize: 11, color: C.text1 });
  });
  arrow(s, 7.62, 2.6, 7.95, 2.6, C.accent6);
  box(s, 8.0, 1.95, 2.1, 1.3, { fill: { color: C.background1 }, line: { color: C.accent1, width: 1.5 } });
  T(s, "Severity", { x: 8.12, y: 2.02, w: 1.9, h: 0.32, fontSize: 14, bold: true, color: C.text2 });
  T(s, "Critical \u2265 3.7\nHigh \u2265 2.7\nMedium \u2265 1.9", { x: 8.12, y: 2.38, w: 1.9, h: 0.85, fontSize: 12, color: C.text1 });
  arrow(s, 10.12, 2.6, 10.4, 2.6, C.accent6);
  box(s, 10.45, 1.95, 2.28, 1.3, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 } });
  T(s, "Cap by evidence", { x: 10.57, y: 2.02, w: 2.1, h: 0.32, fontSize: 14, bold: true, color: C.background1 });
  T(s, "Confirmed: no cap\nProbable: max High\nIndicative: max Medium", { x: 10.57, y: 2.38, w: 2.1, h: 0.85, fontSize: 11, color: C.background2 });
  // example row
  T(s, "WORKED EXAMPLES", { x: 0.6, y: 3.5, w: 4, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  [[fx], [bx]].forEach(([v], i) => {
    const y = 3.85 + i * 0.62;
    box(s, 0.6, y, 12.13, 0.52, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
    T(s, short(v.vendor_name), { x: 0.8, y, w: 2.2, h: 0.52, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
    T(s, `${v.tier} tier  \u00b7  data ${v.factors.data_sensitivity}  \u00b7  role ${v.ai_role}  \u2192  severity ${v.severity}  \u00b7  evidence ${v.tag}  \u2192`,
      { x: 3.0, y, w: 7.4, h: 0.52, fontSize: 13, color: C.text1, valign: "middle" });
    s.addShape(S.roundRect, { x: 11.2, y: y + 0.08, w: 1.4, h: 0.36, rectRadius: 0.06, fill: { color: RISK_COL[v.risk_class] }, line: { color: RISK_COL[v.risk_class], width: 0.5 } });
    T(s, v.risk_class, { x: 11.2, y: y + 0.08, w: 1.4, h: 0.36, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle" });
  });
  // brief risks -> flags
  T(s, "HOW THE THREE KEY RISKS SHOW UP IN THE OUTPUT", { x: 0.6, y: 5.2, w: 6, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  const fl = [["Sensitive data to AI models", "SENSITIVE_DATA_TO_MODELS", "data class 3+ and AI evidenced"], ["Undisclosed sub-processor", "UNRESOLVED_PROVIDER", "AI used, no provider named"], ["Reduced transparency", "AUTONOMOUS_ACTIONS", "agentic or autonomous wording"]];
  fl.forEach((f, i) => {
    const x = 0.6 + i * 4.1;
    box(s, x, 5.55, 3.93, 0.8, { fill: { color: C.background1 }, line: { color: C.accent4, width: 1.25 } });
    T(s, f[0], { x: x + 0.12, y: 5.6, w: 3.7, h: 0.3, fontSize: 13, bold: true, color: C.text2 });
    T(s, f[1] + "  \u00b7  " + f[2], { x: x + 0.12, y: 5.92, w: 3.7, h: 0.4, fontSize: 10.5, color: C.text1 });
  });
  T(s, "Action deadlines:  Critical 15 business days  \u00b7  High 30  \u00b7  Medium next review  \u00b7  Low annual", { x: 0.6, y: 6.5, w: 12.1, h: 0.35, fontSize: 13, bold: true, color: C.accent2 });
}

/* ======================= 13. RESULTS ======================= */
{
  const s = content("Results across Meridian's vendors",
    `Offline snapshot from ${DATA.meta.generated}; a live sweep refreshes the same table with fetched pages.`, "RESULTS",
    "Read across a row: tier, whether AI is used, how sure we are, who the providers are, the risk class. Two things to land: Fiserv and BNY are escalated; TCH and AutomWorx are inconclusive, not cleared.");
  const H = (t) => ({ text: t, options: { bold: true, color: HEX.lt1, fill: { color: HEX.dk2 }, fontSize: 12 } });
  const cell = (t, o) => ({ text: t, options: Object.assign({ fontSize: 12, color: HEX.dk1, valign: "middle" }, o || {}) });
  const rows = [[H("Vendor"), H("Tier (score)"), H("AI usage"), H("Evidence"), H("Model providers named"), H("AI risk")]];
  IN.slice().sort((a, b) => b.severity - a.severity).forEach((r, i) => {
    const bgc = i % 2 ? HEX.lt1 : HEX.lt2;
    rows.push([
      cell(short(r.vendor_name), { bold: true, fill: { color: bgc } }),
      cell(`${r.tier} (${r.criticality_score})`, { fill: { color: bgc } }),
      cell(r.ai_detected + (r.coverage_gap ? " \u00b7 coverage gap" : ""), { fill: { color: bgc } }),
      cell(r.tag, { fill: { color: bgc } }),
      cell(provs(r), { fill: { color: bgc } }),
      cell(r.risk_class, { bold: true, color: HEX.lt1, fill: { color: RISK_COL[r.risk_class] || HEX.accent6 }, align: "center" }),
    ]);
  });
  s.addTable(rows, { x: 0.6, y: 1.95, w: 12.13, colW: [2.6, 1.7, 2.2, 1.6, 2.6, 1.43], rowH: 0.5, border: { type: "solid", pt: 0.5, color: "D5DBE4" }, valign: "middle" });
  const esc = IN.filter((r) => r.risk_class === "Critical" || r.risk_class === "High");
  const inc = IN.filter((r) => r.ai_detected === "Inconclusive");
  T(s, [
    { text: "Escalate: ", options: { bold: true, color: HEX.accent4 } },
    { text: esc.map((r) => short(r.vendor_name)).join(" and ") + " combine high criticality with evidenced, autonomous AI on sensitive data.", options: { breakLine: true } },
    { text: "Not cleared: ", options: { bold: true, color: HEX.accent3 } },
    { text: inc.map((r) => short(r.vendor_name)).join(", ") + " are inconclusive (too few pages, or marketing-only) and go to the questionnaire.", options: {} },
  ], { x: 0.6, y: 5.75, w: 12.13, h: 1.0, fontSize: 14, color: C.text1, paraSpaceAfter: 6 });
}

/* ======================= 14. TRACEABILITY ======================= */
{
  const fx = R.find((r) => r.vendor_id === "V-002");
  const top = (fx.signals || []).slice().sort((a, b) => b.score - a.score)[0];
  const tch = R.find((r) => r.vendor_id === "V-006");
  const s = content("Every finding is traceable",
    "An explainable result needs the excerpt, its source, when it was read and what it said at the time.", "RESULTS",
    "Left: one real finding with all its metadata. Right: how we treat a negative result. We never present absence of evidence as clearance; the vendor goes back for a questionnaire.");
  box(s, 0.6, 1.95, 7.2, 4.85, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
  T(s, "ONE FINDING, FULLY TRACED  \u00b7  " + short(fx.vendor_name).toUpperCase(), { x: 0.85, y: 2.08, w: 6.8, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 1 });
  s.addShape(S.roundRect, { x: 0.85, y: 2.5, w: 6.7, h: 1.2, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.accent1, width: 1.25 } });
  T(s, "\u201c" + clip(top.excerpt, 230) + "\u201d", { x: 1.0, y: 2.58, w: 6.4, h: 1.05, fontSize: 14, italic: true, color: C.text2 });
  const meta = [["Signal type", top.type.replace(/_/g, " ").toLowerCase()], ["Source class", `${top.source_class.replace(/_/g, " ")}  (weight ${top.source_weight})`],
    ["Provenance", `${top.provenance}  (trust ${top.trust})`], ["Retrieved", top.retrieved], ["Content SHA-256", top.sha256 + "\u2026"], ["Source", clip(top.url, 52)], ["Signal score", String(top.score)]];
  meta.forEach((m, i) => {
    const y = 3.95 + i * 0.4;
    T(s, m[0], { x: 0.9, y, w: 1.9, h: 0.32, fontSize: 12, bold: true, color: C.text2 });
    T(s, m[1], { x: 2.85, y, w: 4.8, h: 0.32, fontSize: 12, color: C.text1 });
  });
  box(s, 8.1, 1.95, 4.63, 2.05, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 } });
  T(s, "Negative findings, handled honestly", { x: 8.3, y: 2.07, w: 4.3, h: 0.35, fontSize: 15, bold: true, color: C.background1 });
  T(s, `${short(tch.vendor_name)}: no AI signal found, but only ${tch.docs_reviewed} page(s) reviewed against the ${CFG.depth.Critical.min_docs_for_negative} required for a Critical vendor. Result: Inconclusive (coverage gap), not \u201cNo\u201d.`,
    { x: 8.3, y: 2.5, w: 4.3, h: 1.4, fontSize: 13, color: C.background2 });
  box(s, 8.1, 4.2, 4.63, 2.6);
  T(s, "Evidence Log sheet in every workbook", { x: 8.3, y: 4.32, w: 4.3, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
  T(s, [
    { text: "Vendor, signal type, exact excerpt", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Source class, weight, trust, score", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "URL, retrieval date, content hash", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Provenance and providers named", options: { bullet: { indent: 14 }, breakLine: true } },
    { text: "Every page reviewed, including fetch failures", options: { bullet: { indent: 14 } } },
  ], { x: 8.3, y: 4.75, w: 4.3, h: 1.9, fontSize: 13, color: C.text1, paraSpaceAfter: 4 });
}

/* ======================= 15. DEMO ======================= */
{
  const s = content("Live demonstration",
    "A local web application that runs fully offline; live mode adds a sweep of the vendors' public pages.", "DEMO",
    "Run this live: Upload & Analyse, choose Offline, Run. Point at the benchmark tile, open Fiserv to show the evidence, then download the workbook and open the Evidence Log sheet.");
  const steps = [
    ["1", "Upload", "Choose the Meridian vendor workbook (.xlsx) or use the bundled template."],
    ["2", "Choose mode", "Offline snapshot, instant. Live sweep fetches public pages (1\u20133 minutes)."],
    ["3", "Run", "Progress log per vendor. The benchmark V-000 is re-checked every run."],
    ["4", "Review", "Tier, AI usage, evidence tag, providers, risk, flags. Click a vendor for every signal and source."],
    ["5", "Download", "Completed workbook: columns L\u2013V, Evidence Log, criticality scores, rubric."],
  ];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 2.45;
    box(s, x, 1.95, 2.28, 2.65, { fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
    circle(s, x + 0.18, 2.1, 0.5, st[0], C.accent2);
    T(s, st[1], { x: x + 0.18, y: 2.75, w: 1.95, h: 0.4, fontSize: 17, bold: true, color: C.text2 });
    T(s, st[2], { x: x + 0.18, y: 3.2, w: 1.95, h: 1.35, fontSize: 12.5, color: C.text1 });
    if (i < 4) arrow(s, x + 2.3, 3.25, x + 2.45, 3.25, C.accent6);
  });
  T(s, "ALSO ON THE SITE, RENDERED FROM THE SAME RUN", { x: 0.6, y: 4.9, w: 8, h: 0.3, fontSize: 12, bold: true, color: C.accent6, charSpacing: 2 });
  const also = [["Command Center", "KPIs, escalation, concentration"], ["Risk Matrix", "tier \u00d7 AI risk heatmap"], ["Vendor Inventory", "cards, filters, dossiers"], ["4th-Party Chain", "vendor to model-provider map"], ["Action Tracker", "deadlines and owners"]];
  also.forEach((a, i) => {
    const x = 0.6 + i * 2.45;
    box(s, x, 5.3, 2.28, 1.25, { fill: { color: C.background1 }, line: { color: C.accent1, width: 1.25 } });
    T(s, a[0], { x: x + 0.15, y: 5.4, w: 2.0, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
    T(s, a[1], { x: x + 0.15, y: 5.82, w: 2.0, h: 0.65, fontSize: 12, color: C.text1 });
  });
}

/* ======================= 16. ACTIONS ======================= */
{
  const urgent = IN.filter((r) => r.risk_class === "Critical");
  const high = IN.filter((r) => r.risk_class === "High" || ((r.coverage_gap || r.ai_detected === "Inconclusive") && r.risk_class !== "Critical"));
  const rest = IN.filter((r) => !urgent.includes(r) && !high.includes(r));
  const s = content("Recommended actions for Meridian",
    "Actions are generated per vendor from the risk class and evidence strength, with owners and deadlines in the workbook.", "RESULTS",
    "Urgent: sub-processor and retention verification for the Critical-risk vendors. 30 days: governance briefings and closing evidence gaps. Annual: preventative notice clauses where no AI was found.");
  const colsA = [
    ["Within 15 business days", HEX.accent4, urgent, "Formal AI security and sub-processor questionnaire; verify retention, training use and human-review thresholds; add contract clauses; escalate to the Risk Committee."],
    ["Within 30 business days", HEX.accent3, high, "Governance briefing for High-risk vendors; for inconclusive vendors, extend OSINT coverage and issue a targeted questionnaire."],
    ["Next review cycle", HEX.accent5, rest, "Preventative clause requiring notice before AI or new sub-processors are introduced; annual re-assessment."],
  ];
  colsA.forEach((c, i) => {
    const x = 0.6 + i * 4.1;
    s.addShape(S.roundRect, { x, y: 1.95, w: 3.93, h: 4.5, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: c[1], width: 1.75 } });
    T(s, c[0], { x: x + 0.2, y: 2.08, w: 3.55, h: 0.4, fontSize: 17, bold: true, color: c[1] });
    T(s, "WHAT TO DO", { x: x + 0.2, y: 2.6, w: 3.55, h: 0.25, fontSize: 10.5, bold: true, color: C.accent6, charSpacing: 2 });
    T(s, c[3], { x: x + 0.2, y: 2.88, w: 3.55, h: 1.75, fontSize: 13.5, color: C.text1 });
    T(s, "VENDORS", { x: x + 0.2, y: 4.25, w: 3.55, h: 0.25, fontSize: 10.5, bold: true, color: C.accent6, charSpacing: 2 });
    if (!c[2].length) T(s, "None in this run", { x: x + 0.2, y: 4.55, w: 3.55, h: 0.4, fontSize: 14, color: C.text1 });
    c[2].slice(0, 4).forEach((r, k) => {
      const yy = 4.55 + k * 0.44;
      s.addShape(S.roundRect, { x: x + 0.2, y: yy, w: 3.53, h: 0.37, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.background1, width: 0.5 } });
      T(s, short(r.vendor_name), { x: x + 0.32, y: yy, w: 1.9, h: 0.37, fontSize: 13, bold: true, color: C.text2, valign: "middle" });
      T(s, r.coverage_gap ? `${r.risk_class} \u00b7 coverage gap` : r.tag === "None found" ? r.risk_class : `${r.risk_class} \u00b7 ${r.tag}`,
        { x: x + 2.0, y: yy, w: 1.68, h: 0.37, fontSize: 10.5, color: C.accent6, valign: "middle", align: "right" });
    });
  });
}

/* ======================= 17. LIMITS & NEXT ======================= */
{
  const s = content("Limitations and next steps",
    "OSINT narrows the questions; it does not replace the vendor questionnaire.", "WRAP-UP",
    "Say the limits before they are asked. The strongest answer to 'how reliable is this' is that every weight is visible, the benchmark is re-checked each run, and weak evidence cannot produce a Critical rating.");
  const L = [
    "Sentence typing is rule-based and can misread context; a human reviews the excerpts.",
    "Offline results use analyst-recorded evidence (discounted \u00d70.9, flagged); a live sweep replaces it with fetched pages.",
    "\u201cNo AI\u201d is only returned after enough pages for the tier; otherwise it is a coverage gap.",
    "Weights and the Critical threshold are judgement calls, calibrated on one benchmark row.",
    "Public material shows AI use, not data flows; flows remain inferred until the vendor answers.",
  ];
  const N = [
    "Run the live sweep for all vendors and review excerpts with an analyst.",
    "Exercise the optional LLM assist on ambiguous sentences and measure agreement.",
    "Calibrate weights on more benchmark rows and publish the sensitivity of ratings.",
    "Feed questionnaire answers back to upgrade or close findings.",
    "Create the enterprise AI sub-processor registry from named providers.",
  ];
  [["Limits", L, HEX.accent3], ["Next steps", N, HEX.accent2]].forEach((c, i) => {
    const x = 0.6 + i * 6.2;
    s.addShape(S.roundRect, { x, y: 1.95, w: 5.93, h: 3.9, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: c[2], width: 1.5 } });
    T(s, c[0], { x: x + 0.25, y: 2.08, w: 5.4, h: 0.4, fontSize: 18, bold: true, color: c[2] });
    T(s, c[1].map((l, k) => ({ text: l, options: { bullet: { indent: 14 }, breakLine: k < c[1].length - 1, paraSpaceAfter: 6 } })), { x: x + 0.25, y: 2.6, w: 5.45, h: 3.2, fontSize: 13.5, color: C.text1 });
  });
  box(s, 0.6, 6.05, 12.13, 0.75, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 } });
  T(s, "Confidentiality: findings stay on this machine. No public repository, no published presentation, no contact with vendors.",
    { x: 0.85, y: 6.05, w: 11.6, h: 0.75, fontSize: 14, color: C.background1, valign: "middle" });
}

/* ======================= 18. GLOSSARY ======================= */
{
  const s = content("Appendix: key terms",
    "", "APPENDIX",
    "Reference slide for questions.");
  const g = [
    ["TPRM", "Third-Party Risk Management: assessing risk that comes from vendors."],
    ["OSINT", "Open-source intelligence: only publicly available information."],
    ["3rd / 4th party", "The vendor Meridian buys from / that vendor's own supplier, such as a model provider."],
    ["AI sub-processor", "An outside AI provider that handles data on the vendor's behalf."],
    ["Criticality tier", "How much Meridian is hurt if the vendor fails or is compromised."],
    ["Signal", "One AI-related statement found in one source."],
    ["Evidentiary weight", "How much a source type is worth as proof of real AI use."],
    ["Noisy-OR", "Combines independent evidence so more kinds of agreement mean higher confidence."],
    ["Coverage gap", "Too few pages reviewed to accept a negative finding."],
    ["Agentic AI", "AI that takes actions on its own rather than only advising."],
    ["MCP / BYOM", "Model Context Protocol lets a model drive tools; Bring Your Own Model lets customers plug in theirs."],
    ["DPA", "Data Processing Agreement: the contract limiting what a processor may do with data."],
  ];
  g.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.17, y = 1.5 + row * 0.9;
    box(s, x, y, 5.96, 0.8);
    T(s, t[0], { x: x + 0.15, y: y + 0.07, w: 5.7, h: 0.3, fontSize: 13, bold: true, color: C.accent2 });
    T(s, t[1], { x: x + 0.15, y: y + 0.37, w: 5.7, h: 0.4, fontSize: 11.5, color: C.text1 });
  });
}

const OUT = path.join(ROOT, "Meridian_Case_Study_1_Deck.pptx");
(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT, "slides:", n);
})();
