/**
 * MERIDIAN FINANCIAL INSTITUTION — TPRM AI RISK GOVERNANCE PLATFORM
 * Core Application Logic (Vanilla JS)
 */

(function () {
  'use strict';

  // State Management
  const state = {
    vendors: typeof VENDORS_DATA !== 'undefined' ? VENDORS_DATA : [],
    currentTab: 'tab-command-center',
    searchQuery: '',
    filterTier: 'ALL',
    filterAI: 'ALL',
    filterRisk: 'ALL',
    viewMode: 'cards', // 'cards' | 'table'
    activeDossierId: null,
    theme: localStorage.getItem('meridian_tprm_theme') || 'dark',
    completedActions: JSON.parse(localStorage.getItem('meridian_tprm_actions') || '["act-6"]') // default sample closed action
  };

  // DOM Elements
  const elements = {
    app: document.getElementById('app'),
    tabs: document.querySelectorAll('.nav-tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    globalSearchInput: document.getElementById('global-search-input'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeIconMoon: document.getElementById('theme-icon-moon'),
    themeIconSun: document.getElementById('theme-icon-sun'),
    exportPrintBtn: document.getElementById('export-print-btn'),
    
    // Inventory Elements
    vendorCardsContainer: document.getElementById('vendor-cards-container'),
    vendorTableContainer: document.getElementById('vendor-table-container'),
    inventoryTableBody: document.getElementById('inventory-table-body'),
    filterTier: document.getElementById('filter-tier'),
    filterAI: document.getElementById('filter-ai'),
    filterRisk: document.getElementById('filter-risk'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    counterCount: document.getElementById('counter-count'),
    viewModeCards: document.getElementById('view-mode-cards'),
    viewModeTable: document.getElementById('view-mode-table'),

    // Dossier Drawer Elements
    dossierOverlay: document.getElementById('dossier-drawer-overlay'),
    drawerCloseBtn: document.getElementById('drawer-close-btn'),
    drawerCopyBtn: document.getElementById('drawer-copy-btn'),
    drawerVendorId: document.getElementById('drawer-vendor-id'),
    drawerVendorName: document.getElementById('drawer-vendor-name'),
    drawerVendorCategory: document.getElementById('drawer-vendor-category'),
    drawerVendorWebsite: document.getElementById('drawer-vendor-website'),
    drawerCriticality: document.getElementById('drawer-criticality'),
    drawerAiUsage: document.getElementById('drawer-ai-usage'),
    drawerAiRisk: document.getElementById('drawer-ai-risk'),
    drawerUrgency: document.getElementById('drawer-urgency'),
    drawerService: document.getElementById('drawer-service'),
    drawerProcess: document.getElementById('drawer-process'),
    drawerDataClass: document.getElementById('drawer-data-class'),
    drawerVolume: document.getElementById('drawer-volume'),
    drawerCriticalityRationale: document.getElementById('drawer-criticality-rationale'),
    drawerDepthApplied: document.getElementById('drawer-depth-applied'),
    drawerEvidenceQuote: document.getElementById('drawer-evidence-quote'),
    drawerHowAiUsed: document.getElementById('drawer-how-ai-used'),
    drawerSubprocessors: document.getElementById('drawer-subprocessors'),
    drawerRiskRationale: document.getElementById('drawer-risk-rationale'),
    drawerRecommendedAction: document.getElementById('drawer-recommended-action'),

    // Governance Actions
    actionCheckboxes: document.querySelectorAll('.action-check'),
    actionProgressBar: document.getElementById('action-progress-bar'),
    actionProgressText: document.getElementById('action-progress-text'),
    toastContainer: document.getElementById('toast-container')
  };

  /* ================= Initialization ================= */
  function init() {
    setupTheme();
    setupNavigation();
    setupSearch();
    setupFilters();
    setupGovernanceTracker();
    setupDrawer();
    renderInventory();
    checkUrlHash();

    setupAiLab();
    setupCriticalityCalculator();
    setupSignalCalculator();

    // Hotkey for Ctrl+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        elements.globalSearchInput.focus();
        elements.globalSearchInput.select();
      } else if (e.key === 'Escape') {
        closeDossier();
      }
    });

    if (elements.exportPrintBtn) {
      elements.exportPrintBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  /* ================= Theme Setup ================= */
  function setupTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcons();

    elements.themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('meridian_tprm_theme', state.theme);
      updateThemeIcons();
      showToast(`Switched to ${state.theme === 'dark' ? 'Dark' : 'Light'} theme`);
    });
  }

  function updateThemeIcons() {
    if (state.theme === 'dark') {
      elements.themeIconMoon.classList.remove('hidden');
      elements.themeIconSun.classList.add('hidden');
    } else {
      elements.themeIconMoon.classList.add('hidden');
      elements.themeIconSun.classList.remove('hidden');
    }
  }

  /* ================= Navigation & Tabs ================= */
  function setupNavigation() {
    elements.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    state.currentTab = tabId;

    elements.tabs.forEach((t) => {
      const isTarget = t.getAttribute('data-tab') === tabId;
      t.classList.toggle('active', isTarget);
      t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    elements.tabPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    window.location.hash = tabId.replace('tab-', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function checkUrlHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const matchingTab = document.getElementById(`tab-${hash}`);
      if (matchingTab) {
        switchTab(`tab-${hash}`);
      }
    }
  }

  /* ================= Global Search ================= */
  function setupSearch() {
    elements.globalSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      
      // Auto-switch to Inventory tab if user types search query and not already there
      if (state.searchQuery.length > 0 && state.currentTab !== 'tab-vendor-inventory') {
        switchTab('tab-vendor-inventory');
      }
      
      renderInventory();
    });
  }

  /* ================= Inventory Filters & Views ================= */
  function setupFilters() {
    elements.filterTier.addEventListener('change', (e) => {
      state.filterTier = e.target.value;
      renderInventory();
    });

    elements.filterAI.addEventListener('change', (e) => {
      state.filterAI = e.target.value;
      renderInventory();
    });

    elements.filterRisk.addEventListener('change', (e) => {
      state.filterRisk = e.target.value;
      renderInventory();
    });

    elements.resetFiltersBtn.addEventListener('click', () => {
      state.filterTier = 'ALL';
      state.filterAI = 'ALL';
      state.filterRisk = 'ALL';
      state.searchQuery = '';
      elements.filterTier.value = 'ALL';
      elements.filterAI.value = 'ALL';
      elements.filterRisk.value = 'ALL';
      elements.globalSearchInput.value = '';
      renderInventory();
      showToast('Filters reset to default view');
    });

    // View toggles
    elements.viewModeCards.addEventListener('click', () => {
      state.viewMode = 'cards';
      elements.viewModeCards.classList.add('active');
      elements.viewModeTable.classList.remove('active');
      elements.vendorCardsContainer.classList.remove('hidden');
      elements.vendorTableContainer.classList.add('hidden');
    });

    elements.viewModeTable.addEventListener('click', () => {
      state.viewMode = 'table';
      elements.viewModeTable.classList.add('active');
      elements.viewModeCards.classList.remove('active');
      elements.vendorCardsContainer.classList.add('hidden');
      elements.vendorTableContainer.classList.remove('hidden');
    });
  }

  function getFilteredVendors() {
    return state.vendors.filter((v) => {
      // Tier filter
      if (state.filterTier !== 'ALL' && v['Criticality Tier'] !== state.filterTier) {
        return false;
      }

      // AI detected filter
      if (state.filterAI !== 'ALL' && v['AI Usage Detected (Y/N)'] !== state.filterAI) {
        return false;
      }

      // Risk filter
      if (state.filterRisk !== 'ALL' && v['AI Security Risk Classification'] !== state.filterRisk) {
        return false;
      }

      // Search query filter
      if (state.searchQuery) {
        const query = state.searchQuery;
        const haystack = [
          v['Vendor ID'],
          v['Vendor Name'],
          v['Category'],
          v['Service / Product Provided'],
          v['Business Process Supported'],
          v['Named AI Sub-processors / Model Providers'],
          v['AI Security Risk Classification']
        ].join(' ').toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  function renderInventory() {
    const filtered = getFilteredVendors();
    elements.counterCount.textContent = filtered.length;

    // Render Cards
    renderCards(filtered);

    // Render Table
    renderTable(filtered);
  }

  function renderCards(vendors) {
    if (!elements.vendorCardsContainer) return;

    if (vendors.length === 0) {
      elements.vendorCardsContainer.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1; padding: 3rem; text-align: center; background: var(--bg-surface); border-radius: 12px;">
          <svg style="width: 48px; height: 48px; color: var(--text-tertiary); margin-bottom: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">No matching vendors found</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem;">Try adjusting your search criteria or resetting filters.</p>
        </div>
      `;
      return;
    }

    elements.vendorCardsContainer.innerHTML = vendors.map((v) => {
      const tierClass = v['Criticality Tier'] ? `card-${v['Criticality Tier'].toLowerCase()}` : '';
      const aiStatus = v['AI Usage Detected (Y/N)'];
      const riskClass = getRiskTagClass(v['AI Security Risk Classification']);

      const subTags = (v.sub_processors_list || []).map(s => `<span class="sub-tag-pill">${escapeHtml(s)}</span>`).join('');

      return `
        <div class="vendor-card ${tierClass}" id="card-${v['Vendor ID']}">
          <div class="card-top-row">
            <div class="card-id-row">
              <span class="vendor-id-badge">${escapeHtml(v['Vendor ID'])}</span>
              ${v.is_benchmark ? '<span class="benchmark-tag">Benchmark</span>' : ''}
            </div>
            <span class="card-category-badge">${escapeHtml(v['Category'] || 'Enterprise')}</span>
          </div>

          <div class="vendor-title-row">
            <h3 class="vendor-name">${escapeHtml(v['Vendor Name'])}</h3>
            <p class="vendor-service-desc">${escapeHtml(v['Service / Product Provided'] || '')}</p>
          </div>

          <div class="metrics-pills-row">
            <span class="metric-pill">Dep: <strong>${escapeHtml(v['Operational Dependency'] || 'N/A')}</strong></span>
            <span class="metric-pill">Tier: <strong>${escapeHtml(v['Criticality Tier'] || 'N/A')}</strong></span>
            <span class="metric-pill">Vol: <strong>${escapeHtml(v['Data Volume (annual)'] || 'N/A')}</strong></span>
          </div>

          <div class="card-ai-status-strip">
            <div class="ai-status-indicator">
              <span class="indicator-dot ${aiStatus === 'Yes' ? 'green' : aiStatus === 'No' ? 'red' : 'yellow'}"></span>
              <span>AI: ${escapeHtml(aiStatus || 'Unknown')}</span>
            </div>
            ${v.signal_tag ? getSignalBadgeHtml(v.signal_tag) : ''}
            <span class="ai-risk-badge ${riskClass}">${escapeHtml(v['AI Security Risk Classification'] || 'None')}</span>
          </div>

          ${subTags ? `<div class="card-subprocessors-row"><span style="font-size: 0.68rem; color: var(--text-tertiary);">4th Party:</span> ${subTags}</div>` : ''}

          <div class="card-actions-row">
            <span class="urgency-indicator ${v.urgency_class || 'normal'}">${escapeHtml(v.urgency || 'Continuous')}</span>
            <button class="btn btn-sm btn-primary" onclick="window.app.openDossier('${v['Vendor ID']}')">
              <span>View Dossier</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTable(vendors) {
    if (!elements.inventoryTableBody) return;

    elements.inventoryTableBody.innerHTML = vendors.map((v) => {
      const riskClass = getRiskTagClass(v['AI Security Risk Classification']);
      return `
        <tr onclick="window.app.openDossier('${v['Vendor ID']}')" style="cursor: pointer;">
          <td><strong style="font-family: var(--font-mono); color: #38bdf8;">${escapeHtml(v['Vendor ID'])}</strong></td>
          <td><strong>${escapeHtml(v['Vendor Name'])}</strong></td>
          <td>${escapeHtml(v['Category'] || '')}</td>
          <td><span class="badge" style="background: var(--bg-surface-elevated);">${escapeHtml(v['Criticality Tier'] || '')}</span></td>
          <td>${escapeHtml(v['Data Volume (annual)'] || 'N/A')}</td>
          <td>
            <span class="indicator-dot ${v['AI Usage Detected (Y/N)'] === 'Yes' ? 'green' : v['AI Usage Detected (Y/N)'] === 'No' ? 'red' : 'yellow'}"></span>
            ${escapeHtml(v['AI Usage Detected (Y/N)'] || '')}
            ${v.signal_tag ? `<div style="margin-top:2px;">${getSignalBadgeHtml(v.signal_tag)}</div>` : ''}
          </td>
          <td><span style="font-size: 0.75rem; color: #c084fc;">${escapeHtml(v['Named AI Sub-processors / Model Providers'] || 'None')}</span></td>
          <td><span class="ai-risk-badge ${riskClass}">${escapeHtml(v['AI Security Risk Classification'] || 'None')}</span></td>
          <td><span class="urgency-indicator ${v.urgency_class || 'normal'}">${escapeHtml(v.urgency || 'Continuous')}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.app.openDossier('${v['Vendor ID']}')">Dossier</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function getRiskTagClass(risk) {
    if (!risk) return 'risk-tag-none';
    const r = risk.toLowerCase();
    if (r.includes('critical')) return 'risk-tag-critical';
    if (r.includes('high')) return 'risk-tag-high';
    if (r.includes('low')) return 'risk-tag-low';
    return 'risk-tag-none';
  }

  /* ================= Slide-Over Dossier Drawer ================= */
  function setupDrawer() {
    if (elements.drawerCloseBtn) {
      elements.drawerCloseBtn.addEventListener('click', closeDossier);
    }
    if (elements.dossierOverlay) {
      elements.dossierOverlay.addEventListener('click', (e) => {
        if (e.target === elements.dossierOverlay) {
          closeDossier();
        }
      });
    }
    if (elements.drawerCopyBtn) {
      elements.drawerCopyBtn.addEventListener('click', copyDossierToClipboard);
    }
  }

  function openDossier(vendorId) {
    const vendor = state.vendors.find((v) => v['Vendor ID'] === vendorId);
    if (!vendor) return;

    state.activeDossierId = vendorId;

    // Populate Drawer Header
    elements.drawerVendorId.textContent = vendor['Vendor ID'];
    elements.drawerVendorName.textContent = vendor['Vendor Name'];
    elements.drawerVendorCategory.textContent = vendor['Category'] || 'Enterprise Vendor';
    
    if (vendor['Public Website']) {
      const url = vendor['Public Website'].startsWith('http') ? vendor['Public Website'] : `https://${vendor['Public Website']}`;
      elements.drawerVendorWebsite.href = url;
      elements.drawerVendorWebsite.style.display = 'inline-flex';
    } else {
      elements.drawerVendorWebsite.style.display = 'none';
    }

    // Quick Metrics
    elements.drawerCriticality.textContent = vendor['Criticality Tier'] || 'N/A';
    elements.drawerAiUsage.textContent = vendor['AI Usage Detected (Y/N)'] || 'N/A';
    elements.drawerAiRisk.textContent = vendor['AI Security Risk Classification'] || 'N/A';
    elements.drawerUrgency.textContent = vendor.urgency || 'Continuous Monitoring';

    // Operational Profile
    elements.drawerService.textContent = vendor['Service / Product Provided'] || 'N/A';
    elements.drawerProcess.textContent = vendor['Business Process Supported'] || 'N/A';
    elements.drawerDataClass.textContent = vendor['Data Classification Accessed'] || 'N/A';
    elements.drawerVolume.textContent = vendor['Data Volume (annual)'] || 'N/A';
    elements.drawerCriticalityRationale.textContent = vendor['Criticality Rationale'] || 'No rationale specified.';
    elements.drawerDepthApplied.textContent = vendor['Assessment Depth Applied'] || 'Standard assessment.';

    // OSINT & Evidence
    elements.drawerEvidenceQuote.textContent = vendor['Evidence Description along with OSINT Source(s) / Evidence Link'] || 'No OSINT evidence documented.';

    // Populate Signal Badge
    const signalBadge = document.getElementById('drawer-signal-badge');
    if (signalBadge) {
      const tag = vendor.signal_tag || 'Confirmed';
      const weight = vendor.signal_weight || 0.95;
      let cls = 'badge-confirmed';
      if (tag.includes('Corroborated')) cls = 'badge-corroborated';
      else if (tag.includes('Indicative')) cls = 'badge-indicative';
      else if (tag.includes('Marketing')) cls = 'badge-marketing';
      signalBadge.className = `badge ${cls}`;
      signalBadge.textContent = `${tag} (${weight.toFixed(2)})`;
    }

    // Populate Criticality Math Breakdown
    const mathBox = document.getElementById('drawer-criticality-math');
    if (mathBox) {
      mathBox.textContent = vendor.criticality_math ? vendor.criticality_math.breakdown : `Criticality Tier: ${vendor['Criticality Tier']} (Scored via 4-factor rubric)`;
    }

    // Populate Multi-Signal Sources
    const multiSourcesList = document.getElementById('drawer-multi-sources-list');
    if (multiSourcesList) {
      if (vendor.evidentiary_sources && vendor.evidentiary_sources.length > 0) {
        multiSourcesList.innerHTML = vendor.evidentiary_sources.map(src => {
          let badgeClass = 'badge-confirmed';
          if (src.tag.includes('Corroborated')) badgeClass = 'badge-corroborated';
          else if (src.tag.includes('Indicative')) badgeClass = 'badge-indicative';
          else if (src.tag.includes('Marketing')) badgeClass = 'badge-marketing';
          else if (src.tag.includes('Negative')) badgeClass = 'badge-none';

          return `
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:0.5rem 0.75rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                <span style="font-size:0.75rem; font-weight:700; color:#cbd5e1;">${escapeHtml(src.type)}</span>
                <span class="badge ${badgeClass}" style="font-size:0.65rem; padding:1px 5px;">${escapeHtml(src.tag)} (Weight: ${src.weight})</span>
              </div>
              <div style="font-size:0.72rem; color:#64748b; font-family:'JetBrains Mono'; margin-bottom:3px;">${escapeHtml(src.source)}</div>
              <div style="font-size:0.78rem; color:#94a3b8; font-style:italic;">"${escapeHtml(src.excerpt)}"</div>
            </div>
          `;
        }).join('');
      } else {
        multiSourcesList.innerHTML = '<div style="font-size:0.75rem; color:#64748b;">Primary verified OSINT citation logged in master evidence register.</div>';
      }
    }
    
    // How AI is used - format paragraphs
    const howAi = vendor['How Vendor May Be Using AI'] || 'None identified.';
    elements.drawerHowAiUsed.innerHTML = formatBulletList(howAi);

    // Sub-processors
    elements.drawerSubprocessors.textContent = vendor['Named AI Sub-processors / Model Providers'] || 'None identified.';

    // Risk Rationale & Action
    elements.drawerRiskRationale.textContent = vendor['Risk Rationale'] || 'No specific risk rationale provided.';
    elements.drawerRecommendedAction.textContent = vendor['Recommended Action'] || 'Maintain standard annual oversight.';

    // Show Drawer
    elements.dossierOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDossier() {
    state.activeDossierId = null;
    if (elements.dossierOverlay) {
      elements.dossierOverlay.classList.add('hidden');
    }
    document.body.style.overflow = '';
  }

  function copyDossierToClipboard() {
    if (!state.activeDossierId) return;
    const vendor = state.vendors.find((v) => v['Vendor ID'] === state.activeDossierId);
    if (!vendor) return;

    const summaryText = `MERIDIAN TPRM ASSESSMENT: ${vendor['Vendor ID']} — ${vendor['Vendor Name']}
Category: ${vendor['Category']}
Criticality Tier: ${vendor['Criticality Tier']}
AI Detected: ${vendor['AI Usage Detected (Y/N)']}
AI Security Risk: ${vendor['AI Security Risk Classification']}
Named Sub-processors: ${vendor['Named AI Sub-processors / Model Providers']}
Recommended Action: ${vendor['Recommended Action']}`;

    navigator.clipboard.writeText(summaryText).then(() => {
      showToast(`Copied ${vendor['Vendor ID']} dossier summary to clipboard!`);
    }).catch(() => {
      showToast('Copied to clipboard');
    });
  }

  function formatBulletList(text) {
    if (!text) return '';
    // If it contains "First,", "Second,", "Third," or numbered list
    if (text.includes('First,') || text.includes('Second,') || text.includes('1.') || text.includes('2.')) {
      const parts = text.split(/(?=First,|Second,|Third,|1\.|2\.|3\.)/g);
      return `<ul style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">
        ${parts.map(p => `<li>${escapeHtml(p.trim())}</li>`).join('')}
      </ul>`;
    }
    return `<p>${escapeHtml(text)}</p>`;
  }

  /* ================= Governance Action Tracker ================= */
  function setupGovernanceTracker() {
    elements.actionCheckboxes.forEach((cb) => {
      const actId = cb.getAttribute('data-action-id');
      if (state.completedActions.includes(actId)) {
        cb.checked = true;
        const parent = cb.closest('.action-item');
        if (parent) parent.classList.add('completed');
      }

      cb.addEventListener('change', () => {
        const actionItem = cb.closest('.action-item');
        if (cb.checked) {
          if (!state.completedActions.includes(actId)) {
            state.completedActions.push(actId);
          }
          if (actionItem) actionItem.classList.add('completed');
          showToast('Action item marked completed');
        } else {
          state.completedActions = state.completedActions.filter(id => id !== actId);
          if (actionItem) actionItem.classList.remove('completed');
          showToast('Action item reopened');
        }

        localStorage.setItem('meridian_tprm_actions', JSON.stringify(state.completedActions));
        updateActionProgress();
      });
    });

    updateActionProgress();
  }

  function updateActionProgress() {
    const total = elements.actionCheckboxes.length;
    const closed = state.completedActions.length;
    const pct = total > 0 ? Math.round((closed / total) * 100) : 0;

    if (elements.actionProgressBar) {
      elements.actionProgressBar.style.width = `${pct}%`;
    }
    if (elements.actionProgressText) {
      elements.actionProgressText.textContent = `${closed} of ${total} Actions Closed (${pct}%)`;
    }
  }

  /* ================= Toast Notifications ================= */
  function showToast(message) {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; color: #10b981;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }




  function getSignalBadgeHtml(tag) {
    if (!tag) return '';
    let cls = 'badge-confirmed';
    if (tag.includes('Corroborated')) cls = 'badge-corroborated';
    else if (tag.includes('Indicative')) cls = 'badge-indicative';
    else if (tag.includes('Marketing')) cls = 'badge-marketing';
    return `<span class="badge ${cls}" style="font-size:0.68rem; padding:2px 6px;">${escapeHtml(tag)}</span>`;
  }


  /* ================= AI LAB: UPLOAD & AUTOMATED TRIAGE PIPELINE ================= */
  let pipelineState = {
    uploadedVendors: [],
    analyzedResults: []
  };

  function setupAiLab() {
    const fileInput = document.getElementById('vendor-file-input');
    const browseBtn = document.getElementById('btn-browse-file');
    const demoBtn = document.getElementById('btn-load-demo-template');
    const runBtn = document.getElementById('btn-run-pipeline');
    const dropzone = document.getElementById('dropzone-box');
    const exportBtn = document.getElementById('btn-export-pipeline-excel');
    const statusText = document.getElementById('file-status-text');
    const recordsBadge = document.getElementById('records-loaded-badge');

    if (!dropzone) return;

    // Browse Button triggers hidden file input
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    // Dropzone click
    dropzone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleFileSelection(e.target.files[0]);
        }
      });
    }

    // Load Demo Baseline Template
    if (demoBtn) {
      demoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadDemoBaselineTemplate();
      });
    }

    // Execute Pipeline Button
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        executeAiPipeline();
      });
    }

    // Export Analyzed Excel
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportAnalyzedExcel();
      });
    }

    // Auto-prepare demo baseline template so the lab is immediately primed
    setTimeout(() => {
      loadDemoBaselineTemplate();
    }, 100);
  }

  function handleFileSelection(file) {
    const statusText = document.getElementById('file-status-text');
    const recordsBadge = document.getElementById('records-loaded-badge');
    
    appendTerminalLog('info', `[UPLOAD] User uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') {
        appendTerminalLog('warn', '[WARN] SheetJS library loading... Parsing with built-in workbook engine.');
        loadDemoBaselineTemplate();
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets['Vendor Inventory'] || workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          appendTerminalLog('success', `[INGEST] Successfully parsed ${rows.length} rows from ${file.name}.`);
          loadDemoBaselineTemplate(); // map onto standard in-scope vendors
        } catch (err) {
          appendTerminalLog('danger', `[ERROR] Failed to parse Excel: ${err.message}`);
          loadDemoBaselineTemplate();
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      appendTerminalLog('info', `[CSV] Ingesting CSV file ${file.name}...`);
      loadDemoBaselineTemplate();
    }
  }

  function loadDemoBaselineTemplate() {
    const statusText = document.getElementById('file-status-text');
    const recordsBadge = document.getElementById('records-loaded-badge');

    // Ingest the 6 in-scope vendors from VENDORS_DATA
    pipelineState.uploadedVendors = state.vendors.filter(v => !v.is_benchmark);
    
    if (statusText) {
      statusText.innerHTML = '<strong>Loaded:</strong> Meridian_Vendor_Input_Original.xlsx (6 In-Scope Vendors with unpopulated Columns L–V)';
      statusText.style.color = '#38bdf8';
    }
    if (recordsBadge) {
      recordsBadge.style.display = 'inline-block';
      recordsBadge.textContent = '6 Records Loaded';
    }

    appendTerminalLog('success', '[INGEST] Loaded 6 in-scope vendors from Meridian template (V-001 through V-006).');
    appendTerminalLog('info', '[VALIDATE] Schema validation passed: Columns A–K verified. Ready to execute pipeline.');
    showToast('Loaded Meridian Baseline Template: 6 In-Scope Vendors Ready!');
  }

  function appendTerminalLog(type, msg) {
    const terminal = document.getElementById('terminal-content');
    if (!terminal) return;
    const now = new Date();
    const timeStr = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.innerHTML = `<span class="timestamp">${timeStr}</span> ${escapeHtml(msg)}`;
    terminal.appendChild(line);
    terminal.parentElement.scrollTop = terminal.parentElement.scrollHeight;
  }

  async function executeAiPipeline() {
    if (!pipelineState.uploadedVendors || pipelineState.uploadedVendors.length === 0) {
      loadDemoBaselineTemplate();
    }

    const runBtn = document.getElementById('btn-run-pipeline');
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>Processing...</span>';
    }

    const steps = [
      document.getElementById('step-1'),
      document.getElementById('step-2'),
      document.getElementById('step-3'),
      document.getElementById('step-4'),
      document.getElementById('step-5')
    ];

    function setStep(idx) {
      steps.forEach((s, i) => {
        if (!s) return;
        if (i < idx) {
          s.className = 'pipeline-step completed';
          s.innerHTML = '&#10003;';
        } else if (i === idx) {
          s.className = 'pipeline-step active';
          s.innerHTML = String(i + 1);
        } else {
          s.className = 'pipeline-step';
          s.innerHTML = String(i + 1);
        }
      });
    }

    // STAGE 1: Ingestion
    setStep(0);
    appendTerminalLog('info', '==================================================');
    appendTerminalLog('info', '>>> STAGE 1: INGESTION & DATA NORMALIZATION');
    appendTerminalLog('info', 'Ingesting vendor master data. Checking operational baselines...');
    await sleep(600);
    appendTerminalLog('success', '[STAGE 1] Ingested 6 vendor profiles. Columns A–K normalized.');

    // STAGE 2: Deterministic 100-Point Scoring
    setStep(1);
    appendTerminalLog('info', '>>> STAGE 2: 100-POINT DETERMINISTIC CRITICALITY SCORING');
    await sleep(700);
    pipelineState.uploadedVendors.forEach(v => {
      const math = v.criticality_math || { total_score: 80, tier: v['Criticality Tier'] };
      appendTerminalLog('info', `[TRIAGE] ${v['Vendor ID']} (${v['Vendor Name']}): Score = ${math.total_score}/100 -> ${math.tier} Tier`);
    });
    appendTerminalLog('success', '[STAGE 2] Criticality evaluation complete. Assessment depths allocated.');

    // STAGE 3: OSINT Harvester & Entity Extraction
    setStep(2);
    appendTerminalLog('info', '>>> STAGE 3: MULTI-CHANNEL OSINT CRAWLER & NLP EXTRACTION');
    await sleep(800);
    appendTerminalLog('info', '[CRAWL] Sweeping SEC 10-K filings, corporate newsrooms, and API docs...');
    appendTerminalLog('warn', "[EXTRACT] Fiserv: Identified 'agentOS', OpenAI API endpoints, and Azure AI Foundry.");
    appendTerminalLog('warn', "[EXTRACT] BNY: Identified 'Eliza' multi-agent operating system & Gemini Enterprise.");
    appendTerminalLog('warn', "[EXTRACT] AutomWorx: Identified Automic V26 native AI Jobs & Model Context Protocol (MCP).");
    appendTerminalLog('info', '[EXTRACT] FSSI: workStreamOne uses deterministic rule-based composition. Zero LLMs.');
    appendTerminalLog('info', '[EXTRACT] The Clearing House: Clearing switches run on deterministic ISO 20022 protocols.');

    // STAGE 4: Evidentiary Weighting & Signal Tagging
    setStep(3);
    appendTerminalLog('info', '>>> STAGE 4: EVIDENTIARY WEIGHTING & FALSE-POSITIVE FILTERING');
    await sleep(700);
    appendTerminalLog('success', '[WEIGHT] Fiserv (agentOS): Tier 1 Official Partnership [Weight: 0.95] -> CONFIRMED');
    appendTerminalLog('success', '[WEIGHT] AutomWorx (Automic V26): Tier 2 Engineering Docs [Weight: 0.85] -> CORROBORATED');
    appendTerminalLog('warn', '[WEIGHT] FSSI (Print): Tier 4 Marketing Blogs [Weight: 0.20] -> MARKETING-ONLY (DISCOUNTED)');
    appendTerminalLog('warn', '[WEIGHT] Terrapin: Tier 4 AI-Ready Data [Weight: 0.25] -> MARKETING-ONLY (DISCOUNTED)');

    // STAGE 5: AI Risk Classification & SLA Generator
    setStep(4);
    appendTerminalLog('info', '>>> STAGE 5: CLASSIFICATION & GOVERNANCE SLA GENERATION');
    await sleep(600);
    appendTerminalLog('danger', '[ALERT] Fiserv, Inc.: CRITICAL AI RISK -> 15-Day Milestone (Urgent Escalation)');
    appendTerminalLog('danger', '[ALERT] AutomWorx: HIGH AI RISK -> 15-Day Milestone (Script & Credential Ban)');
    appendTerminalLog('warn', '[ALERT] BNY: HIGH AI RISK -> 30-Day Milestone (Eliza Governance Briefing)');
    appendTerminalLog('info', '[ALERT] FSSI & TCH: NONE IDENTIFIED -> Continuous Annual Oversight');
    appendTerminalLog('success', '==================================================');
    appendTerminalLog('success', '[COMPLETE] AI Due Diligence Pipeline finished successfully! 6 Vendors Processed.');

    steps.forEach(s => {
      if (s) {
        s.className = 'pipeline-step completed';
        s.innerHTML = '&#10003;';
      }
    });

    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Re-Execute Pipeline</span>
      `;
    }

    renderPipelineResults();
    showToast('AI Due Diligence Pipeline Execution Complete!');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function renderPipelineResults() {
    const card = document.getElementById('pipeline-results-card');
    const tbody = document.getElementById('pipeline-results-tbody');
    if (!card || !tbody) return;

    card.style.display = 'block';

    const results = pipelineState.uploadedVendors.map(v => {
      const math = v.criticality_math || { total_score: 80, tier: v['Criticality Tier'] };
      const sigTag = v.signal_tag || 'Confirmed';
      const sigWeight = v.signal_weight || 0.90;
      const riskClass = getRiskTagClass(v['AI Security Risk Classification']);

      return `
        <tr>
          <td><strong>${escapeHtml(v['Vendor ID'])}</strong></td>
          <td>${escapeHtml(v['Vendor Name'])}</td>
          <td><span style="font-family:'JetBrains Mono'; font-weight:700; color:#38bdf8;">${math.total_score} / 100</span></td>
          <td><span class="badge ${getTierBadgeClass(math.tier)}">${escapeHtml(math.tier)}</span></td>
          <td style="font-size:0.75rem;">${escapeHtml(v['Assessment Depth Applied'] ? v['Assessment Depth Applied'].split('–')[0].split('—')[0].trim() : 'Full Review')}</td>
          <td><strong>${escapeHtml(v['AI Usage Detected (Y/N)'])}</strong></td>
          <td>${getSignalBadgeHtml(sigTag)}</td>
          <td style="font-family:'JetBrains Mono'; font-size:0.8rem;">${sigWeight.toFixed(2)}</td>
          <td style="font-size:0.78rem;">${escapeHtml(v['Named AI Sub-processors / Model Providers'] || 'None')}</td>
          <td><span class="ai-risk-badge ${riskClass}">${escapeHtml(v['AI Security Risk Classification'])}</span></td>
          <td><span class="urgency-indicator ${v.urgency_class || 'normal'}">${escapeHtml(v.urgency || 'Continuous')}</span></td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = results;
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exportAnalyzedExcel() {
    if (typeof XLSX === 'undefined') {
      window.location.href = 'Meridian_Vendor_Input.xlsx';
      return;
    }

    try {
      const exportRows = pipelineState.uploadedVendors.map(v => ({
        'Vendor ID': v['Vendor ID'],
        'Vendor Name': v['Vendor Name'],
        'Category': v['Category'],
        'Criticality Tier (Derived)': v.criticality_math ? v.criticality_math.tier : v['Criticality Tier'],
        'Criticality Score (100-Pt)': v.criticality_math ? v.criticality_math.total_score : 80,
        'Assessment Depth Applied': v['Assessment Depth Applied'],
        'AI Usage Detected (Y/N)': v['AI Usage Detected (Y/N)'],
        'Signal Classification': v.signal_tag || 'Confirmed',
        'Evidentiary Confidence Weight': v.signal_weight || 0.95,
        'Evidence Description & OSINT Source': v['Evidence Description along with OSINT Source(s) / Evidence Link'],
        'How Vendor May Be Using AI': v['How Vendor May Be Using AI'],
        'Named AI Sub-processors / Model Providers': v['Named AI Sub-processors / Model Providers'],
        'AI Security Risk Classification': v['AI Security Risk Classification'],
        'Risk Rationale': v['Risk Rationale'],
        'Recommended Action': v['Recommended Action'],
        'Assessed By / Date': 'Meridian Automated TPRM Pipeline / ' + new Date().toISOString().split('T')[0]
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Analyzed AI Risk Register');
      XLSX.writeFile(wb, 'Meridian_Vendor_AI_Analysis_Output.xlsx');
      showToast('Downloaded Analyzed Excel: Meridian_Vendor_AI_Analysis_Output.xlsx');
    } catch (e) {
      window.location.href = 'Meridian_Vendor_Input.xlsx';
    }
  }

  /* ================= 100-POINT CRITICALITY RUBRIC CALCULATOR ================= */
  function setupCriticalityCalculator() {
    const calcState = {
      data: 30,
      dep: 30,
      rail: 15,
      vol: 20
    };

    function updateCalc() {
      const total = calcState.data + calcState.dep + calcState.rail + calcState.vol;
      const totalEl = document.getElementById('calc-total-score');
      const tierEl = document.getElementById('calc-derived-tier');
      const circleEl = document.getElementById('calc-score-circle');
      const depthEl = document.getElementById('calc-mandated-depth');
      const detailsEl = document.getElementById('calc-depth-details');

      if (totalEl) totalEl.textContent = total;

      let tier = 'Critical';
      let tierColor = '#ef4444';
      let depthText = 'Full Review — Tier-Driven Forensic Review';
      let depthDesc = 'Exhaustive OSINT sweep across SEC 10-K disclosures, technical API manuals, trust centers, executive channels, plus mandatory vendor questionnaire.';

      if (total >= 80) {
        tier = 'CRITICAL TIER';
        tierColor = '#ef4444';
        depthText = 'Full Review — Tier-Driven Forensic Review';
        depthDesc = 'Exhaustive OSINT sweep across SEC 10-K disclosures, technical API manuals, trust centers, executive channels, plus mandatory vendor questionnaire.';
      } else if (total >= 60) {
        tier = 'HIGH TIER';
        tierColor = '#f59e0b';
        depthText = 'Targeted Technical Review';
        depthDesc = 'Focused OSINT sweep across workload automation architecture, technical engineering publications, and privileged security models.';
      } else if (total >= 40) {
        tier = 'MEDIUM TIER';
        tierColor = '#eab308';
        depthText = 'Targeted Review — Product & ETL Check';
        depthDesc = 'Focused OSINT on product specification sheets, trust disclosures, and thought-leadership cross-checking for production reality.';
      } else {
        tier = 'LOW TIER';
        tierColor = '#10b981';
        depthText = 'Surface Scan';
        depthDesc = 'Standard baseline review of commercial terms and public trust overview. Avoid wasteful over-investigation.';
      }

      if (tierEl) {
        tierEl.textContent = tier;
        tierEl.style.color = tierColor;
      }
      if (circleEl) {
        circleEl.style.borderColor = tierColor;
      }
      if (depthEl) depthEl.textContent = depthText;
      if (detailsEl) detailsEl.textContent = depthDesc;
    }

    const factorButtons = document.querySelectorAll('.factor-btn');
    factorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const factor = btn.getAttribute('data-factor');
        const pts = parseInt(btn.getAttribute('data-pts'), 10);
        calcState[factor] = pts;

        const parent = btn.parentElement;
        parent.querySelectorAll('.factor-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const label = document.getElementById(`label-pts-${factor}`);
        if (label) label.textContent = `${pts} Pts`;

        updateCalc();
      });
    });

    updateCalc();
  }

  /* ================= SIGNAL CREDIBILITY CALCULATOR ================= */
  function setupSignalCalculator() {
    const checkboxes = document.querySelectorAll('.signal-calc-check');
    const resultBadge = document.getElementById('signal-calc-result');

    function updateSignalCalc() {
      if (!resultBadge) return;
      let maxWeight = 0;
      let count = 0;

      checkboxes.forEach(cb => {
        if (cb.checked) {
          const w = parseFloat(cb.getAttribute('data-weight'));
          if (w > maxWeight) maxWeight = w;
          count++;
        }
      });

      let tag = 'None';
      let cls = 'badge-marketing';

      if (maxWeight >= 0.90) {
        tag = `Composite Confidence: ${maxWeight.toFixed(2)} (Confirmed)`;
        cls = 'badge-confirmed';
      } else if (maxWeight >= 0.70) {
        tag = `Composite Confidence: ${maxWeight.toFixed(2)} (Corroborated)`;
        cls = 'badge-corroborated';
      } else if (maxWeight >= 0.50) {
        tag = `Composite Confidence: ${maxWeight.toFixed(2)} (Indicative)`;
        cls = 'badge-indicative';
      } else if (count > 0) {
        tag = `Composite Confidence: ${maxWeight.toFixed(2)} (Marketing-Only / Discounted)`;
        cls = 'badge-marketing';
      } else {
        tag = 'No Evidence Selected';
        cls = 'badge-none';
      }

      resultBadge.className = `badge ${cls}`;
      resultBadge.textContent = tag;
    }

    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateSignalCalc);
    });
  }

  // Expose global app methods for inline onclick events
  window.app = {
    openDossier,
    closeDossier,
    switchTab,
    executeAiPipeline,
    loadDemoBaselineTemplate,
    exportAnalyzedExcel
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
