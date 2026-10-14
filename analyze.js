/* Live Analysis + Solution Design tabs. Talks to server.py (python server.py). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pill = (v) => `<span class="la-pill p-${esc(String(v).replace(/\s+/g, '-'))}">${esc(v)}</span>`;
  let current = null;

  /* ---------- Solution Design: render rubric/source tables from config ---------- */
  function loadConfig() {
    if (!$('sd-rubric-body')) return;   // Solution Design lives in the deck, not the site
    const render = (cfg) => {
      const w = cfg.criticality_weights;
      const th = cfg.tier_thresholds.map((t) => `${t[0]} &ge; ${t[1]}`).join(' &middot; ');
      const factors = {
        data_sensitivity: 'Sensitivity of data accessed (tax IDs, full customer master = 4)',
        operational_dependency: 'Operational dependency column (Critical/Total = 4)',
        payment_flow: 'Involvement in payment flows (payments category = 4)',
        regulatory_exposure: 'Regulatory exposure (tax, clearing, core banking = 4)',
        data_volume: 'Volume (>=100M = 4, >=10M = 3, >=1M = 2)',
      };
      let h = '<div class="la-grid2"><div><table class="la-table"><thead><tr><th>Factor</th><th>Weight</th><th>How scored (1-4)</th></tr></thead><tbody>';
      Object.keys(w).forEach((k) => {
        h += `<tr style="cursor:default"><td><strong>${esc(k.replace(/_/g, ' '))}</strong></td><td>${Math.round(w[k] * 100)}%</td><td>${esc(factors[k] || '')}</td></tr>`;
      });
      h += `</tbody></table><p class="la-p" style="margin-top:.7rem">Tier thresholds (weighted score): ${th}</p>`;
      h += '<p class="la-p"><b>Hard floors:</b></p><ul class="la-kv">';
      cfg.floors.forEach((f) => { h += `<li>${pill(f.tier)} ${esc(f.why)}</li>`; });
      h += '</ul></div><div><table class="la-table"><thead><tr><th>Tier</th><th>Depth</th><th>Pages</th><th>Stop rule</th></tr></thead><tbody>';
      Object.keys(cfg.depth).forEach((t) => {
        const d = cfg.depth[t];
        h += `<tr style="cursor:default"><td>${pill(t)}</td><td>${esc(d.label)}</td><td>${d.max_pages}</td><td>${esc(d.stop_rule)}</td></tr>`;
      });
      h += '</tbody></table></div></div>';
      $('sd-rubric-body').className = '';
      $('sd-rubric-body').innerHTML = h;

      let s = '<div class="la-grid2"><div><table class="la-table"><thead><tr><th>Source class</th><th>Weight</th><th>Why</th></tr></thead><tbody>';
      Object.keys(cfg.source_classes).forEach((k) => {
        const c = cfg.source_classes[k];
        s += `<tr style="cursor:default"><td><strong>${esc(k)}</strong></td><td><span class="la-bar"><i style="width:${c.weight * 100}%"></i></span>${c.weight}</td><td>${esc(c.why)}</td></tr>`;
      });
      s += '</tbody></table></div><div><table class="la-table"><thead><tr><th>Signal type</th><th>Multiplier</th></tr></thead><tbody>';
      Object.keys(cfg.signal_types).forEach((k) => {
        s += `<tr style="cursor:default"><td>${esc(k)}</td><td>${cfg.signal_types[k]}</td></tr>`;
      });
      s += '</tbody></table><p class="la-p" style="margin-top:.7rem"><b>Signal score</b> = source weight &times; type multiplier &times; trust. '
        + 'Independent source <i>classes</i> are combined with noisy-OR, so ten lines from one blog count as one voice. '
        + '<b>Tags:</b> ' + cfg.tag_rules.map((t) => `${t[0]} &ge; ${t[1]}`).join(', ')
        + '. A "Confirmed" tag additionally needs one strong signal (deployment / feature / partnership) from a source weighted &ge; 0.7.</p>'
        + '<p class="la-p"><b>AI risk</b> severity = 0.4&times;tier + 0.4&times;data sensitivity + 0.2&times;AI role; the class is then capped by evidence confidence: '
        + Object.keys(cfg.confidence_cap).map((k) => `${k} &rarr; max ${cfg.confidence_cap[k]}`).join(', ') + '.</p></div></div>';
      $('sd-sources-body').className = '';
      $('sd-sources-body').innerHTML = s;
    };
    if (window.PIPELINE_CONFIG) { render(window.PIPELINE_CONFIG); return; }
    fetch('/api/config').then((r) => r.json()).then(render).catch(() => {
      ['sd-rubric-body', 'sd-sources-body'].forEach((id) => {
        $(id).textContent = 'Start the app with "python server.py" to render the live configuration.';
      });
    });
  }

  /* ---------- Live Analysis ---------- */
  function setBusy(b) { $('la-run').disabled = b; $('la-run').textContent = b ? 'Running...' : 'Run analysis'; }

  async function run() {
    const msg = $('la-server-msg');
    msg.classList.add('hidden');
    const fd = new FormData();
    const f = $('la-file').files[0];
    if (f) fd.append('file', f);
    fd.append('mode', $('la-mode').value);
    fd.append('team', $('la-team').value || 'Team');
    setBusy(true);
    $('la-results').classList.add('hidden');
    $('la-download').classList.add('hidden');
    $('la-log').classList.remove('hidden');
    $('la-progress-wrap').classList.remove('hidden');
    $('la-log').textContent = '';
    $('la-progress-bar').style.width = '2%';
    let job;
    try {
      const r = await fetch('/api/analyze', { method: 'POST', body: fd });
      job = await r.json();
      if (!r.ok) throw new Error(job.error || r.statusText);
    } catch (e) {
      setBusy(false);
      msg.className = 'la-note err';
      msg.innerHTML = 'Could not reach the analysis server (' + esc(e.message) + '). Start it with <code>python server.py</code> '
        + 'and open <code>http://127.0.0.1:5000</code>; opening index.html as a file cannot run the pipeline.';
      return;
    }
    poll(job.job_id);
  }

  async function poll(id) {
    try {
      const j = await (await fetch('/api/job/' + id)).json();
      $('la-log').textContent = j.log.join('\n');
      $('la-log').scrollTop = $('la-log').scrollHeight;
      $('la-progress-bar').style.width = Math.max(j.progress, 3) + '%';
      if (j.status === 'running') { setTimeout(() => poll(id), 1000); return; }
      setBusy(false);
      if (j.status === 'error') {
        $('la-server-msg').className = 'la-note err';
        $('la-server-msg').textContent = 'Analysis failed: ' + j.error;
        return;
      }
      current = j.result;
      const dl = $('la-download');
      dl.href = '/api/download/' + id;
      dl.classList.remove('hidden');
      renderResults(j.result);
      j.result.meta = { generated: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'), mode: j.result.summary.mode, team: $('la-team').value || 'Team' };
      window.dispatchEvent(new CustomEvent('pipeline:results', { detail: j.result }));
      const note = $('la-server-msg');
      note.className = 'la-note';
      note.textContent = 'Dashboard tabs (Command Center, Risk Matrix, Inventory, 4th-Party Chain, Action Tracker, Methodology) now show this run.';
    } catch (e) {
      setBusy(false);
    }
  }

  function renderResults(data) {
    const s = data.summary;
    const b = s.benchmark;
    $('la-tiles').innerHTML = [
      ['Vendors analysed', s.vendors, ''],
      ['AI usage: Yes', s.ai_yes, ''],
      ['AI usage: No', s.ai_no, ''],
      ['Inconclusive', s.ai_inconclusive, s.ai_inconclusive ? 'bad' : ''],
      ['Critical tier', s.critical_tier, ''],
      ['Critical / High AI risk', s.high_or_critical_risk, ''],
      ['Benchmark V-000 check', b ? (b.pass ? 'PASS' : 'FAIL') : 'n/a', b && b.pass ? 'ok' : 'bad'],
    ].map((t) => `<div class="la-tile ${t[2]}"><b>${esc(t[1])}</b><span>${esc(t[0])}</span></div>`).join('');

    const tb = $('la-table').querySelector('tbody');
    tb.innerHTML = data.results.map((r, i) => `
      <tr data-i="${i}">
        <td><strong>${esc(r.vendor_id)}</strong><br>${esc(r.vendor_name.replace(/^EXAMPLE VENDOR .\s*/, '').slice(0, 42))}${r.benchmark ? ' <span class="la-flag">benchmark</span>' : ''}</td>
        <td>${pill(r.tier)}<br><small>${r.criticality_score}/4</small></td>
        <td>${esc(r.depth)}<br><small>${r.docs_reviewed} page(s) reviewed</small></td>
        <td>${pill(r.ai_detected)}</td>
        <td>${pill(r.tag)}</td>
        <td><span class="la-bar"><i style="width:${Math.round(r.usage_score * 100)}%"></i></span>${r.usage_score}</td>
        <td>${r.source_classes.length ? r.source_classes.map((c) => `<span class="la-flag">${esc(c)}</span>`).join('') : '<small>none</small>'}</td>
        <td>${r.providers.length ? esc(r.providers.join('; ')) : '<small>none named</small>'}</td>
        <td>${pill(r.risk_class)}</td>
        <td>${r.flags.map((f) => `<span class="la-flag ${/COVERAGE|NOT_MACHINE/.test(f) ? 'warn' : ''}">${esc(f.replace(/_/g, ' ').toLowerCase())}</span>`).join('')}</td>
      </tr>`).join('');
    tb.querySelectorAll('tr').forEach((tr) => tr.addEventListener('click', () => showDetail(data.results[+tr.dataset.i])));
    $('la-results').classList.remove('hidden');
    $('la-detail').classList.add('hidden');
  }

  function showDetail(r) {
    const f = r.factors;
    const fx = Object.keys(f).map((k) => `<div>${esc(k.replace(/_/g, ' '))}: <b>${f[k]}</b>/4</div>`).join('');
    const sig = r.signals.slice().sort((a, b) => b.score - a.score).slice(0, 12).map((s) => `
      <div class="la-quote">
        <span class="la-pill p-Low">${esc(s.type)}</span>
        <small> ${esc(s.source_class)} &times; ${s.source_weight} &middot; trust ${s.trust} &middot; <b>score ${s.score}</b>
        &middot; ${esc(s.provenance)} &middot; retrieved ${esc(s.retrieved)}${s.llm_assisted ? ' &middot; LLM-assisted' : ''}</small><br>
        &ldquo;${esc(s.excerpt)}&rdquo;<br><small>${esc(s.url)} &middot; sha256 ${esc(s.sha256)}</small>
      </div>`).join('') || '<div class="la-note">No AI signal found in the documents reviewed.</div>';
    const docs = r.documents.map((d) => `<li>${esc(d.title || d.url)} <small>&mdash; ${esc(d.source_class)}, ${esc(d.provenance)}</small></li>`).join('');
    $('la-detail').innerHTML = `
      <h3 class="la-h3">${esc(r.vendor_id)} &mdash; ${esc(r.vendor_name)}</h3>
      <div class="la-grid2">
        <div class="la-kv"><b>Criticality</b> ${pill(r.tier)} score ${r.criticality_score}/4${fx}
          ${r.floors.length ? '<div><b>Floors applied:</b> ' + esc(r.floors.join(' ')) + '</div>' : ''}
          <p>${esc(r.cells['Criticality Rationale'])}</p></div>
        <div class="la-kv"><b>AI risk</b> ${pill(r.risk_class)} severity ${r.severity}/4, role: ${esc(r.ai_role)}
          <p>${esc(r.cells['Risk Rationale'])}</p>
          <p><b>Recommended action:</b> ${esc(r.cells['Recommended Action'])}</p></div>
      </div>
      <h3 class="la-h3" style="margin-top:1rem">Evidence (strongest first)</h3>${sig}
      <h3 class="la-h3" style="margin-top:1rem">Documents reviewed (${r.documents.length})</h3><ul class="la-kv">${docs}</ul>
      ${r.errors.length ? '<p class="la-muted">' + r.errors.length + ' page(s) unavailable, disallowed or rejected as error/duplicate pages (see Evidence Log).</p>' : ''}`;
    $('la-detail').classList.remove('hidden');
    $('la-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    const btn = $('la-run');
    if (btn) btn.addEventListener('click', run);
  });
})();
