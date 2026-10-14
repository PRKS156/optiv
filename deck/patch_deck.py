import pathlib

p = pathlib.Path(__file__).parent / "build_deck.js"
s = p.read_text(encoding="utf-8")


def rep(old, new):
    global s
    assert old in s, "missing: " + old[:80]
    s = s.replace(old, new, 1)


# --- header: chip above title, title full width and left aligned ---
rep('''{ placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.42, w: 9.4, h: 0.8, fontSize: 28, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },''',
    '''{ placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.62, w: 12.1, h: 0.7, fontSize: 28, bold: true, color: C.text2, valign: "middle", align: "left", margin: 0 }, text: "" } },''')
rep('''  if (sub) T(s, sub, { x: 0.6, y: 1.22, w: 12.1, h: 0.5, fontSize: 16, color: C.accent6 });
  if (chip) {
    s.addShape(S.roundRect, { x: 10.23, y: 0.46, w: 2.5, h: 0.34, rectRadius: 0.17, fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
    T(s, chip, { x: 10.23, y: 0.46, w: 2.5, h: 0.34, align: "center", valign: "middle", fontSize: 11, bold: true, color: C.accent2 });
  }''',
    '''  if (sub) T(s, sub, { x: 0.6, y: 1.32, w: 12.1, h: 0.45, fontSize: 16, color: C.accent6 });
  if (chip) {
    const cw = Math.max(1.6, chip.length * 0.085 + 0.5);
    s.addShape(S.roundRect, { x: 0.6, y: 0.28, w: cw, h: 0.3, rectRadius: 0.15, fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 } });
    T(s, chip, { x: 0.6, y: 0.28, w: cw, h: 0.3, align: "center", valign: "middle", fontSize: 10.5, bold: true, color: C.accent2 });
  }''')

# --- shorter titles ---
for old, new in [
    ('"Our solution: six steps from vendor list to defensible risk call"', '"Our solution: six steps from vendor list to risk call"'),
    ('"Functional design: one pipeline, OSINT collection to risk output"', '"Functional design: OSINT collection to risk output"'),
    ('"Architecture: the technical components inside each stage"', '"Architecture: components inside each stage"'),
    ('"Depth: the tier decides how hard we look, and when to stop"', '"Depth: the tier decides how hard we look"'),
    ('"Evidence logic: a signal score, then independent sources combine"', '"Evidence logic: score each signal, then combine sources"'),
    ('"Capability: how the pipeline collects, extracts and classifies"', '"Capability: collect, extract, classify"'),
    ('"Risk: severity of the exposure, capped by how sure we are"', '"Risk: severity, capped by how sure we are"'),
    ('"Results: every vendor rated, with the evidence behind the call"', '"Results: every vendor rated, with evidence"'),
    ('"Traceability: every finding can be checked, including \\u201cnothing found\\u201d"', '"Traceability: every finding can be checked"'),
    ('"Working demonstration: upload the vendor list, analyse, classify"', '"Working demo: upload, analyse, classify"'),
]:
    rep(old, new)

# --- tight bullet indent everywhere ---
s = s.replace("bullet: true", "bullet: { indent: 14 }")

# --- contrast on dark panels ---
rep('color: C.accent1, charSpacing: 3 });', 'color: "7FD6DD", charSpacing: 3 });')
rep('{ x: 0.8, y: 6.1, w: 11, h: 0.4, fontSize: 12, color: C.accent6 }', '{ x: 0.8, y: 6.1, w: 11, h: 0.4, fontSize: 12, color: "A9B6C6" }')
rep('T(s, "The hard part", { x: 7.85, y: 2.15, w: 4.6, h: 0.4, fontSize: 14, bold: true, color: C.accent1 });',
    'T(s, "The hard part", { x: 7.85, y: 2.15, w: 4.6, h: 0.4, fontSize: 14, bold: true, color: "7FD6DD" });')
rep('{ x: 0.85, y: 5.8, w: 4, h: 0.3, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2 }',
    '{ x: 0.85, y: 5.8, w: 4, h: 0.3, fontSize: 12, bold: true, color: "7FD6DD", charSpacing: 2 }')

# --- slide 5 feedback strip ---
rep('"Feedback: coverage gaps and unresolved model providers become vendor-questionnaire items. OSINT targets the questionnaire; it never replaces it."',
    '"Coverage gaps and unresolved model providers become vendor-questionnaire items. OSINT targets the questionnaire; it never replaces it."')
rep('{ x: 0.85, y: 6.2, w: 11.6, h: 0.62, fontSize: 14, color: C.background1, valign: "middle" }',
    '{ x: 0.85, y: 6.2, w: 11.6, h: 0.62, fontSize: 13.5, color: C.background1, valign: "middle" }')

# --- slide 8 duplicated "Stop:" ---
rep('T(s, "Stop: " + d[t].stop_rule,', 'T(s, d[t].stop_rule,')

# --- slide 9 chart label decimals ---
rep('valAxisMaxVal: 1.1, valAxisMinVal: 0,', 'valAxisMaxVal: 1.1, valAxisMinVal: 0, dataLabelFormatCode: "0.00", valAxisLabelFormatCode: "0.0",')

# --- slide 10 formula + tag rows ---
rep('"Keep the strongest signal per class, then combine classes: usage = 1 \\u2212 \\u03a0(1 \\u2212 score)."',
    '"Keep the strongest signal per class, then combine the classes. More kinds of source agreeing means a higher score."')
