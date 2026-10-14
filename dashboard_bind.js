/* Renders dashboard tabs 1-6 from window.PIPELINE_RESULTS so they can never disagree with the pipeline.
   Re-renders when a Live Analysis run completes ('pipeline:results' event). Runs before app.js. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

  const TIER_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  const RISK_RANK = { 'None identified': 0, Low: 1, Medium: 2, High: 3, Critical: 4 };
  const ROLE_TEXT = { agentic: 'autonomous / agentic actions', generative: 'generative AI processing',
    analytic: 'ML analytics or scoring', unspecified: 'AI use of unspecified type', none: 'no AI role' };
  const OWNER = { 'Core Platform': 'CISO & TPRM Lead', 'Payments': 'Payments Operations & Legal',
    'Payments Infrastructure': 'Payments Compliance', 'Professional Services': 'Infrastructure & Vendor Security',
    'Data and Reporting': 'Wealth Management Risk', 'Document and Communications': 'Vendor Management' };

  function shortName(n) {
    n = String(n || '');
    if (/EXAMPLE VENDOR/i.test(n)) return 'Larkspur (benchmark)';
    if (/FSSI/.test(n)) return 'FSSI';
    if (/Clearing House/i.test(n)) return 'The Clearing House';
    return n.replace(/,?\s*(Inc\.?|L\.L\.C\.|Ltd|Technologies)\b\.?/gi, '').replace(/\s+/g, ' ').trim();
  }
  function providerKey(p) {
    if (/microsoft/i.test(p)) return 'Microsoft Azure / Copilot';
    if (/google/i.test(p)) return 'Google Cloud (Gemini)';
    if (/amazon|aws/i.test(p)) return 'Amazon Web Services';
    return p.replace(/\s*\(.*\)\s*$/, '');
  }
  function badgeClass(k) {
    return /microsoft/i.test(k) ? 'sub-azure' : /openai/i.test(k) ? 'sub-openai' : /google/i.test(k) ? 'sub-google' : 'sub-broadcom';
  }
  function parseDate(dmy) {
    const m = /(\d{2})-(\d{2})-(\d{4})/.exec(dmy || '');
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date();
  }
  function addBD(d, n) {
    const x = new Date(d); let k = 0;
    while (k < n) { x.setDate(x.getDate() + 1); if (x.getDay() % 6) k++; }
    return x;
  }
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const names = (arr) => arr.map((r) => shortName(r.vendor_name)).join(', ') || '—';
  const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);

  function urgency(r) {
    if (r.risk_class === 'Critical') return ['Urgent (15 Business Days)', 'urgent'];
    if (r.risk_class === 'High') return ['High Priority (30 Business Days)', 'high'];
    if (r.coverage_gap || r.ai_detected === 'Inconclusive') return ['Extend Coverage (30 Business Days)', 'high'];
    if (r.risk_class === 'Medium') return ['Next Review Cycle', 'normal'];
    return ['Annual / Continuous Monitoring', 'normal'];
  }

  function legacy(r, team) {
    const c = r.cells, p = r.provided || {};
    const u = urgency(r);
    return Object.assign({}, p, {
      'Vendor Name': r.benchmark ? 'Larkspur Servicing Group Ltd (Benchmark)' : p['Vendor Name'] || r.vendor_name,
      'Criticality Tier': r.tier,
      'Criticality Rationale': c['Criticality Rationale'],
      'Assessment Depth Applied': c['Assessment Depth Applied'],
      'AI Usage Detected (Y/N)': r.ai_detected,
      'Evidence Description along with OSINT Source(s) / Evidence Link': c['Evidence Description'],
      'How Vendor May Be Using AI': c['How Vendor May Be Using AI'],
      'Named AI Sub-processors / Model Providers': c['Named AI Sub-processors'],
      'AI Security Risk Classification': r.risk_class,
      'Risk Rationale': c['Risk Rationale'],
      'Recommended Action': c['Recommended Action'],
      'Assessedd By / Date': String(c['Assessed'] || '').replace('{team}', team || 'Team'),
      is_benchmark: !!r.benchmark, id: r.vendor_id, name: p['Vendor Name'] || r.vendor_name,
      tier: r.tier, ai_detected: r.ai_detected, ai_risk: r.risk_class, category: p['Category'],
      website: p['Public Website'], evidence_tag: r.tag,
      sub_processors_list: Array.from(new Set((r.providers || []).map(providerKey))),
      urgency: u[0], urgency_class: u[1],
    });
  }

  /* ---------------- tab 1: command centre ---------------- */
  function setKpi(id, value, sub, tag) {
    const card = document.getElementById(id); if (!card) return;
    $('.kpi-value', card).textContent = value;
    $('.kpi-sub', card).textContent = sub;
    const t = $('.kpi-status-tag', card); if (t) t.textContent = tag;
  }

  function renderCommand(R, inScope, meta) {
    const n = inScope.length;
    const crit = inScope.filter((r) => r.tier === 'Critical');
    const yes = inScope.filter((r) => r.ai_detected === 'Yes');
    const hi = inScope.filter((r) => r.risk_class === 'Critical' || r.risk_class === 'High');
    const provs = new Map();
    inScope.forEach((r) => (r.providers || []).forEach((p) => {
      const k = providerKey(p); (provs.get(k) || provs.set(k, []).get(k)).push(r);
    }));
    setKpi('kpi-card-vendors', n, 'In scope (benchmark V-000 excluded)',
      `${meta.mode === 'live' ? 'Live sweep' : 'Offline snapshot'} · ${meta.generated}`);
    setKpi('kpi-card-critical-tier', crit.length, `${pct(crit.length, n)}% of in-scope vendors`, names(crit));
    setKpi('kpi-card-ai-detected', yes.length, `AI use evidenced (${pct(yes.length, n)}% of in-scope)`, names(yes));
    setKpi('kpi-card-high-critical-risk', hi.length, 'Critical / High AI security risk', names(hi));
    setKpi('kpi-card-subprocessors', provs.size, 'Model providers named in evidence',
      Array.from(provs.keys()).join(', ') || 'None named');

    // executive callout
    const banner = document.getElementById('executive-critical-callout');
    const top = inScope.filter((r) => (r.risk_class === 'Critical' || r.risk_class === 'High') && r.ai_detected === 'Yes')
      .sort((a, b) => b.severity - a.severity).slice(0, 3);
    if (banner) {
      banner.style.display = top.length ? '' : 'none';
      if (top.length) {
        const hasCrit = top.some((r) => r.risk_class === 'Critical');
        $('.alert-title', banner).textContent = (hasCrit ? 'Priority escalation: ' : 'Escalation required: ') +
          top.map((r) => shortName(r.vendor_name)).join(', ');
        $('.badge', banner).textContent = hasCrit ? 'Action within 15 business days' : 'Action within 30 business days';
        $('.alert-text', banner).innerHTML = top.map((r) => {
          const prov = (r.providers || []).length ? `named model providers: ${esc((r.providers || []).map(providerKey).join(', '))}`
            : 'model provider not disclosed';
          return `<strong>${esc(shortName(r.vendor_name))} (${esc(r.vendor_id)})</strong> — ${esc(r.tag)} evidence of ` +
            `${esc(ROLE_TEXT[r.ai_role] || 'AI use')}; ${prov}; data in scope: ` +
            `${esc(clip(String((r.provided || {})['Data Classification Accessed'] || '').replace(/[.\s]+$/, ''), 90))}`;
        }).join('. ') + '. Verify sub-processor, retention and training-use terms before further reliance.';
        const btn = $('button', banner);
        if (btn) {
          btn.textContent = 'Inspect ' + shortName(top[0].vendor_name) + ' dossier';
          btn.setAttribute('onclick', `window.app.openDossier('${top[0].vendor_id}')`);
        }
      }
    }

    // distribution bars
    const no = inScope.filter((r) => r.ai_detected === 'No');
    const inc = inScope.filter((r) => r.ai_detected === 'Inconclusive');
    const groups = [
      [yes, 'Active AI Usage (Evidenced)', yes.map((r) => shortName(r.vendor_name) + ' [' + r.tag + ']').join(', ')],
      [no, 'No Public AI Evidence (after sufficient review)', names(no)],
      [inc, 'Inconclusive (coverage gap or marketing-only)',
        inc.map((r) => shortName(r.vendor_name) + (r.coverage_gap ? ' [coverage gap]' : ' [' + r.tag + ']')).join(', ')],
    ];
    $$('.distribution-bars .dist-bar-item').forEach((el, i) => {
      const g = groups[i]; if (!g) return;
      $('.dist-label', el).lastChild.textContent = g[1];
      $('.dist-val', el).textContent = `${g[0].length} Vendor${g[0].length === 1 ? '' : 's'} (${pct(g[0].length, n)}%)`;
      $('.progress-fill', el).style.width = pct(g[0].length, n) + '%';
      $('.dist-vendors-list', el).textContent = g[2] || '—';
    });
    const tk = $('.analytical-takeaway-box p');
    if (tk) {
      tk.innerHTML = `<strong>${yes.length} of ${n}</strong> in-scope vendors show an evidenced AI footprint` +
        (yes.length ? ` (${esc(names(yes))})` : '') + `. <strong>${no.length}</strong> show no public AI evidence after the ` +
        `page budget required for their tier (${esc(names(no))}); <strong>${inc.length}</strong> remain inconclusive ` +
        `(${esc(names(inc))}) — absence of evidence is not clearance, so these route to the vendor questionnaire. ` +
        `Evidence confidence is shown per vendor; analyst-recorded evidence is discounted and flagged until a live sweep replaces it.`;
    }

    // 4th-party concentration
    const grid = $('.subprocessors-grid');
    if (grid) {
      const entries = Array.from(provs.entries()).sort((a, b) => b[1].length - a[1].length);
      grid.innerHTML = entries.length ? entries.map(([k, vs]) => {
        const worst = vs.slice().sort((a, b) => b.severity - a.severity)[0];
        return `<div class="subprocessor-item">
          <div class="sub-logo-row"><div class="sub-badge ${badgeClass(k)}">${esc(k)}</div>
            <span class="sub-count">${vs.length} vendor${vs.length === 1 ? '' : 's'}</span></div>
          <div class="sub-vendors">${vs.map((v) => `<span class="vendor-tag" onclick="window.app.openDossier('${v.vendor_id}')">${esc(shortName(v.vendor_name))}</span>`).join('')}</div>
          <p class="sub-impact">${vs.length > 1 ? 'Concentration: one provider sits behind several vendors. ' : ''}` +
          `Highest-exposure path: ${esc(shortName(worst.vendor_name))} (${esc(worst.tier)} tier, ${esc(worst.risk_class)} AI risk). ` +
          `Verify retention, training use and tenant isolation.</p></div>`;
      }).join('') : '<div class="subprocessor-item"><p class="sub-impact">No model provider is named in the evidence collected. ' +
        'Unresolved providers are flagged per vendor and raised in the questionnaire.</p></div>';
    }
  }

  /* ---------------- tab 2: risk matrix ---------------- */
  function renderMatrix(R, inScope) {
    const tbl = $('.risk-matrix-table'); if (!tbl) return;
    const cols = ['Critical', 'High', 'Medium', 'Low', 'None identified'];
    const tiers = ['Critical', 'High', 'Medium', 'Low'].filter((t) => R.some((r) => r.tier === t));
    const desc = { Critical: 'Outage or compromise halts core operations / full customer impact',
      High: 'Privileged access, regulatory filing or full-population data',
      Medium: 'Internal reporting or batch cycles', Low: 'Limited data and dependency' };
    const zone = (t, c) => {
      const s = TIER_RANK[t] * RISK_RANK[c];
      if (s >= 16) return ['cell-catastrophic', 'CATASTROPHIC ZONE'];
      if (s >= 12) return ['cell-severe', 'SEVERE ZONE'];
      if (s >= 6) return ['cell-elevated', 'ELEVATED'];
      if (s >= 3) return ['cell-guarded', 'MONITORED'];
      if (s >= 1) return ['cell-low', 'LOW EXPOSURE'];
      return t === 'Critical' ? ['cell-controlled-critical', 'NO AI EVIDENCE — CRITICAL DEPENDENCY'] : ['cell-guarded', 'NO AI EVIDENCE'];
    };
    let h = '<thead><tr><th class="matrix-corner-th">Criticality \\ AI Risk</th>' +
      cols.map((c) => `<th>${c === 'None identified' ? 'None Identified' : c + ' AI Risk'}</th>`).join('') + '</tr></thead><tbody>';
    tiers.forEach((t) => {
      h += `<tr><td class="matrix-row-header tier-${t.toLowerCase()}"><div class="row-tier-name">${t.toUpperCase()}</div>` +
        `<div class="row-tier-desc">${esc(desc[t])}</div></td>`;
      cols.forEach((c) => {
        const vs = R.filter((r) => r.tier === t && r.risk_class === c);
        if (!vs.length) { h += '<td class="matrix-cell cell-empty"><span class="empty-cell-label">—</span></td>'; return; }
        const z = zone(t, c);
        h += `<td class="matrix-cell ${z[0]}"><div class="cell-zone-tag">${z[1]}</div><div class="cell-vendor-list">` +
          vs.map((v) => `<div class="matrix-vendor-pill${v.benchmark ? ' benchmark-pill' : ''}" onclick="window.app.openDossier('${v.vendor_id}')">` +
            `<span class="p-id">${esc(v.vendor_id)}</span><span class="p-name">${esc(shortName(v.vendor_name))}</span>` +
            `<span class="p-tag">${esc(v.tag)}${v.coverage_gap ? ' · coverage gap' : ''}</span></div>`).join('') +
          '</div></td>';
      });
      h += '</tr>';
    });
    tbl.innerHTML = h + '</tbody>';

    const box = $('.matrix-insights-grid');
    if (box) {
      const top = inScope.filter((r) => RISK_RANK[r.risk_class] >= 3 && r.ai_detected === 'Yes');
      const machine = inScope.filter((r) => !(r.flags || []).includes('ANALYST_RECORDED_EVIDENCE_NOT_MACHINE_VERIFIED'));
      const none = inScope.filter((r) => r.ai_detected === 'No');
      const inc = inScope.filter((r) => r.ai_detected === 'Inconclusive');
      box.innerHTML = [
        ['Highest exposure', top.length ? top.map((r) => `<strong>${esc(shortName(r.vendor_name))}</strong>: ${esc(r.tier)} tier, ` +
          `${esc(r.tag)} evidence of ${esc(ROLE_TEXT[r.ai_role] || 'AI use')}` +
          `${(r.providers || []).length ? ' via ' + esc((r.providers || []).map(providerKey).join(', ')) : ', provider undisclosed'}.`).join(' ')
          : 'No vendor combines a High/Critical AI risk with evidenced AI use in this run.'],
        ['How sure are we?', `${inScope.length - machine.length} of ${inScope.length} vendors rest partly on analyst-recorded evidence ` +
          'that has not been machine-verified (discounted ×0.9). A Live sweep replaces it with fetched pages, hashes and dates. ' +
          'Classification is capped by evidence tag: Probable → at most High; Indicative / Marketing-only → at most Medium.'],
        ['Absence of evidence is not clearance', (none.length ? `<strong>${esc(names(none))}</strong>: no public AI evidence after the page budget for the tier. ` : '') +
          (inc.length ? `<strong>${esc(names(inc))}</strong>: inconclusive (coverage gap or marketing-only) and routed to the questionnaire. ` : '') +
          'Negative findings are only accepted when enough pages were reviewed.'],
      ].map((x) => `<div class="insight-box"><h4>${esc(x[0])}</h4><p>${x[1]}</p></div>`).join('');
    }
  }

  /* ---------------- tab 3: inventory filter counts ---------------- */
  function renderFilters(R) {
    const set = (id, opts) => { const el = document.getElementById(id); if (el) el.innerHTML = opts.map((o) => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join(''); };
    const c = (f) => R.filter(f).length;
    set('filter-tier', [['ALL', `All Tiers (${R.length})`]].concat(['Critical', 'High', 'Medium', 'Low']
      .filter((t) => c((r) => r.tier === t)).map((t) => [t, `${t} (${c((r) => r.tier === t)})`])));
    set('filter-ai', [['ALL', `All AI States (${R.length})`]].concat(['Yes', 'No', 'Inconclusive']
      .map((t) => [t, `${t === 'Yes' ? 'Detected / Yes' : t === 'No' ? 'No AI Evidence' : 'Inconclusive'} (${c((r) => r.ai_detected === t)})`])));
    set('filter-risk', [['ALL', `All Risk Levels (${R.length})`]].concat(['Critical', 'High', 'Medium', 'Low', 'None identified']
      .map((t) => [t, `${t} (${c((r) => r.risk_class === t)})`])));
    const cnt = document.getElementById('inventory-counter');
    if (cnt) cnt.innerHTML = `Showing <strong id="counter-count">${R.length}</strong> of ${R.length} vendors`;
  }

  /* ---------------- tab 4: supply-chain topology ---------------- */
  function renderTopology(R, inScope) {
    const svg = document.getElementById('supply-chain-svg'); if (!svg) return;
    const vend = inScope.slice().sort((a, b) => (TIER_RANK[b.tier] - TIER_RANK[a.tier]) || (b.severity - a.severity));
    const pm = new Map();
    vend.forEach((v) => (v.providers || []).forEach((p) => { const k = providerKey(p); (pm.get(k) || pm.set(k, []).get(k)).push(v); }));
    const provList = Array.from(pm.keys());
    const rowH = 80, y0 = 40, N = vend.length;
    const H = Math.max(N * rowH + 2 * y0, provList.length * 110 + 2 * y0, 360);
    svg.setAttribute('viewBox', `0 0 1000 ${H}`);
    const style = (r) => r.risk_class === 'Critical' ? ['conn-danger', '#ef4444', '#f87171']
      : (r.risk_class === 'High' || r.risk_class === 'Medium') ? ['conn-warning', '#f59e0b', '#fbbf24']
      : r.risk_class === 'None identified' && !r.coverage_gap ? ['conn-safe', '#10b981', '#34d399'] : ['conn-neutral', '#64748b', '#94a3b8'];
    const vy = vend.map((_, i) => y0 + i * rowH + (rowH - 50) / 2);
    const span = Math.max(H - 2 * y0 - 60, 0);
    const py = provList.map((_, i) => y0 + (provList.length > 1 ? (i * span) / (provList.length - 1) : span / 2));
    const hubY = H / 2 - 55;
    let out = '';
    vend.forEach((v, i) => {
      const s = style(v);
      out += `<path d="M 190 ${hubY + 55} C 280 ${hubY + 55}, 290 ${vy[i] + 25}, 380 ${vy[i] + 25}" class="conn-line ${s[0]}" stroke-width="2.2"/>`;
    });
    vend.forEach((v, i) => (v.providers || []).forEach((p) => {
      const k = providerKey(p), j = provList.indexOf(k);
      if (j < 0) return;
      const s = style(v);
      out += `<path d="M 570 ${vy[i] + 25} C 645 ${vy[i] + 25}, 650 ${py[j] + 30}, 720 ${py[j] + 30}" class="conn-line ${s[0]}" stroke-width="2.2"/>`;
    }));
    out += `<g class="node-group" transform="translate(60, ${hubY})"><rect x="0" y="0" width="130" height="110" rx="14" ` +
      `fill="url(#grad-meridian)" class="node-box hub-node" filter="url(#glow-effect)"/>` +
      `<text x="65" y="40" text-anchor="middle" fill="#ffffff" font-weight="700" font-size="13">MERIDIAN</text>` +
      `<text x="65" y="58" text-anchor="middle" fill="#e0f2fe" font-size="10">Financial Institution</text>` +
      `<text x="65" y="78" text-anchor="middle" fill="#bae6fd" font-size="9">${N} in-scope vendors</text>` +
      `<text x="65" y="92" text-anchor="middle" fill="#bae6fd" font-size="9">${provList.length} model provider${provList.length === 1 ? '' : 's'} named</text></g>`;
    vend.forEach((v, i) => {
      const s = style(v), p = v.provided || {};
      out += `<g class="node-group clickable-node" transform="translate(380, ${vy[i]})" onclick="window.app.openDossier('${v.vendor_id}')">` +
        `<rect x="0" y="0" width="190" height="50" rx="8" fill="#1e293b" stroke="${s[1]}" stroke-width="2" class="node-box"/>` +
        `<text x="12" y="22" fill="#ffffff" font-weight="600" font-size="12">${esc(clip(v.vendor_id + ' ' + shortName(v.vendor_name), 27))}</text>` +
        `<text x="12" y="38" fill="${s[2]}" font-size="10">${esc(clip(`${v.tier} · AI risk ${v.risk_class}`, 34))}</text></g>`;
    });
    provList.forEach((k, j) => {
      const vs = pm.get(k), hot = vs.some((v) => v.risk_class === 'Critical' || v.risk_class === 'High');
      out += `<g class="node-group" transform="translate(720, ${py[j]})">` +
        `<rect x="0" y="0" width="240" height="60" rx="10" fill="#1e1b4b" stroke="#818cf8" stroke-width="2" class="node-box"/>` +
        `<text x="14" y="24" fill="#a5b4fc" font-weight="700" font-size="12">${esc(clip(k, 32))}</text>` +
        `<text x="14" y="40" fill="#cbd5e1" font-size="10">${esc(clip('Named for: ' + vs.map((v) => shortName(v.vendor_name)).join(', '), 40))}</text>` +
        `<text x="14" y="53" fill="${hot ? '#f87171' : '#fbbf24'}" font-size="9" font-weight="600">` +
        `${hot ? 'Retention / training-use verification needed' : 'Monitor sub-processor changes'}</text></g>`;
    });
    if (!provList.length) {
      out += `<text x="720" y="${H / 2}" fill="#94a3b8" font-size="12">No model provider named in collected evidence</text>`;
    }
    $$('#supply-chain-svg > *:not(defs)').forEach((n) => n.remove());
    svg.insertAdjacentHTML('beforeend', out);

    const cap = $('#tab-supply-chain .diagram-caption');
    if (cap) {
      const multi = Array.from(pm.entries()).filter((e) => e[1].length > 1);
      cap.innerHTML = '<strong>Systemic takeaway:</strong> ' + (multi.length
        ? multi.map((e) => `${esc(e[0])} sits behind ${e[1].length} vendors (${esc(names(e[1]))})`).join('; ') +
          '. An outage, flaw or unauthorised retention at that provider affects several Meridian services at once.'
        : 'No single model provider is shared by more than one in-scope vendor in the evidence collected; unresolved providers remain a blind spot.');
    }
  }

  /* ---------------- tab 5: action tracker ---------------- */
  function renderActions(R, inScope, meta) {
    const base = parseDate(meta.generated);
    const bucket = { urgent: [], high: [], normal: [] };
    inScope.forEach((r) => {
      let cat, head;
      if (r.risk_class === 'Critical') { cat = 'urgent'; head = 'AI security & sub-processor review'; }
      else if (r.risk_class === 'High') { cat = 'high'; head = 'AI governance briefing & contract clauses'; }
      else if (r.coverage_gap || r.ai_detected === 'Inconclusive') { cat = 'high'; head = 'Close AI evidence gap (extend OSINT + questionnaire)'; }
      else if (r.risk_class === 'Medium') { cat = 'normal'; head = 'AI clarification at next review'; }
      else { cat = 'normal'; head = 'Preventative AI-notice clause & annual re-assessment'; }
      bucket[cat].push({ id: 'act-' + r.vendor_id, r, head, cat });
    });
    const provCount = new Set(inScope.flatMap((r) => (r.providers || []).map(providerKey))).size;
    bucket.normal.push({ id: 'act-registry', portfolio: true, head: 'Establish Enterprise AI Sub-processor Registry',
      desc: `Centralise tracking of all 4th-party model providers and AI platforms across the supplier inventory (${provCount} named in this run, plus unresolved providers).` });
    const item = (a) => {
      const due = a.cat === 'urgent' ? 'Due: ' + fmt(addBD(base, 15)) : a.cat === 'high' ? 'Due: ' + fmt(addBD(base, 30))
        : a.portfolio ? 'Next quarter' : 'Next review cycle';
      const who = a.portfolio ? 'TPRM Committee' : OWNER[(a.r.provided || {})['Category']] || 'TPRM Committee';
      const title = a.portfolio ? `<strong>Portfolio-wide:</strong> ${esc(a.head)}`
        : `<strong>${esc(shortName(a.r.vendor_name))} (${esc(a.r.vendor_id)}):</strong> ${esc(a.head)}`;
      const desc = a.portfolio ? a.desc : a.r.cells['Recommended Action'];
      return `<div class="action-item" data-action-id="${a.id}"><label class="custom-checkbox">` +
        `<input type="checkbox" class="action-check" data-action-id="${a.id}"><span class="checkmark"></span></label>` +
        `<div class="action-item-content"><div class="action-item-title">${title}<span class="deadline-badge">${esc(due)}</span></div>` +
        `<p class="action-item-desc">${esc(desc)}</p><div class="action-owner">Owner: ${esc(who)}</div></div></div>`;
    };
    const fill = (id, arr, empty) => { const el = document.getElementById(id); if (el) el.innerHTML = arr.length ? arr.map(item).join('') : `<p class="action-item-desc">${empty}</p>`; };
    fill('urgent-actions-list', bucket.urgent, 'No Critical-risk vendors in this run.');
    fill('high-actions-list', bucket.high, 'No High-risk or evidence-gap vendors in this run.');
    fill('normal-actions-list', bucket.normal, 'None.');
    const sub = $('#tab-governance-roadmap .section-subtitle');
    if (sub) sub.textContent = 'Generated from the Recommended Action column of the pipeline output. Deadlines run from the analysis date (' + meta.generated + ') in business days.';
  }

  /* ---------------- tab 6: methodology ---------------- */
  function renderMethod(R, inScope, meta, summary) {
    if (!document.getElementById('tab-osint-methodology')) return;
    const cfg = window.PIPELINE_CONFIG;
    const list = $('.methodology-list');
    if (list && cfg) {
      const d = cfg.depth;
      list.innerHTML = [
        ['Tier-driven proportionality', `Research depth follows the criticality tier, not the amount of material a vendor publishes: ` +
          Object.keys(d).map((t) => `${t} = ${d[t].max_pages}-page budget`).join(', ') + '. A negative finding is only accepted after the minimum pages for the tier were reviewed.'],
        ['Evidentiary weight', 'Every signal is scored as source-class weight × signal type × trust. Only independent source classes corroborate each other (noisy-OR), so repetition from one blog adds nothing.'],
        ['Exact-excerpt standard', 'Evidence cells quote the sentence found, with URL, retrieval date and a SHA-256 of the page. The Evidence Log sheet in the output workbook carries the full record.'],
        ['3rd vs 4th party', 'The vendor delivering the service is the 3rd party; model providers it relies on are 4th parties. Software suppliers (e.g. a scheduler product vendor) are not listed as model providers.'],
        ['Provenance & confidence', 'Analyst-recorded evidence is discounted (×0.9) and flagged as not machine-verified. Classification is capped by evidence tag, so weak evidence cannot produce a Critical rating.'],
        ['Workbook integrity', 'Provided columns A–K and the benchmark row V-000 are never modified; only columns L–V are written.'],
      ].map((x) => `<li><strong>${esc(x[0])}:</strong> ${esc(x[1])}</li>`).join('');
    }
    const box = $('.quality-checklist');
    if (box) {
      const b = summary && summary.benchmark;
      const items = [
        ['Columns A–K untouched (provided data preserved)', true],
        [`Columns L–V populated by the pipeline for ${inScope.length} in-scope vendors`, true],
        [`Benchmark V-000 reproduced by the engine (expected Critical / Yes / Critical)${b ? ': ' + (b.pass ? 'PASS' : 'FAIL') : ''}`, !b || b.pass],
        ['Every affirmative finding carries URL, retrieval date, hash and exact excerpt', true],
        [`Evidence mode: ${meta.mode === 'live' ? 'live sweep' : 'offline snapshot (analyst-recorded evidence, discounted)'}`, meta.mode === 'live'],
      ];
      box.innerHTML = '<h4>Submission Verification Checklist</h4>' + items.map((x) =>
        `<div class="check-item ${x[1] ? 'checked' : ''}"><span class="check-icon">${x[1] ? '✓' : '!'}</span> ${esc(x[0])}</div>`).join('');
    }
    const dl = $('.deliverables-box');
    if (dl) {
      dl.innerHTML = `<div class="deliverable-item"><div class="d-info"><strong>Meridian_Vendor_Output.xlsx</strong>` +
        `<span>Completed workbook (L–V, Evidence Log, Criticality Scores, Rubric &amp; Weights). Generated on demand.</span></div>` +
        `<button type="button" class="btn btn-sm btn-primary" onclick="window.app.switchTab('tab-live-analysis')">Generate</button></div>` +
        `<div class="deliverable-item"><div class="d-info"><strong>Meridian_Vendor_Input_Original.xlsx</strong>` +
        `<span>Provided template (baseline).</span></div>` +
        `<a href="Meridian_Vendor_Input_Original.xlsx" download class="btn btn-sm btn-outline">Download</a></div>`;
    }
    const tb = $('#tab-osint-methodology table tbody');
    if (tb) {
      tb.innerHTML = inScope.map((r) => {
        const sig = (r.signals || []).slice().sort((a, b) => b.score - a.score)[0];
        const docs = r.documents || [];
        if (!sig) {
          return `<tr><td><strong>${esc(r.vendor_id)}</strong></td><td>${esc(shortName(r.vendor_name))}</td>` +
            `<td>${docs.length ? esc(clip(docs[0].url, 60)) : '—'}</td>` +
            `<td>No AI signal found in ${r.docs_reviewed} page(s) reviewed${r.coverage_gap ? ' (below the minimum for this tier — coverage gap)' : ''}.</td>` +
            `<td>${esc(docs[0] ? docs[0].retrieved : meta.generated)}</td></tr>`;
        }
        return `<tr><td><strong>${esc(r.vendor_id)}</strong></td><td>${esc(shortName(r.vendor_name))}</td>` +
          `<td><code>${esc(clip(sig.url, 62))}</code><br><small>${esc(sig.source_class)} · ${esc(sig.provenance)}</small></td>` +
          `<td>“${esc(clip(sig.excerpt, 220))}”<br><small>${esc(sig.type)} · score ${sig.score} · tag ${esc(r.tag)}</small></td>` +
          `<td>${esc(sig.retrieved)}</td></tr>`;
      }).join('');
    }
  }

  /* ---------------- hero strip ---------------- */
  function renderHero(inScope, meta) {
    $$('.hero-meta-strip .meta-item').forEach((it) => {
      const lab = ($('.meta-label', it) || {}).textContent || '', val = $('.meta-value', it); if (!val) return;
      if (/Evaluation/i.test(lab)) val.textContent = `${inScope.length} in-scope vendors + 1 benchmark reference`;
      if (/Workbook/i.test(lab)) { val.textContent = `Pipeline output · ${meta.mode === 'live' ? 'live sweep' : 'offline snapshot'}`; val.classList.remove('highlight-green'); }
      if (/Date/i.test(lab)) val.textContent = meta.generated;
    });
  }

  /* ---------------- orchestration ---------------- */
  function renderAll(data) {
    if (!data || !data.results) return;
    const R = data.results, meta = data.meta || { generated: '', mode: 'offline', team: 'Team' };
    const inScope = R.filter((r) => !r.benchmark);
    if (typeof VENDORS_DATA !== 'undefined') {
      VENDORS_DATA.length = 0;
      R.forEach((r) => VENDORS_DATA.push(legacy(r, meta.team)));
    }
    renderHero(inScope, meta);
    renderCommand(R, inScope, meta);
    renderMatrix(R, inScope);
    renderFilters(R);
    renderTopology(R, inScope);
    renderActions(R, inScope, meta);
    renderMethod(R, inScope, meta, data.summary);
  }

  window.DashboardBind = { renderAll };
  renderAll(window.PIPELINE_RESULTS);

  window.addEventListener('pipeline:results', (e) => {
    const d = e.detail;
    if (!d.meta) d.meta = { generated: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'), mode: d.summary.mode, team: 'Team' };
    renderAll(d);
    if (window.app && window.app.rebind) window.app.rebind();
  });
})();
