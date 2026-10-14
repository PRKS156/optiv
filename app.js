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
    theme: localStorage.getItem('meridian_tprm_theme') || 'light',
    completedActions: (() => { try { return JSON.parse(localStorage.getItem('meridian_tprm_actions') || '[]'); } catch (e) { return []; } })()
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
    const closed = Array.from(elements.actionCheckboxes).filter((cb) => cb.checked).length;
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

  // Re-attach behaviour after dashboard_bind.js re-renders tabs from a new pipeline run
  function rebind() {
    elements.actionCheckboxes = document.querySelectorAll('.action-check');
    setupGovernanceTracker();
    renderInventory();
  }

  // Expose global app methods for inline onclick events
  window.app = {
    openDossier,
    closeDossier,
    switchTab,
    rebind
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