rep('["Source weight", "how reliable the source class is", "0.8"]', '["Source weight", "reliability of the source class (press release shown)", "0.8"]')
rep('["Confirmed", "\\u2265 0.75 and one strong signal from a source \\u2265 0.7", "Yes", HEX.accent4],',
    '["Confirmed", "\\u2265 0.75 + one strong signal (source \\u2265 0.7)", "Yes", HEX.accent4],')
rep('''    T(s, t[1], { x: 8.7, y, w: 3.0, h: 0.4, fontSize: 11, color: C.text1, valign: "middle" });
    T(s, "\\u2192 " + t[2], { x: 11.6, y, w: 1.0, h: 0.4, fontSize: 12, bold: true, color: C.text2, valign: "middle" });''',
    '''    T(s, t[1], { x: 8.7, y, w: 2.75, h: 0.4, fontSize: 11, color: C.text1, valign: "middle" });
    T(s, "\\u2192 " + t[2], { x: 11.45, y, w: 1.25, h: 0.4, fontSize: 12, bold: true, color: C.text2, valign: "middle", wrap: false });''')
rep('["Marketing-only", "below 0.25, or readiness language only", "Inconclusive", HEX.accent6]',
    '["Marketing-only", "< 0.25, or readiness wording only", "Inconclusive", HEX.accent6]')
rep('["None found", "enough pages reviewed for the tier", "No", HEX.accent5]', '["None found", "and enough pages for the tier", "No", HEX.accent5]')

# --- slide 11 larger text ---
rep("{ x: x + 0.2, y: 2.6, w: 3.55, h: 2.8, fontSize: 13, color: C.text1 }", "{ x: x + 0.2, y: 2.6, w: 3.55, h: 2.8, fontSize: 14, color: C.text1 }")

# --- slide 14 spacing ---
rep('s.addShape(S.roundRect, { x: 0.85, y: 2.5, w: 6.7, h: 1.45, rectRadius: 0.06,', 's.addShape(S.roundRect, { x: 0.85, y: 2.5, w: 6.7, h: 1.2, rectRadius: 0.06,')
rep('{ x: 1.0, y: 2.58, w: 6.4, h: 1.3, fontSize: 14, italic: true, color: C.text2 }', '{ x: 1.0, y: 2.58, w: 6.4, h: 1.05, fontSize: 14, italic: true, color: C.text2 }')
rep("const y = 4.12 + i * 0.37;", "const y = 3.95 + i * 0.4;")
rep('box(s, 8.1, 1.95, 4.63, 2.35, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 } });',
    'box(s, 8.1, 1.95, 4.63, 2.05, { fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 } });')
rep('{ x: 8.3, y: 2.5, w: 4.3, h: 1.7, fontSize: 13, color: C.background2 }', '{ x: 8.3, y: 2.5, w: 4.3, h: 1.4, fontSize: 13, color: C.background2 }')
rep('box(s, 8.1, 4.5, 4.63, 2.3);', 'box(s, 8.1, 4.2, 4.63, 2.6);')
rep('T(s, "Evidence Log sheet in every workbook", { x: 8.3, y: 4.6,', 'T(s, "Evidence Log sheet in every workbook", { x: 8.3, y: 4.32,')
rep("{ x: 8.3, y: 5.0, w: 4.3, h: 1.7, fontSize: 12.5, color: C.text1 }", "{ x: 8.3, y: 4.75, w: 4.3, h: 1.9, fontSize: 13, color: C.text1, paraSpaceAfter: 4 }")

# --- slide 16 restructure ---
a = s.index("  colsA.forEach((c, i) => {")
b = s.index("}\n\n/* ======================= 17.")
new16 = '''  colsA.forEach((c, i) => {
    const x = 0.6 + i * 4.1;
    s.addShape(S.roundRect, { x, y: 1.95, w: 3.93, h: 4.85, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: c[1], width: 1.75 } });
    T(s, c[0], { x: x + 0.2, y: 2.08, w: 3.55, h: 0.4, fontSize: 17, bold: true, color: c[1] });
    T(s, "WHAT TO DO", { x: x + 0.2, y: 2.6, w: 3.55, h: 0.25, fontSize: 10.5, bold: true, color: C.accent6, charSpacing: 2 });
    T(s, c[3], { x: x + 0.2, y: 2.88, w: 3.55, h: 1.75, fontSize: 13.5, color: C.text1 });
    T(s, "VENDORS", { x: x + 0.2, y: 4.7, w: 3.55, h: 0.25, fontSize: 10.5, bold: true, color: C.accent6, charSpacing: 2 });
    if (!c[2].length) T(s, "None in this run", { x: x + 0.2, y: 5.0, w: 3.55, h: 0.4, fontSize: 14, color: C.text1 });
    c[2].slice(0, 4).forEach((r, k) => {
      const yy = 5.0 + k * 0.44;
      s.addShape(S.roundRect, { x: x + 0.2, y: yy, w: 3.53, h: 0.37, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.background1, width: 0.5 } });
      T(s, short(r.vendor_name), { x: x + 0.32, y: yy, w: 1.9, h: 0.37, fontSize: 13, bold: true, color: C.text2, valign: "middle" });
      T(s, `${r.risk_class} \\u00b7 ${r.tag}`, { x: x + 2.1, y: yy, w: 1.58, h: 0.37, fontSize: 10.5, color: C.accent6, valign: "middle", align: "right" });
    });
  });
'''
s = s[:a] + new16 + s[b:]
p.write_text(s, encoding="utf-8")
print("patched")
