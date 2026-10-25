(() => {
const {
  t,
  tUnit,
  tResource = (r) => r,
  getResourceIcon = () => '📦',
  tCampType,
  tBuilding = (b) => b,
  tRole,
  tReason,
  tAdv,
  getAdventureTranslations,
  setLanguage,
  onLanguageChange,
  updatePageTranslations,
  updateLanguageSwitcherUI,
} = window.I18N_ENGINE || {
  t: (k, params = {}) => {
    let s = k;
    for (const [p, v] of Object.entries(params)) s = s.replaceAll(`{${p}}`, v);
    return s;
  },
  tUnit: (u) => u,
  tResource: (r) => r,
  getResourceIcon: () => '📦',
  tCampType: (tp) => tp,
  tBuilding: (b) => b,
  tRole: (r) => r,
  tReason: (rs) => rs,
  tAdv: (id) => id,
  getAdventureTranslations: (id) => null,
  setLanguage: () => {},
  onLanguageChange: () => {},
  updatePageTranslations: () => {},
  updateLanguageSwitcherUI: () => {},
};

const S = {
  get(k, d) {
    try {
      const v = localStorage.getItem('tsoplan.' + k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    localStorage.setItem('tsoplan.' + k, JSON.stringify(v));
  },
};

let META = { adventures: [], allUnits: [], defaultUnits: [] };
let GENERALS = [];
let UNIT_VALUES = {};
let QUEUE = [];
let LAST_PLAN_RESULT = null;
let LAST_ADVENTURE_SNAPSHOT = null;
let CALC_TIMER = null;

// Settings state
let SETTINGS = {
  genUsage: 'min',
  lossAcc: 'max',
  sacrifice: 'cheap',
};

const $ = (id) => document.getElementById(id);

function getUnitIconUrl(unitId) {
  if (typeof UNIT_ICONS !== 'undefined' && UNIT_ICONS[unitId]) {
    return UNIT_ICONS[unitId];
  }
  return null;
}

function renderUnitIcon(unitId, extraClass = '') {
  const icon = getUnitIconUrl(unitId);
  const name = tUnit(unitId);
  if (!icon) return '';
  return `<img src="${icon}" class="unit-icon ${extraClass}" alt="${name}" data-tooltip="${name}" loading="lazy">`;
}

const UNIT_RESOURCES = {
  // Regular Barracks
  Recruit: { Settler: 1, Brew: 5, BronzeSword: 10 },
  Bowman: { Settler: 1, Brew: 5, Bow: 10 },
  Militia: { Settler: 1, Brew: 10, IronSword: 10 },
  Cavalry: { Settler: 1, Brew: 30, Horse: 40 },
  Longbowman: { Settler: 1, Brew: 10, Longbow: 10 },
  Soldier: { Settler: 1, Brew: 15, SteelSword: 10 },
  Crossbowman: { Settler: 1, Brew: 20, Crossbow: 10 },
  EliteSoldier: { Settler: 1, Brew: 15, DamasceneSword: 10 },
  Cannoneer: { Settler: 1, Brew: 20, Cannon: 10, Gunpowder: 50 },

  // Elite Barracks
  Swordsman: { Settler: 1, Brew: 5, PlatinumSword: 10 },
  MountedSwordsman: { Settler: 1, Brew: 15, PlatinumSword: 10, BattleHorse: 20 },
  Knight: { Settler: 1, Brew: 15, PlatinumSword: 20, BattleHorse: 20 },
  Marksman: { Settler: 1, Brew: 5, Arquebus: 10 },
  ArmoredMarksman: { Settler: 1, Brew: 15, PlatinumSword: 10, Arquebus: 10 },
  MountedMarksman: { Settler: 1, Brew: 15, Arquebus: 10, BattleHorse: 20 },
  Besieger: { Settler: 1, Brew: 20, Mortar: 10, Gunpowder: 50 },
};

function formatUnitLossTooltip(unitId, lostCount) {
  const name = tUnit(unitId);
  const lostStr = `−${fmt(lostCount)}`;
  const recipe = UNIT_RESOURCES[unitId];
  if (!recipe || !lostCount) return `${name} ${lostStr}`;

  const resList = Object.entries(recipe)
    .map(([rId, amt]) => {
      const total = Math.round(amt * lostCount * 10) / 10;
      const rName = tResource(rId);
      return `${fmt(total)} ${rName}`;
    })
    .join(', ');

  return `${name} ${lostStr} · ${resList}`;
}

function renderUnitChip(unitId, count) {
  const icon = getUnitIconUrl(unitId);
  const name = tUnit(unitId);
  const countStr = count !== undefined ? `<span class="unit-count">${count}</span>` : '';
  if (!icon) {
    return `<span class="unit-chip" data-tooltip="${name}">${count ? count + ' ' : ''}${name}</span>`;
  }
  return `<span class="unit-chip" data-tooltip="${name}"><img src="${icon}" class="unit-icon" alt="${name}" loading="lazy">${countStr}</span>`;
}

function renderUnitLossChip(unitId, lostCount) {
  const icon = getUnitIconUrl(unitId);
  const name = tUnit(unitId);
  const lostStr = `−${fmt(lostCount)}`;
  const tip = formatUnitLossTooltip(unitId, lostCount);
  if (!icon) {
    return `<span class="unit-chip loss" data-tooltip="${tip}">${name} ${lostStr}</span>`;
  }
  return `<span class="unit-chip loss" data-tooltip="${tip}"><img src="${icon}" class="unit-icon" alt="${name}" loading="lazy"><span class="unit-count">${lostStr}</span></span>`;
}

function initTooltips() {
  let tooltip = $('appTooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'appTooltip';
    tooltip.className = 'app-tooltip';
    document.body.appendChild(tooltip);
  }

  let activeTarget = null;

  function positionTooltip(target) {
    const rect = target.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    let top = rect.top - tipRect.height - 6;
    let left = rect.left + (rect.width - tipRect.width) / 2;

    if (top < 6) {
      top = rect.bottom + 6;
    }
    if (left < 6) left = 6;
    if (left + tipRect.width > window.innerWidth - 6) {
      left = window.innerWidth - tipRect.width - 6;
    }

    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.style.left = `${Math.round(left)}px`;
  }

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    activeTarget = target;
    const text = target.getAttribute('data-tooltip');
    if (!text) return;
    tooltip.textContent = text;
    tooltip.classList.add('visible');
    positionTooltip(target);
  });

  document.addEventListener('mouseout', (e) => {
    if (!activeTarget) return;
    const related = e.relatedTarget;
    if (!related || !activeTarget.contains(related)) {
      tooltip.classList.remove('visible');
      activeTarget = null;
    }
  });

  window.addEventListener('scroll', () => {
    if (activeTarget && tooltip.classList.contains('visible')) {
      positionTooltip(activeTarget);
    }
  }, true);
}

async function loadMeta() {
  META = await (await fetch('/api/meta')).json();
  const prev = $('adv').value || S.get('adventure', null);
  updateAdventureSelect(prev);
  updateDockSummary();
}

function matchesAdventure(advId, query) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const trans = getAdventureTranslations(advId) || {};
  const enName = trans.en || '';
  const ukName = trans.uk || '';
  const ruName = trans.ru || '';
  const localized = tAdv(advId);

  const fullText = `${advId} ${localized} ${enName} ${ukName} ${ruName}`.toLowerCase();
  const words = fullText.split(/[\s_\-,()]+/);
  const terms = q.split(/[\s_\-,()]+/).filter(Boolean);

  function wordMatch(w, term) {
    if (w.includes(term) || term.includes(w)) return true;
    const minLen = Math.min(w.length, term.length);
    if (minLen >= 4) {
      const prefixLen = Math.max(4, Math.floor(minLen * 0.8));
      if (w.slice(0, prefixLen) === term.slice(0, prefixLen)) return true;
    }
    return false;
  }

  return terms.length > 0 && terms.every((term) => words.some((w) => wordMatch(w, term)));
}

function updateAdventureSelect(selectedId = null, query = null) {
  if (!META || !META.adventures) return;
  const q = query !== null ? query : ($('advSearch') ? $('advSearch').value : '');
  const filtered = META.adventures
    .filter((a) => matchesAdventure(a.id, q))
    .sort((a, b) => tAdv(a.id).localeCompare(tAdv(b.id)));
  const prev = selectedId || ($('adv') ? $('adv').value : null) || S.get('adventure', null);

  if (filtered.length === 0) {
    $('adv').innerHTML = `<option value="" disabled selected>${t('pane.camps.notFound')}</option>`;
    return;
  }

  $('adv').innerHTML = filtered
    .map((a) => `<option value="${a.id}">${tAdv(a.id)} (${t('camp.suffix', { camps: a.camps })})</option>`)
    .join('');

  const filteredIds = filtered.map((a) => a.id);
  const nextVal = filteredIds.includes(prev) ? prev : (filteredIds[0] || '');
  const changed = $('adv').value !== nextVal;
  $('adv').value = nextVal;

  if (changed) {
    if (LAST_ADVENTURE_SNAPSHOT && !isSameAdventure(nextVal, LAST_ADVENTURE_SNAPSHOT)) {
      LAST_ADVENTURE_SNAPSHOT = null;
      renderAutobitSnapshotBanner();
    }
    S.set('adventure', nextVal);
    updateDockSummary();
    loadAdventureInfo();
  }
}

function filterAdventures(query) {
  updateAdventureSelect(null, query);
}

function updateDockSummary() {
  const adv = $('adv') ? $('adv').value : '';
  const advName = adv ? tAdv(adv) : '—';
  if ($('dockAdvLabel')) $('dockAdvLabel').textContent = advName;
  if ($('mobileAdventureName')) $('mobileAdventureName').textContent = advName;
}

async function init() {
  await loadMeta();
  initTooltips();
  $('camps').value = S.get('camps', '');
  $('step').value = S.get('step', 10);
  $('reps').value = S.get('reps', 60);
  $('verify').value = S.get('verify', 400);
  $('maxGen').value = S.get('maxGen', 0);
  $('beam').value = S.get('beam', 5);
  $('chain').checked = S.get('chain', false);

  // Load Segmented Settings
  SETTINGS.genUsage = S.get('genUsage', 'min');
  SETTINGS.lossAcc = S.get('lossAcc', 'max');
  SETTINGS.sacrifice = S.get('sacrifice', 'cheap');
  syncSegmentedControls();

  bindSegmentedControl('ctrlGenUsage', (val) => {
    SETTINGS.genUsage = val;
    S.set('genUsage', val);
  });
  bindSegmentedControl('ctrlLossAcc', (val) => {
    SETTINGS.lossAcc = val;
    S.set('lossAcc', val);
  });
  bindSegmentedControl('ctrlSacrifice', (val) => {
    SETTINGS.sacrifice = val;
    S.set('sacrifice', val);
  });

  renderUnits();
  await loadAdventureInfo();

  const saved = S.get('generalsExport', null);
  if (saved) await applyGeneralsExport(saved);

  // Language Switcher binding
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.onclick = () => {
      setLanguage(btn.dataset.lang);
    };
  });

  // Re-render views when language changes
  onLanguageChange(() => {
    updateAdventureSelect();
    updateDockSummary();
    renderCampButtons();
    renderQueue();
    renderUnits();
    updateMapModalIfOpen();
    if (GENERALS.length) {
      $('genHint').innerHTML = t('gen.hint.loaded', { count: GENERALS.length });
      filterGenerals($('genSearch') ? $('genSearch').value : '');
    } else {
      const tbody = $('genTable').querySelector('tbody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="dim" style="text-align:center; padding:16px;">${t('gen.table.empty')}</td></tr>`;
    }
    if (LAST_PLAN_RESULT) {
      renderResult(LAST_PLAN_RESULT);
    }
  });

  // Apply active translations on startup
  updateLanguageSwitcherUI();
  updatePageTranslations();

  // Sidebar Sub-tab switching
  document.querySelectorAll('.side-tab-btn').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.side-tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.side-pane').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      const targetPane = $('pane-' + btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    };
  });

  // Mobile navigation tabs
  $('tabBtnParams').onclick = () => setMobileTab('params');
  $('tabBtnResults').onclick = () => setMobileTab('results');

  // Adventure events
  if ($('advSearch')) {
    $('advSearch').oninput = (e) => filterAdventures(e.target.value);
  }
  $('adv').onchange = () => {
    if (LAST_ADVENTURE_SNAPSHOT) {
      LAST_ADVENTURE_SNAPSHOT = null;
      renderAutobitSnapshotBanner();
    }
    S.set('adventure', $('adv').value);
    updateDockSummary();
    loadAdventureInfo();
  };
  $('advReload').onclick = async () => {
    await loadMeta();
    await loadAdventureInfo();
  };

  // Camp queue events
  $('camps').oninput = () => {
    S.set('camps', $('camps').value);
    queueFromText();
  };
  $('campAll').onclick = () => {
    QUEUE = (window.CAMPS || []).map((c) => c.number);
    syncQueue();
  };
  $('campClear').onclick = () => {
    QUEUE = [];
    syncQueue();
  };
  $('campBtns').onclick = (e) => {
    const b = e.target.closest('.camp');
    if (!b) return;
    const n = Number(b.dataset.n);
    QUEUE = QUEUE.includes(n) ? QUEUE.filter((x) => x !== n) : [...QUEUE, n];
    syncQueue();
  };
  $('campQueue').onclick = (e) => {
    const c = e.target.closest('.qchip');
    if (!c) return;
    QUEUE = QUEUE.filter((x) => x !== Number(c.dataset.n));
    syncQueue();
  };

  initMapModal();

  // Segmented controls event binding
  bindSegmentedControl('ctrlGenUsage', (val) => { SETTINGS.genUsage = val; S.set('genUsage', val); });
  bindSegmentedControl('ctrlLossAcc', (val) => { SETTINGS.lossAcc = val; S.set('lossAcc', val); });
  bindSegmentedControl('ctrlSacrifice', (val) => { SETTINGS.sacrifice = val; S.set('sacrifice', val); });

  // General search
  $('genSearch').oninput = (e) => filterGenerals(e.target.value);

  // Unit presets
  $('presetElite').onclick = () => applyUnitPreset('elite');
  $('presetAll').onclick = () => applyUnitPreset('all');

  // Numeric persistence
  for (const id of ['step', 'reps', 'verify', 'maxGen', 'beam']) {
    $(id).oninput = () => S.set(id, Number($(id).value));
  }
  $('chain').onchange = () => S.set('chain', $('chain').checked);

  // File upload
  $('genFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      S.set('generalsExport', data);
      const inGameSpecs = parseInGameSpecialists(data);
      if (inGameSpecs.length > 0 && (data.exportedAt || data.skillMap || (data.specialists && data.specialists.some((s) => s.id && /^\d+$/.test(String(s.id)))))) {
        S.set('studioGenerals', data);
        if ($('autobitGenJsonArea')) $('autobitGenJsonArea').value = JSON.stringify(data, null, ' ');
      }
      await applyGeneralsExport(data);
      updateClientCopyButtonsVisibility();
    } catch (err) {
      alert(t('toast.jsonError', { err: err.message }));
    }
  };

  if ($('btnSidebarAutobit')) {
    $('btnSidebarAutobit').onclick = () => openAutobitModal();
  }

  $('genAll').onclick = () => toggleAllGenerals(true);
  $('genNone').onclick = () => toggleAllGenerals(false);
  $('run').onclick = run;
  if ($('runMobile')) $('runMobile').onclick = run;
  initAutobitStudioEvents();
}

function bindSegmentedControl(id, onChange) {
  const container = $(id);
  if (!container) return;
  container.onclick = (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (!btn) return;
    container.querySelectorAll('.segmented-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    onChange(btn.dataset.val);
  };
}

function syncSegmentedControls() {
  const syncGroup = (id, currentVal) => {
    const container = $(id);
    if (!container) return;
    container.querySelectorAll('.segmented-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.val === currentVal);
    });
  };
  syncGroup('ctrlGenUsage', SETTINGS.genUsage);
  syncGroup('ctrlLossAcc', SETTINGS.lossAcc);
  syncGroup('ctrlSacrifice', SETTINGS.sacrifice);
}

function setMobileTab(tab) {
  if (tab === 'params') {
    document.body.className = 'tab-params';
    $('tabBtnParams').classList.add('active');
    $('tabBtnResults').classList.remove('active');
  } else {
    document.body.className = 'tab-results';
    $('tabBtnParams').classList.remove('active');
    $('tabBtnResults').classList.add('active');
  }
}

async function loadAdventureInfo() {
  const id = $('adv').value;
  if (!id) return;

  if (LAST_ADVENTURE_SNAPSHOT && !isSameAdventure(id, LAST_ADVENTURE_SNAPSHOT)) {
    LAST_ADVENTURE_SNAPSHOT = null;
    renderAutobitSnapshotBanner();
  }

  const res = await (await fetch('/api/adventure?id=' + encodeURIComponent(id))).json();
  window.CAMPS = res.camps;
  window.CURRENT_MAP = res.map || null;
  
  queueFromText();
  const valid = QUEUE.filter((n) => n >= 1 && n <= res.camps.length);
  if (valid.length !== QUEUE.length) {
    QUEUE = valid;
    syncQueue();
  } else {
    renderCampButtons();
    renderQueue();
    updateMapModalIfOpen();
  }
  updateDockSummary();
  if ($('adventureMapModal') && $('adventureMapModal').open) {
    loadMapImageAndRender();
  }
}

// --- Camp kinds and Attack Queue -------------------------------------------
function campKind(type) {
  const s = String(type || '').toLowerCase();
  if (s.includes('leader') || s.includes('boss')) return 'leader';
  if (s.includes('small')) return 'small';
  if (s.includes('medium')) return 'medium';
  if (s.includes('large') || s.includes('big')) return 'large';
  return 'other';
}

function renderCampButtons() {
  $('campBtns').innerHTML = (window.CAMPS || []).map((c) => {
    const enemy = c.units.map((u) => `${u.amount} ${tUnit(u.id)}`).join(', ');
    const total = c.units.reduce((s, u) => s + u.amount, 0);
    const pos = QUEUE.indexOf(c.number);
    const isQueued = pos >= 0;
    const tip = t('camp.tooltip', {
      num: c.number,
      sector: c.sector,
      type: tCampType(c.type),
      total,
      enemies: enemy,
    });
    return `<button class="camp ${campKind(c.type)}${isQueued ? ' queued' : ''}" data-n="${c.number}"` +
      ` title="${tip}">` +
      `<span>${c.number}</span>` +
      `${isQueued ? `<span class="camp-order-badge">${pos + 1}</span>` : ''}` +
      `</button>`;
  }).join('');
}

function renderQueue() {
  const count = QUEUE.length;
  if ($('queueCount')) $('queueCount').textContent = t('pane.camps.selected', { count });
  if ($('sideBadgeCamps')) $('sideBadgeCamps').textContent = count;
  if ($('dockQueueCount')) $('dockQueueCount').textContent = count;
  if ($('dockQueueSummary')) $('dockQueueSummary').innerHTML = t('dock.queue', { count });
  if ($('mobileQueueCount')) $('mobileQueueCount').textContent = count;
  if ($('mobileQueueText')) $('mobileQueueText').innerHTML = t('mobile.queue', { count });

  $('campQueue').innerHTML = count
    ? QUEUE.map((n, i) => `
        <span class="qchip" data-n="${n}" title="${t('pane.camps.clear')}">
          <span>${i + 1}.</span>
          <b>${n}</b>
          <span class="qchip-close">✕</span>
        </span>
      `).join('')
    : `<span class="dim" style="font-size:11px; padding:4px;">${t('pane.camps.queueEmpty')}</span>`;
}

function syncQueue(writeInput = true) {
  if (writeInput) {
    $('camps').value = QUEUE.join(', ');
    S.set('camps', $('camps').value);
  }
  renderCampButtons();
  renderQueue();
  updateMapModalIfOpen();
}

function queueFromText() {
  const nums = ($('camps').value || '').split(/[,\s]+/).filter(Boolean)
    .map(Number).filter((n) => Number.isFinite(n) && n > 0);
  QUEUE = [...new Set(nums)];
  syncQueue(false);
}

// --- Interactive Adventure Map Modal Controller ----------------------------
const mapState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  startX: 0,
  startY: 0,
};

function initMapModal() {
  const modal = $('adventureMapModal');
  if (!modal) return;

  const openButtons = [$('btnOpenMap'), $('btnOpenMapSecondary')];
  openButtons.forEach((btn) => {
    if (btn) btn.onclick = () => openMapModal();
  });

  const closeButtons = [$('btnMapClose'), $('btnMapDone')];
  closeButtons.forEach((btn) => {
    if (btn) btn.onclick = () => closeMapModal();
  });

  modal.addEventListener('cancel', () => closeMapModal());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeMapModal();
  });

  if ($('btnMapAll')) {
    $('btnMapAll').onclick = () => {
      QUEUE = (window.CAMPS || []).map((c) => c.number);
      syncQueue();
    };
  }
  if ($('btnMapClear')) {
    $('btnMapClear').onclick = () => {
      QUEUE = [];
      syncQueue();
    };
  }

  if ($('btnMapZoomIn')) $('btnMapZoomIn').onclick = () => adjustMapZoom(0.25);
  if ($('btnMapZoomOut')) $('btnMapZoomOut').onclick = () => adjustMapZoom(-0.25);
  if ($('btnMapZoomReset')) $('btnMapZoomReset').onclick = () => resetMapTransform();

  const strip = $('mapQueueStrip');
  if (strip) {
    strip.onclick = (e) => {
      const chip = e.target.closest('.qchip');
      if (!chip) return;
      const n = Number(chip.dataset.n);
      QUEUE = QUEUE.filter((x) => x !== n);
      syncQueue();
    };
  }

  const viewport = $('mapViewport');
  if (viewport) {
    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.map-camp-pin')) return;
      e.preventDefault();
      mapState.isPanning = true;
      mapState.startX = e.clientX - mapState.panX;
      mapState.startY = e.clientY - mapState.panY;
      viewport.classList.add('is-panning');
    });

    window.addEventListener('mousemove', (e) => {
      if (!mapState.isPanning) return;
      mapState.panX = e.clientX - mapState.startX;
      mapState.panY = e.clientY - mapState.startY;
      applyMapTransform();
    });

    window.addEventListener('mouseup', () => {
      if (mapState.isPanning) {
        mapState.isPanning = false;
        viewport.classList.remove('is-panning');
      }
    });

    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const prevZoom = mapState.zoom;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.min(Math.max(0.1, prevZoom * factor), 5.0);

      const stageX = (mouseX - mapState.panX) / prevZoom;
      const stageY = (mouseY - mapState.panY) / prevZoom;
      mapState.zoom = newZoom;
      mapState.panX = mouseX - stageX * newZoom;
      mapState.panY = mouseY - stageY * newZoom;

      applyMapTransform();
    }, { passive: false });

    // Mobile & Tablet Touch Support (drag and pinch-to-zoom)
    let touchStartDist = 0;
    let touchStartZoom = 1;
    let isTouchPinching = false;

    viewport.addEventListener('touchstart', (e) => {
      if (e.target.closest('.map-camp-pin')) return;
      if (e.touches.length === 1) {
        isTouchPinching = false;
        mapState.isPanning = true;
        mapState.startX = e.touches[0].clientX - mapState.panX;
        mapState.startY = e.touches[0].clientY - mapState.panY;
        viewport.classList.add('is-panning');
      } else if (e.touches.length === 2) {
        isTouchPinching = true;
        mapState.isPanning = false;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        touchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        touchStartZoom = mapState.zoom;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && mapState.isPanning && !isTouchPinching) {
        mapState.panX = e.touches[0].clientX - mapState.startX;
        mapState.panY = e.touches[0].clientY - mapState.startY;
        applyMapTransform();
      } else if (e.touches.length === 2 && isTouchPinching) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        if (touchStartDist > 0) {
          const factor = dist / touchStartDist;
          const newZoom = Math.min(Math.max(0.1, touchStartZoom * factor), 5.0);

          const rect = viewport.getBoundingClientRect();
          const centerX = (t0.clientX + t1.clientX) / 2 - rect.left;
          const centerY = (t0.clientY + t1.clientY) / 2 - rect.top;
          const prevZoom = mapState.zoom;
          const stageX = (centerX - mapState.panX) / prevZoom;
          const stageY = (centerY - mapState.panY) / prevZoom;

          mapState.zoom = newZoom;
          mapState.panX = centerX - stageX * newZoom;
          mapState.panY = centerY - stageY * newZoom;
          applyMapTransform();
        }
      }
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        mapState.isPanning = false;
        isTouchPinching = false;
        viewport.classList.remove('is-panning');
      } else if (e.touches.length === 1) {
        isTouchPinching = false;
        mapState.isPanning = true;
        mapState.startX = e.touches[0].clientX - mapState.panX;
        mapState.startY = e.touches[0].clientY - mapState.panY;
      }
    }, { passive: true });
  }

  const pinsLayer = $('mapPins');
  if (pinsLayer) {
    pinsLayer.onclick = (e) => {
      const pin = e.target.closest('.map-camp-pin');
      if (!pin) return;
      const n = Number(pin.dataset.n);
      QUEUE = QUEUE.includes(n) ? QUEUE.filter((x) => x !== n) : [...QUEUE, n];
      syncQueue();
      updatePinTooltip(n, pin);
    };

    pinsLayer.addEventListener('mouseover', (e) => {
      const pin = e.target.closest('.map-camp-pin');
      if (!pin) return;
      const n = Number(pin.dataset.n);
      updatePinTooltip(n, pin);
    });

    pinsLayer.addEventListener('mouseout', (e) => {
      const pin = e.target.closest('.map-camp-pin');
      if (!pin) return;
      const rel = e.relatedTarget;
      if (rel && pin.contains(rel)) return;
      const tooltip = $('mapPinTooltip');
      if (tooltip) tooltip.classList.remove('visible');
    });
  }
}

function openMapModal() {
  const modal = $('adventureMapModal');
  if (!modal) return;

  const advId = $('adv').value;
  if (!advId) {
    alert(t('pane.camps.notFound'));
    return;
  }

  const advTitleEl = $('mapModalAdvTitle');
  if (advTitleEl) advTitleEl.textContent = tAdv(advId);

  modal.showModal();
  loadMapImageAndRender();
}

function closeMapModal() {
  const modal = $('adventureMapModal');
  if (!modal) return;
  if (modal.open) modal.close();
  const tooltip = $('mapPinTooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

function resetMapTransform() {
  const viewport = $('mapViewport');
  const mapData = window.CURRENT_MAP;
  if (!viewport || !mapData || !mapData.width || !mapData.height) {
    mapState.zoom = 1;
    mapState.panX = 0;
    mapState.panY = 0;
    applyMapTransform();
    return;
  }

  const vWidth = viewport.clientWidth || 1000;
  const vHeight = viewport.clientHeight || 700;
  const mWidth = mapData.width;
  const mHeight = mapData.height;

  const scaleX = (vWidth - 32) / mWidth;
  const scaleY = (vHeight - 32) / mHeight;
  const fitZoom = Math.min(scaleX, scaleY, 1.0);

  mapState.zoom = Math.max(fitZoom, 0.1);
  mapState.panX = Math.round((vWidth - mWidth * mapState.zoom) / 2);
  mapState.panY = Math.round((vHeight - mHeight * mapState.zoom) / 2);

  applyMapTransform();
}

function adjustMapZoom(delta) {
  const viewport = $('mapViewport');
  if (!viewport) return;
  const vWidth = viewport.clientWidth;
  const vHeight = viewport.clientHeight;
  const prevZoom = mapState.zoom;
  const newZoom = Math.min(Math.max(0.1, prevZoom + delta), 5.0);

  const centerX = vWidth / 2;
  const centerY = vHeight / 2;
  const stageX = (centerX - mapState.panX) / prevZoom;
  const stageY = (centerY - mapState.panY) / prevZoom;

  mapState.zoom = newZoom;
  mapState.panX = centerX - stageX * newZoom;
  mapState.panY = centerY - stageY * newZoom;

  applyMapTransform();
}

function applyMapTransform() {
  const stage = $('mapStage');
  if (stage) {
    stage.style.transform = `translate(${mapState.panX}px, ${mapState.panY}px) scale(${mapState.zoom})`;
  }
  const resetBtn = $('btnMapZoomReset');
  if (resetBtn) {
    resetBtn.textContent = `${Math.round(mapState.zoom * 100)}%`;
  }
}

function loadMapImageAndRender() {
  const mapData = window.CURRENT_MAP;
  const img = $('mapImage');
  const loading = $('mapLoading');
  const stage = $('mapStage');

  if (!mapData || !mapData.key) {
    if (loading) loading.classList.remove('visible');
    renderMapPins();
    updateMapModalIfOpen();
    return;
  }

  if (loading) loading.classList.add('visible');

  stage.style.width = `${mapData.width}px`;
  stage.style.height = `${mapData.height}px`;

  const mapSrc = `/api/map-image?key=${encodeURIComponent(mapData.key)}`;
  if (img.getAttribute('data-loaded-key') === mapData.key && img.complete) {
    if (loading) loading.classList.remove('visible');
    resetMapTransform();
    renderMapPins();
    updateMapModalIfOpen();
    return;
  }

  img.onload = () => {
    img.setAttribute('data-loaded-key', mapData.key);
    if (loading) loading.classList.remove('visible');
    resetMapTransform();
    renderMapPins();
    updateMapModalIfOpen();
  };

  img.onerror = () => {
    if (loading) loading.classList.remove('visible');
    alert(t('mapModal.loadError'));
    renderMapPins();
    updateMapModalIfOpen();
  };

  img.src = mapSrc;
}

function renderMapPins() {
  const container = $('mapPins');
  if (!container) return;

  const mapData = window.CURRENT_MAP;
  const camps = window.CAMPS || [];
  if (!mapData || !mapData.width || !mapData.height) {
    container.innerHTML = '';
    return;
  }

  const w = mapData.width;
  const h = mapData.height;

  container.innerHTML = camps.filter((c) => c.position && c.position.x !== undefined).map((c) => {
    const pos = QUEUE.indexOf(c.number);
    const isQueued = pos >= 0;
    const leftPct = (100 * c.position.x / w).toFixed(3);
    const topPct = (100 * c.position.y / h).toFixed(3);
    const typeClass = c.type === 'Leader' ? 'type-leader' : (c.type === 'Medium' ? 'type-medium' : 'type-normal');

    return `
      <div class="map-camp-pin ${typeClass}${isQueued ? ' is-queued' : ''}"
           data-n="${c.number}"
           style="left: ${leftPct}%; top: ${topPct}%;">
        <span>${c.number}</span>
        ${isQueued ? `<span class="pin-order-badge">${pos + 1}</span>` : ''}
      </div>
    `;
  }).join('');
}

function updatePinTooltip(campNum, pinEl) {
  const tooltip = $('mapPinTooltip');
  const viewport = $('mapViewport');
  if (!tooltip || !viewport) return;

  const c = (window.CAMPS || []).find((x) => x.number === campNum);
  if (!c) return;

  const pos = QUEUE.indexOf(c.number);
  const isQueued = pos >= 0;
  const statusHtml = isQueued
    ? `<span style="color:#60a5fa;">${t('mapModal.statusSelected', { order: pos + 1 })}</span>`
    : `<span style="color:var(--text-muted);">${t('mapModal.statusUnselected')}</span>`;

  const unitRows = (c.units || []).map((u) => {
    const iconUrl = getUnitIconUrl(u.id);
    const unitName = tUnit(u.id);
    const iconHtml = iconUrl ? `<img src="${iconUrl}" class="unit-icon" alt="${unitName}" style="width:16px; height:16px; border-radius:3px;">` : '';
    return `
      <div class="tooltip-unit-item">
        <div class="tooltip-unit-info">
          ${iconHtml}
          <span>${unitName}</span>
        </div>
        <b class="font-mono">${u.amount}</b>
      </div>
    `;
  }).join('');

  const campTitle = `${t('pane.camps.title')} #${c.number} (Sector ${c.sector})`;

  tooltip.innerHTML = `
    <div class="tooltip-header">
      <div class="tooltip-camp-title font-mono">${campTitle}</div>
      <div class="tooltip-camp-type ${campKind(c.type)}">${tCampType(c.type)}</div>
    </div>
    <div class="tooltip-unit-list">
      ${unitRows || '<div class="dim">—</div>'}
    </div>
    <div class="tooltip-status">
      ${statusHtml}
    </div>
  `;

  tooltip.classList.add('visible');

  const pinRect = pinEl.getBoundingClientRect();
  const vRect = viewport.getBoundingClientRect();
  const tWidth = tooltip.offsetWidth || 220;
  const tHeight = tooltip.offsetHeight || 140;

  let left = pinRect.left - vRect.left + pinRect.width / 2 - tWidth / 2;
  let top = pinRect.top - vRect.top - tHeight - 10;

  if (top < 10) {
    top = pinRect.bottom - vRect.top + 10;
  }
  if (left < 10) left = 10;
  if (left + tWidth > vRect.width - 10) {
    left = vRect.width - tWidth - 10;
  }

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function updateMapModalIfOpen() {
  const modal = $('adventureMapModal');
  if (!modal || !modal.open) return;

  const advId = $('adv') ? $('adv').value : '';
  const advTitleEl = $('mapModalAdvTitle');
  if (advTitleEl && advId) {
    advTitleEl.textContent = tAdv(advId);
  }

  const total = (window.CAMPS || []).length;
  const selected = QUEUE.length;
  const countBadge = $('mapModalQueueCount');
  if (countBadge) {
    countBadge.textContent = `${selected} / ${total}`;
  }

  renderMapPins();

  const strip = $('mapQueueStrip');
  if (strip) {
    strip.innerHTML = selected
      ? QUEUE.map((n, i) => `
          <span class="qchip" data-n="${n}" title="${t('pane.camps.clear')}">
            <span>${i + 1}.</span>
            <b>${n}</b>
            <span class="qchip-close">✕</span>
          </span>
        `).join('')
      : `<span class="dim" style="font-size:11px; padding:4px;">${t('pane.camps.queueEmpty')}</span>`;
  }
}

// --- Troops / Stock --------------------------------------------------------
const ELITE_UNITS = [
  'Swordsman', 'MountedSwordsman', 'Knight',
  'Marksman', 'ArmoredMarksman', 'MountedMarksman', 'Besieger',
];

function applyUnitPreset(preset) {
  if (preset === 'elite') {
    S.set('useUnits', ELITE_UNITS);
    S.set('noLoss', ['MountedMarksman', 'Besieger']);
  } else if (preset === 'all') {
    S.set('useUnits', META.allUnits);
  }
  renderUnits();
}

function renderUnits() {
  const use = S.get('useUnits', META.defaultUnits || ELITE_UNITS);
  const noLoss = S.get('noLoss', []);
  const stock = S.get('stock', S.get('limits', {}));
  const tbody = $('unitTable').querySelector('tbody');
  
  tbody.innerHTML = (META.allUnits || []).map((u) => {
    const isElite = ELITE_UNITS.includes(u);
    const localizedName = tUnit(u);
    const displayName = localizedName !== u
      ? `${localizedName} <span class="dim" style="font-size:11px; font-weight:400;">(${u})</span>`
      : u;
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${renderUnitIcon(u, 'unit-icon-table')}
            <span style="font-weight:${isElite ? '600' : '400'}; color:${isElite ? '#f1f5f9' : '#94a3b8'};">
              ${displayName}
            </span>
          </div>
        </td>
        <td style="text-align:center;">
          <input type="checkbox" data-u="${u}" class="use" ${use.includes(u) ? 'checked' : ''}>
        </td>
        <td style="text-align:center;">
          <input type="checkbox" data-u="${u}" class="nl" ${noLoss.includes(u) ? 'checked' : ''}>
        </td>
        <td style="text-align:right;">
          <input type="number" class="num lim font-mono" data-u="${u}" placeholder="—" value="${stock[u] ?? ''}" style="width:68px; padding:3px 6px; font-size:12px;">
        </td>
      </tr>
    `;
  }).join('');
  tbody.oninput = saveUnits;
}

function saveUnits() {
  const use = [...document.querySelectorAll('.use:checked')].map((i) => i.dataset.u);
  const noLoss = [...document.querySelectorAll('.nl:checked')].map((i) => i.dataset.u);
  const stock = {};
  for (const i of document.querySelectorAll('.lim')) {
    if (i.value !== '') stock[i.dataset.u] = Number(i.value);
  }
  S.set('useUnits', use);
  S.set('noLoss', noLoss);
  S.set('stock', stock);
}

// --- Generals --------------------------------------------------------------
async function applyGeneralsExport(data) {
  try {
    const res = await (await fetch('/api/generals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generalsExport: data }),
    })).json();

    GENERALS = res.generals || [];
    UNIT_VALUES = res.unitValues || {};
    const allUids = GENERALS.map((g) => g.uid);
    let enabled = S.get('enabledGenerals', null);
    // A different roster was loaded (none of the saved UIDs exist) -> enable all.
    if (!Array.isArray(enabled) || (enabled.length && !enabled.some((u) => allUids.includes(u)))) {
      enabled = allUids;
      S.set('enabledGenerals', enabled);
    }

    if ($('sideBadgeGenerals')) $('sideBadgeGenerals').textContent = GENERALS.length;
    $('genHint').innerHTML = t('gen.hint.loaded', { count: GENERALS.length });
    renderGeneralsTable(GENERALS, enabled);
  } catch (err) {
    $('genHint').innerHTML = `<span class="danger">${t('gen.hint.error', { msg: err.message })}</span>`;
  }
}

function renderGeneralsTable(list, enabledList) {
  const enabled = enabledList || S.get('enabledGenerals', GENERALS.map((g) => g.uid));
  const tbody = $('genTable').querySelector('tbody');
  
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="dim" style="text-align:center; padding:16px;">${t('gen.table.noMatch')}</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((g) => `
    <tr>
      <td style="text-align:center;">
        <input type="checkbox" class="gen" data-uid="${g.uid}" ${enabled.includes(g.uid) ? 'checked' : ''}>
      </td>
      <td style="font-weight:600; color:#f1f5f9;">${g.name}</td>
      <td class="dim" style="font-size:11px;">${g.base}</td>
      <td style="text-align:right;">
        <span class="font-mono" style="font-weight:700; color:#60a5fa;">${g.capacity}</span>
      </td>
    </tr>
  `).join('');

  $('genTable').oninput = () => {
    S.set('enabledGenerals', [...document.querySelectorAll('.gen:checked')].map((i) => i.dataset.uid));
  };
}

function filterGenerals(query) {
  const q = (query || '').toLowerCase().trim();
  const filtered = GENERALS.filter((g) => 
    g.name.toLowerCase().includes(q) || g.base.toLowerCase().includes(q)
  );
  renderGeneralsTable(filtered);
}

function toggleAllGenerals(on) {
  for (const i of document.querySelectorAll('.gen')) i.checked = on;
  S.set('enabledGenerals', on ? GENERALS.map((g) => g.uid) : []);
}

// --- Calculation and Tactical Dashboard -------------------------------------
let CURRENT_WORKER = null;

async function run() {
  const exportData = S.get('generalsExport', null);
  if (!exportData) {
    showToast(t('toast.needGenerals'), 'warn');
    const genTab = document.querySelector('.side-tab-btn[data-tab="generals"]');
    if (genTab) genTab.click();
    setMobileTab('params');
    return;
  }

  const campTokens = $('camps').value.split(/[,\s]+/).filter(Boolean);
  if (!campTokens.length) {
    showToast(t('toast.needCamps'), 'warn');
    const campTab = document.querySelector('.side-tab-btn[data-tab="camps"]');
    if (campTab) campTab.click();
    setMobileTab('params');
    return;
  }

  $('run').disabled = true;
  if ($('runMobile')) $('runMobile').disabled = true;

  const cancelHandler = () => {
    if (CURRENT_WORKER) {
      try { CURRENT_WORKER.terminate(); } catch (e) {}
      CURRENT_WORKER = null;
    }
    clearInterval(CALC_TIMER);
    $('run').disabled = false;
    if ($('runMobile')) $('runMobile').disabled = false;
    showToast(t('loader.canceled'), 'info');
    if (LAST_PLAN_RESULT) {
      renderResult(LAST_PLAN_RESULT);
    } else {
      $('out').innerHTML = `
        <div class="panel-card" style="text-align:center; padding:24px;">
          <div class="dim" style="font-size:13px;">${t('loader.canceled')}</div>
        </div>
      `;
    }
  };

  // Show skeleton loader and switch view
  renderSkeletonLoader(cancelHandler);
  setMobileTab('results');

  const body = {
    adventure: $('adv').value,
    adventureCamps: window.CAMPS || [],
    camps: campTokens,
    generalsExport: exportData,
    enabledGenerals: S.get('enabledGenerals', GENERALS.map((g) => g.uid)),
    units: S.get('useUnits', META.defaultUnits),
    noLoss: S.get('noLoss', []),
    stock: S.get('stock', S.get('limits', {})),
    lossAccounting: SETTINGS.lossAcc,
    unitValues: UNIT_VALUES,
    stepPct: Number($('step').value),
    reps: Number($('reps').value),
    verify: Number($('verify').value),
    maxGeneralsPerCamp: Number($('maxGen').value) || undefined,
    beam: Number($('beam').value),
    chainCamps: $('chain').checked,
    sacrificePolicy: SETTINGS.sacrifice,
    generalUsage: SETTINGS.genUsage,
  };

  const runViaWorker = () => {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker('/planner.worker.js');
        CURRENT_WORKER = worker;

        worker.onmessage = (e) => {
          const { type, data, error } = e.data || {};
          if (type === 'PROGRESS') {
            updateSkeletonProgress(data);
          } else if (type === 'RESULT') {
            worker.terminate();
            CURRENT_WORKER = null;
            resolve(data);
          } else if (type === 'ERROR') {
            worker.terminate();
            CURRENT_WORKER = null;
            reject(new Error(error || 'Worker calculation failed'));
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          CURRENT_WORKER = null;
          reject(err);
        };

        worker.postMessage({ type: 'START_PLAN', payload: body });
      } catch (err) {
        reject(err);
      }
    });
  };

  const runViaApi = async () => {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Server returned ${res.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error) errMsg = parsed.error;
      } catch (e) {
        if (errText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
          errMsg = 'FUNCTION_INVOCATION_TIMEOUT: Превышен лимит времени выполнения на сервере (Vercel). Попробуйте уменьшить число лагерей.';
        }
      }
      throw new Error(errMsg);
    }
    return await res.json();
  };

  try {
    let res = null;
    if (typeof Worker !== 'undefined') {
      try {
        res = await runViaWorker();
      } catch (workerErr) {
        console.warn('Web Worker execution failed, falling back to server API:', workerErr);
        res = await runViaApi();
      }
    } else {
      res = await runViaApi();
    }

    LAST_PLAN_RESULT = res;
    renderResult(res);
  } catch (e) {
    $('out').innerHTML = `
      <div class="panel-card" style="border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08);">
        <div style="font-weight:700; color:#f87171; margin-bottom:6px;">${t('result.error.calcTitle')}</div>
        <div class="dim" style="font-size:13px; line-height:1.5;">${e.message}</div>
      </div>
    `;
  } finally {
    $('run').disabled = false;
    if ($('runMobile')) $('runMobile').disabled = false;
    clearInterval(CALC_TIMER);
    CURRENT_WORKER = null;
  }
}

function updateSkeletonProgress(p) {
  if (!p) return;
  const bar = $('calcProgressBar');
  const pctEl = $('calcProgressPct');
  const statusEl = $('calcStatusText');

  const pct = Math.max(0, Math.min(100, Math.round(p.pct || 0)));
  if (bar) bar.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;

  if (statusEl) {
    if (p.stage === 'searching' && p.currentCamp) {
      statusEl.textContent = t('loader.progress', { solved: p.solvedCamps, total: p.totalCamps, pct }) +
        ` · ${t('loader.campSearching', { num: p.currentCamp })}`;
    } else if (p.stage === 'wave_done') {
      statusEl.textContent = t('loader.progress', { solved: p.solvedCamps, total: p.totalCamps, pct });
    }
  }
}

function renderSkeletonLoader(onCancel) {
  let elapsed = 0;
  $('out').innerHTML = `
    <div class="skeleton-loader">
      <div class="panel-card" style="text-align:center; padding:32px 20px;">
        <div style="display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:50%; background:rgba(59,130,246,0.15); color:#60a5fa; margin-bottom:12px;">
          <svg class="spin-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
        </div>
        <h3 style="font-size:16px; font-weight:700; color:#fff; margin-bottom:4px;">${t('loader.title')}</h3>
        <p class="muted" style="font-size:13px;" id="calcStatusText">${t('loader.desc')}</p>

        <!-- Live Progress Bar -->
        <div style="max-width:320px; margin:14px auto 8px auto;">
          <div style="background:rgba(255,255,255,0.08); border-radius:6px; height:6px; overflow:hidden; position:relative;">
            <div id="calcProgressBar" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #60a5fa); transition:width 0.3s ease; border-radius:6px;"></div>
          </div>
          <div class="font-mono" id="calcProgressPct" style="font-size:11px; color:#94a3b8; margin-top:6px;">0%</div>
        </div>

        <div class="font-mono dim" id="calcTimerText" style="font-size:12px; margin-top:4px;">${t('loader.timer', { time: '0.0' })}</div>

        <!-- Cancel Button -->
        <button id="btnCancelCalc" class="btn" style="margin-top:14px; background:rgba(239,68,68,0.12); color:#f87171; border:1px solid rgba(239,68,68,0.25); font-size:12px; padding:6px 16px; border-radius:6px; cursor:pointer;">
          ✕ ${t('loader.cancel')}
        </button>
      </div>

      <div class="skeleton-card">
        <div class="skeleton-shimmer"></div>
        <div class="skeleton-bar" style="width:35%; height:20px;"></div>
        <div class="skeleton-bar" style="width:80%;"></div>
        <div class="skeleton-bar" style="width:60%;"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton-shimmer"></div>
        <div class="skeleton-bar" style="width:40%; height:20px;"></div>
        <div class="skeleton-bar" style="width:75%;"></div>
        <div class="skeleton-bar" style="width:55%;"></div>
      </div>
    </div>
  `;

  if ($('btnCancelCalc') && typeof onCancel === 'function') {
    $('btnCancelCalc').onclick = onCancel;
  }

  if (!document.getElementById('spin-style')) {
    const st = document.createElement('style');
    st.id = 'spin-style';
    st.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } } .spin-icon { animation: spin 1.5s linear infinite; }';
    document.head.appendChild(st);
  }

  CALC_TIMER = setInterval(() => {
    elapsed += 0.2;
    const el = $('calcTimerText');
    if (el) el.textContent = t('loader.timer', { time: elapsed.toFixed(1) });
  }, 200);
}

function fmt(n) {
  return Math.round((n || 0) * 100) / 100;
}

function fmtStockPills(o) {
  const entries = Object.entries(o || {});
  if (!entries.length) return `<span class="dim">${t('result.unlimited')}</span>`;
  return entries
    .map(([k, v]) => renderUnitChip(k, v))
    .join(' ');
}

function renderResult(r) {
  if (r.error) {
    $('out').innerHTML = `
      <div class="panel-card" style="border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08);">
        <div style="font-weight:700; color:#f87171; margin-bottom:6px;">${t('result.error.title')}</div>
        <div class="dim" style="font-size:13px;">${r.error}</div>
      </div>
    `;
    return;
  }

  if ($('mobileWaveCount')) {
    $('mobileWaveCount').textContent = r.waves.length;
  }

  let totalGeneralsUsed = 0;
  for (const w of r.waves) {
    for (const a of w.attacks) {
      totalGeneralsUsed += a.generalsUsed || (a.squad ? a.squad.length : 1);
    }
  }

  // Calculate total units lost and total resources
  let totalUnitsLost = r.totalUnitsLost;
  let totalLosses = r.totalLosses;
  let totalResources = r.totalResources;

  if (totalUnitsLost === undefined) {
    totalLosses = {};
    for (const w of r.waves) {
      for (const [u, n] of Object.entries(w.waveLosses || {})) {
        if (n > 0) totalLosses[u] = Math.round(((totalLosses[u] || 0) + n) * 10) / 10;
      }
    }
    totalUnitsLost = Math.round(Object.values(totalLosses).reduce((s, v) => s + v, 0) * 10) / 10;
    totalResources = {};
    for (const [u, count] of Object.entries(totalLosses)) {
      const rec = UNIT_RESOURCES[u];
      if (!rec) continue;
      for (const [rId, amt] of Object.entries(rec)) {
        totalResources[rId] = Math.round(((totalResources[rId] || 0) + amt * count) * 10) / 10;
      }
    }
  }

  const resTooltipSummary = Object.entries(totalResources || {})
    .filter(([_, amt]) => amt > 0)
    .map(([rId, amt]) => `${tResource(rId)}: ${fmt(amt)}`)
    .join(', ');

  const lossCardHtml = (totalUnitsLost <= 0)
    ? `
      <div class="bento-stat-card">
        <span class="stat-label">${t('result.bento.lostUnits')}</span>
        <span class="stat-value ok">0</span>
        <span style="font-size:11px; color:var(--text-muted); margin-top:2px;">${t('result.bento.noLosses')}</span>
      </div>
    `
    : `
      <div class="bento-stat-card" data-tooltip="${t('result.recovery.title')}: ${resTooltipSummary}">
        <span class="stat-label">${t('result.bento.lostUnits')}</span>
        <span class="stat-value warn">−${fmt(totalUnitsLost)} <span style="font-size:12px; font-weight:normal; color:var(--text-muted);">${t('result.bento.unitsUnit')}</span></span>
        <span style="font-size:11px; color:var(--text-muted); margin-top:2px;">${fmt(r.totalLostValue)} pts</span>
      </div>
    `;

  let recoveryHtml = '';
  if (totalUnitsLost > 0 && totalResources && Object.keys(totalResources).length > 0) {
    const unitsPills = Object.entries(totalLosses)
      .filter(([_, cnt]) => cnt > 0)
      .map(([u, cnt]) => renderUnitLossChip(u, cnt))
      .join(' ');

    const resPills = Object.entries(totalResources)
      .filter(([_, amt]) => amt > 0)
      .map(([rId, amt]) => {
        const icon = getResourceIcon(rId);
        const name = tResource(rId);
        return `
          <span class="recovery-res-pill font-mono" data-tooltip="${name}: ${fmt(amt)}">
            <span class="recovery-res-icon">${icon}</span>
            <span class="recovery-res-amt">+${fmt(amt)}</span>
            <span class="recovery-res-name">${name}</span>
          </span>
        `;
      }).join('');

    recoveryHtml = `
      <div class="recovery-resources-panel">
        <div class="recovery-header">
          <span class="recovery-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            ${t('result.recovery.title')}
          </span>
          <div class="recovery-units-summary">
            ${unitsPills}
          </div>
        </div>
        <div class="recovery-resources-grid">
          ${resPills}
        </div>
      </div>
    `;
  }

  let html = `
    <!-- Tactical Summary Dashboard -->
    <div class="dashboard-header">
      <div class="dashboard-title-group">
        <div class="dashboard-title">${t('result.title')}</div>
        <div class="dashboard-subtitle">${t('result.subtitle', { adv: $('adv').value, camps: r.waves.reduce((s, w) => s + w.attacks.length, 0) })}</div>
      </div>
      <div class="row gap-sm" style="margin:0;">
        <button class="sec" id="btnCopyPlan">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          ${t('result.btnCopy')}
        </button>
        <button class="sec" id="btnCopyClientPlan" style="${isClientScriptReady(r, 'all') ? '' : 'display:none;'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          ${t('result.btnCopyClient')}
        </button>
        <button class="pri" id="btnOpenAutobitModal" title="${t('result.btnAutobitTip')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
            <rect x="9" y="9" width="6" height="6"></rect>
            <line x1="9" y1="1" x2="9" y2="4"></line>
            <line x1="15" y1="1" x2="15" y2="4"></line>
            <line x1="9" y1="20" x2="9" y2="23"></line>
            <line x1="15" y1="20" x2="15" y2="23"></line>
          </svg>
          ${t('result.btnAutobit')}
        </button>
      </div>
    </div>

    <!-- Bento Stats -->
    <div class="bento-stats font-mono">
      <div class="bento-stat-card">
        <span class="stat-label">${t('result.bento.waves')}</span>
        <span class="stat-value accent">${r.waves.length}</span>
      </div>
      ${lossCardHtml}
      <div class="bento-stat-card">
        <span class="stat-label">${t('result.bento.generals')}</span>
        <span class="stat-value ok">${totalGeneralsUsed}</span>
      </div>
      <div class="bento-stat-card">
        <span class="stat-label">${t('result.bento.calcTime')}</span>
        <span class="stat-value">${fmt(r.seconds)}s</span>
      </div>
    </div>
    ${recoveryHtml}
  `;

  // Render Waves
  for (const w of r.waves) {
    const burnedMap = new Map((w.burned || []).map((b) => [b.uid, b]));
    
    // Format burned generals banner
    let burnedBanner = '';
    if (w.burned && w.burned.length > 0) {
      const freeList = w.burned.filter((b) => b.free).map((b) => b.name);
      const deadList = w.burned.filter((b) => !b.free).map((b) => b.name);
      burnedBanner = `
        <div style="padding:10px 14px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-sm); margin:10px 0; font-size:12px; display:flex; flex-direction:column; gap:4px;">
          ${deadList.length ? `<div><span class="tag-pill danger" style="margin-right:4px;">${t('wave.cooldown')}</span> ${t('wave.cooldownDesc', { list: deadList.join(', ') })}</div>` : ''}
          ${freeList.length ? `<div><span class="tag-pill ok" style="margin-right:4px;">${t('wave.freeRevive')}</span> ${t('wave.freeReviveDesc', { list: freeList.join(', ') })}</div>` : ''}
        </div>
      `;
    }

    html += `
      <div class="wave">
        <div class="wave-header">
          <div class="wave-title-wrap">
            <span class="wave-badge">${t('wave.badge', { num: w.index })}</span>
            <span class="wave-title">${t('wave.campsParallel', { count: w.attacks.length })}</span>
          </div>
          <div class="row gap-xs items-center" style="margin:0;">
            <div class="wave-summary-pills font-mono">
              <span class="summary-pill">${t('wave.stockBefore', { stock: fmtStockPills(w.stockBefore) })}</span>
            </div>
            <button class="sec btn-wave-copy-client" data-wave="${w.index}" style="${isClientScriptReady(r, w.index) ? '' : 'display:none; '}padding:2px 8px; font-size:11px; height:24px; white-space:nowrap;" title="${t('result.btnCopyWaveClient', { num: w.index })}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:3px;">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              ${t('result.btnCopyWaveClient', { num: w.index })}
            </button>
            <button class="sec btn-wave-autobit" data-wave="${w.index}" style="padding:2px 8px; font-size:11px; height:24px; white-space:nowrap;" title="${t('result.btnWaveAutobit', { num: w.index })}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:3px;">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
              </svg>
              ${t('result.btnWaveAutobit', { num: w.index })}
            </button>
          </div>
        </div>
        <div class="wave-body">
          ${burnedBanner}
    `;

    for (const a of w.attacks) {
      const lost = a.perUnit.filter((u) => u.lost > 0)
        .map((u) => renderUnitLossChip(u.id, u.lost)).join(' ') || `<span class="tag-pill ok">${t('atk.noLoss')}</span>`;
      
      const enemyUnits = Array.isArray(a.camp && a.camp.units)
        ? a.camp.units
        : Object.entries((a.camp && a.camp.units) || {}).map(([id, amount]) => ({ id, amount }));
      const enemy = enemyUnits.map((u) => renderUnitChip(u.id, u.amount)).join(' ');

      const squadHtml = (a.squad || []).map((s) => {
        const sLost = s.perUnit.filter((u) => u.lost > 0)
          .map((u) => renderUnitLossChip(u.id, u.lost)).join(' ') || t('atk.lostNone');
        
        const isOpener = s.role && (s.role.includes('вскрытие') || s.role.includes('opener') || s.role.includes('відкриття'));
        const roleClass = isOpener ? 'opener' : 'finisher';
        const roleLabel = tRole(s.role);

        // Check if general was sacrificed in this wave
        const burnInfo = burnedMap.get(s.general.uid);
        let burnBadge = '';
        if (burnInfo) {
          if (burnInfo.free) {
            burnBadge = `<span class="tag-pill ok" title="${t('atk.badgeRevivedTip')}">${t('atk.badgeRevived')}</span>`;
          } else {
            burnBadge = `<span class="tag-pill danger" title="${t('atk.badgeCooldownTip')}">${t('atk.badgeCooldown')}</span>`;
          }
        }

        return `
          <div class="step">
            <div class="step-header">
              <div class="step-gen-name">
                <span class="camp-order-badge" style="position:static; width:18px; height:18px; font-size:10px;">${s.order}</span>
                <span>${s.general.name}</span>
                <span class="dim" style="font-size:11px; font-weight:400;">(${s.general.base}, ${t('atk.cap', { cap: s.general.capacity })})</span>
                ${burnBadge}
              </div>
              <span class="step-role-badge ${roleClass}">${roleLabel}</span>
            </div>
            <div class="step-army font-mono">
              ${s.army.map((u) => renderUnitChip(u.id, u.amount)).join(' <span style="color:var(--text-dim); opacity:0.6; font-size:11px;">+</span> ')}
            </div>
            <div class="step-stats font-mono">
              <span>${t('atk.killed', { count: s.defKills })}</span>
              <span>${t('atk.rounds', { count: fmt(s.rounds) })}</span>
              <span>${t('atk.stepLosses', { losses: sLost })}</span>
            </div>
          </div>
        `;
      }).join('');

      let tagBadge = '';
      if (a.chained) {
        tagBadge = `<span class="tag-pill warn">${t('atk.chainBadge', { idx: a.chainIndex, total: a.chainTotal, path: a.chainCamps.join(' → ') })}</span>`;
      } else if (a.generalsUsed > 1) {
        tagBadge = `<span class="tag-pill warn">${t('atk.squadBadge', { count: a.generalsUsed })}</span>`;
      }

      html += `
        <div class="atk">
          <div class="atk-header">
            <div class="atk-camp-info">
              <span>${t('atk.camp', { num: a.camp.number })}</span>
              <span class="camp-type-pill ${campKind(a.camp.type)}">${tCampType(a.camp.type)}</span>
              <span class="dim" style="font-size:12px; font-weight:400;">(${t('atk.sector', { num: a.camp.sector })})</span>
            </div>
            <div>${tagBadge}</div>
          </div>

          <div class="enemy-box">
            <b>${t('atk.enemy')}</b> ${enemy}
          </div>

          <div class="squad-steps">
            ${squadHtml}
          </div>

          <div class="atk-footer font-mono">
            <div class="row gap-sm" style="margin:0; flex-wrap:wrap;">
              <span class="muted">${t('atk.losses')}</span>
              ${lost}
              <span class="dim">· ${t('atk.cost', { cost: fmt(a.lostValue) })}</span>
            </div>
            <div class="row gap-sm" style="margin:0;">
              <span class="tag-pill ok">${t('atk.victory')}</span>
              ${a.soloable === false ? `<span class="dim" style="font-size:10px;">${t('atk.soloNo')}</span>` : ''}
              ${a.sacrificeExempt ? `<span class="tag-pill warn" title="${t('atk.sacrificeBadge')}">${t('atk.sacrificeBadge')}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    html += `
        </div>
        <div class="wave-stock-footer font-mono">
          <div>${t('wave.armiesUsed', { stock: fmtStockPills(w.waveUsage) })}</div>
          <div>${t('wave.lossesDeducted', { stock: fmtStockPills(w.waveLosses) })}</div>
          <div>${t('wave.stockAfter', { stock: fmtStockPills(w.stockAfter) })}</div>
        </div>
    `;

    if (w.blocker) {
      html += `
        <div style="padding:10px 18px; background:rgba(245,158,11,0.1); border-top:1px solid rgba(245,158,11,0.2); font-size:12px; color:#fbbf24;">
          ${t('wave.blocker', { num: w.blocker.number, reason: tReason(w.blocker.reason), need: w.blocker.need })}
        </div>
      `;
    }

    html += '</div>';
  }

  // Unsolved warning
  if (r.unsolved && r.unsolved.length) {
    html += `
      <div class="panel-card" style="border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08);">
        <div style="font-weight:700; color:#f87171; margin-bottom:4px;">${t('unsolved.title', { camps: r.unsolved.map((c) => c.number).join(', ') })}</div>
        ${r.stopReason ? `<div class="dim" style="font-size:12px;">${t('unsolved.reason', { reason: r.stopReason })}</div>` : ''}
      </div>
    `;
  }

  $('out').innerHTML = html;

  if ($('btnCopyPlan')) {
    $('btnCopyPlan').onclick = copyPlanToClipboard;
  }
  if ($('btnCopyClientPlan')) {
    $('btnCopyClientPlan').onclick = () => copyClientScriptToClipboard();
  }
  if ($('btnDownloadClientPlan')) {
    $('btnDownloadClientPlan').onclick = () => downloadClientScript();
  }
  if ($('btnOpenAutobitModal')) {
    $('btnOpenAutobitModal').onclick = () => openAutobitModal();
  }
  document.querySelectorAll('.btn-wave-copy-client').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const waveNum = Number(btn.getAttribute('data-wave'));
      copyClientScriptToClipboard(waveNum);
    };
  });
  document.querySelectorAll('.btn-wave-autobit').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const waveNum = Number(btn.getAttribute('data-wave'));
      openAutobitModal(waveNum);
    };
  });
}

function isSameAdventure(advId, snap) {
  if (!snap || !advId) return false;
  const snapKey = (snap.adventureKey || '').toLowerCase();
  const snapName = (snap.adventureName || '').toLowerCase();
  const curId = String(advId).toLowerCase();
  if (snapKey === curId ||
      (snapKey && curId.includes(snapKey)) ||
      (snapName && curId.includes(snapName)) ||
      (snapKey && snapKey.includes(curId))) {
    return true;
  }
  const trans = typeof getAdventureTranslations === 'function' ? getAdventureTranslations(advId) : null;
  if (trans) {
    const vals = Object.values(trans).map((v) => String(v).toLowerCase());
    if (snapKey && vals.includes(snapKey)) return true;
    if (snapName && vals.includes(snapName)) return true;
    if (snapKey && vals.some((v) => v.includes(snapKey) || snapKey.includes(v))) return true;
    if (snapName && vals.some((v) => v.includes(snapName) || snapName.includes(v))) return true;
  }
  return false;
}

const BOSS_BUILDING_PATTERNS = /leader|boss|Dark_Castle|WitchTower|Bonechurch|EnchantedCastle|CursedTower|CursedCastle|AuroraTower|Palace.*leader|Residence.*leader|Stronghold.*leader/i;

function isLeaderOrBossCamp(camp, snapCamp) {
  if (snapCamp) {
    if (snapCamp.isLeader) return true;
    if (snapCamp.buildingKey && BOSS_BUILDING_PATTERNS.test(snapCamp.buildingKey)) return true;
    if (snapCamp.name && /вожак|босс|ватажок|leader|boss/i.test(snapCamp.name)) return true;
  }
  if (camp) {
    if (camp.isLeader) return true;
    if (camp.type === 'Leader' || camp.type === 'Boss') return true;
    if (camp.building && BOSS_BUILDING_PATTERNS.test(camp.building)) return true;
  }
  return false;
}

function findSnapshotCampForAttack(camp) {
  if (!LAST_ADVENTURE_SNAPSHOT || !Array.isArray(LAST_ADVENTURE_SNAPSHOT.camps) || !LAST_ADVENTURE_SNAPSHOT.camps.length) return null;
  const snapCamps = LAST_ADVENTURE_SNAPSHOT.camps;
  if (!camp) return null;

  // 1. Direct grid match if camp already has a grid
  if (camp.grid) {
    const found = snapCamps.find((sc) => sc.grid === camp.grid);
    if (found) return found;
  }

  const campIsLeader = isLeaderOrBossCamp(camp);

  // 2. Match by units composition
  const campUnits = camp.units;
  if (campUnits) {
    const cMap = {};
    if (Array.isArray(campUnits)) {
      for (const u of campUnits) {
        if (u && (u.id || u.name) && (u.amount || u.count) > 0) {
          const uid = u.id || u.name;
          const uamt = Number(u.amount || u.count);
          cMap[uid] = (cMap[uid] || 0) + uamt;
        }
      }
    } else if (typeof campUnits === 'object') {
      for (const [uid, uamt] of Object.entries(campUnits)) {
        if (Number(uamt) > 0) cMap[uid] = (cMap[uid] || 0) + Number(uamt);
      }
    }

    const cKeys = Object.keys(cMap);

    let candidates = snapCamps;
    if (camp.sector != null) {
      const bySector = snapCamps.filter((sc) => sc.sector === camp.sector);
      if (bySector.length > 0) candidates = bySector;
    }

    // Filter by leader/boss status: bosses only match bosses, regular camps only match regular camps
    const statusFiltered = candidates.filter((sc) => {
      const scIsLeader = isLeaderOrBossCamp(null, sc);
      return scIsLeader === campIsLeader;
    });
    const checkCandidates = statusFiltered.length > 0 ? statusFiltered : candidates;

    // Check if any candidate matching units also matches coordinates
    for (const sc of checkCandidates) {
      const scMap = {};
      if (Array.isArray(sc.units)) {
        for (const u of sc.units) {
          const uid = u && (u.id || u.name);
          const ucnt = Number(u && (u.count || u.amount || 0));
          if (uid && ucnt > 0) scMap[uid] = (scMap[uid] || 0) + ucnt;
        }
      } else if (sc.units && typeof sc.units === 'object') {
        for (const [uid, ucnt] of Object.entries(sc.units)) {
          if (Number(ucnt) > 0) scMap[uid] = (scMap[uid] || 0) + Number(ucnt);
        }
      }

      const scKeys = Object.keys(scMap);
      if (cKeys.length > 0 && cKeys.length === scKeys.length && cKeys.every((k) => cMap[k] === scMap[k])) {
        if (camp.coordinates && typeof camp.coordinates.x === 'number' && typeof camp.coordinates.y === 'number') {
          const cx = camp.coordinates.x;
          const cy = camp.coordinates.y;
          if (sc.coordinates && sc.coordinates.x === cx && sc.coordinates.y === cy) return sc;
          if (sc.grid > 0 && (sc.grid % 64 === cx && Math.floor(sc.grid / 64) === cy)) return sc;
        }
      }
    }

    // General unit match
    for (const sc of checkCandidates) {
      const scMap = {};
      if (Array.isArray(sc.units)) {
        for (const u of sc.units) {
          const uid = u && (u.id || u.name);
          const ucnt = Number(u && (u.count || u.amount || 0));
          if (uid && ucnt > 0) scMap[uid] = (scMap[uid] || 0) + ucnt;
        }
      } else if (sc.units && typeof sc.units === 'object') {
        for (const [uid, ucnt] of Object.entries(sc.units)) {
          if (Number(ucnt) > 0) scMap[uid] = (scMap[uid] || 0) + Number(ucnt);
        }
      }

      const scKeys = Object.keys(scMap);
      if (cKeys.length > 0 && cKeys.length === scKeys.length && cKeys.every((k) => cMap[k] === scMap[k])) {
        return sc;
      }
    }
  }

  // 3. Match by coordinates if available
  if (camp.coordinates && typeof camp.coordinates.x === 'number' && typeof camp.coordinates.y === 'number') {
    const cx = camp.coordinates.x;
    const cy = camp.coordinates.y;
    const byCoord = snapCamps.find((sc) => {
      const scIsLeader = isLeaderOrBossCamp(null, sc);
      if (scIsLeader !== campIsLeader) return false;
      if (sc.coordinates && sc.coordinates.x === cx && sc.coordinates.y === cy) return true;
      if (sc.grid > 0) {
        return (sc.grid % 64 === cx && Math.floor(sc.grid / 64) === cy);
      }
      return false;
    });
    if (byCoord) return byCoord;
  }

  // 4. Match by explicit camp number ONLY if snapshot camp has a matching number property
  if (camp.number != null) {
    const byExplicitNumber = snapCamps.find((sc) => sc.number === camp.number);
    if (byExplicitNumber) return byExplicitNumber;
  }

  return null;
}

function getCampClientTarget(camp) {
  if (!camp) return { target: 0, targetName: '', snapCamp: null };
  const snapCamp = findSnapshotCampForAttack(camp);
  if (snapCamp && snapCamp.grid > 0) {
    let name = snapCamp.name || '';
    if (typeof tBuilding === 'function') {
      const key = snapCamp.buildingKey || snapCamp.name || camp.building || '';
      if (key) {
        const tr = tBuilding(key);
        if (tr) name = tr;
      }
    }
    if (!name) name = camp.building && typeof tBuilding === 'function' ? tBuilding(camp.building) : '';
    if (!name) name = camp.type ? tCampType(camp.type) : 'Лагерь';
    return { target: snapCamp.grid, targetName: name, snapCamp };
  }

  let target = 0;
  if (camp.coordinates && typeof camp.coordinates.x === 'number' && typeof camp.coordinates.y === 'number') {
    target = camp.coordinates.x + camp.coordinates.y * 64;
  } else if (camp.position && typeof camp.position.x === 'number' && typeof camp.position.y === 'number') {
    target = camp.number || 0;
  } else {
    target = camp.number || 0;
  }

  let name = '';
  const b = camp.building || '';
  if (b && typeof tBuilding === 'function') {
    const tr = tBuilding(b);
    if (tr && tr !== b) name = tr;
  }

  if (!name) {
    if (b.includes('Banditsleader') || b.includes('leader') || camp.type === 'Leader') {
      name = typeof tBuilding === 'function' ? tBuilding('Banditsleader_Adventure') : 'Шатер вожака разбойников';
    } else if (b.includes('BanditsLvl2') || camp.type === 'Medium') {
      name = typeof tBuilding === 'function' ? tBuilding('BanditsLvl2_Adventure') : 'Лагерь разбойников (средний)';
    } else if (b.includes('BanditsLvl3') || camp.type === 'Heavy') {
      name = typeof tBuilding === 'function' ? tBuilding('BanditsLvl3_Adventure') : 'Лагерь разбойников (сложный)';
    } else if (b.includes('Bandits') || camp.type === 'Small') {
      name = typeof tBuilding === 'function' ? tBuilding('Bandits_Adventure') : 'Лагерь разбойников (легкий)';
    } else {
      name = camp.type ? tCampType(camp.type) : (typeof tBuilding === 'function' ? tBuilding('Bandits_Adventure') : 'Лагерь разбойников');
    }
  }

  return { target, targetName: name, snapCamp: null };
}

function getAutobitDelayTime() {
  const raw = ($('numAutobitTime') && Number($('numAutobitTime').value)) || 1000;
  return Math.max(0, Math.round(raw / 1000) * 1000);
}

function generateClientBattlePacket(waveIndex = null) {
  if (!LAST_PLAN_RESULT || !LAST_PLAN_RESULT.waves || !LAST_PLAN_RESULT.waves.length) return null;

  const specialists = getAutobitSpecialists();
  const waves = waveIndex != null
    ? LAST_PLAN_RESULT.waves.filter((w) => w.index === waveIndex)
    : LAST_PLAN_RESULT.waves;

  if (!waves.length) return null;

  const attacks = extractAttacksFromPlan(LAST_PLAN_RESULT, waveIndex != null ? waveIndex : 'all');
  if (!attacks.length) return null;

  const delayTime = getAutobitDelayTime();
  const rows = adaptPlanAttacksToSpecialists(attacks, specialists, delayTime);

  const packet = {};
  let currentOrder = 0;

  for (const r of rows) {
    const atk = r.atk;
    const spec = r.spec;
    const uid = spec ? spec.id : (atk.requiredUid || `gen_${currentOrder}`);

    let skillsObj = {};
    if (spec && spec.skills && typeof spec.skills === 'object' && !Array.isArray(spec.skills)) {
      skillsObj = spec.skills;
    }

    const rawName = (spec && spec.rawName) || `<b>${(spec && spec.name) || atk.requiredName}</b>`;
    const genType = (spec && spec.type != null) ? spec.type : 1;
    const genGrid = (spec && spec.grid != null) ? spec.grid : 0;
    const timeVal = r.calculatedTime != null ? r.calculatedTime : delayTime;

    packet[uid] = {
      grid: genGrid,
      name: rawName,
      order: currentOrder++,
      time: timeVal,
      skills: skillsObj,
      army: atk.army,
      type: genType,
      target: atk.target,
      targetName: atk.targetName,
    };
  }

  return packet;
}

function copyClientScriptToClipboard(waveIndex = null) {
  const isMultiWave = LAST_PLAN_RESULT && LAST_PLAN_RESULT.waves && LAST_PLAN_RESULT.waves.length > 1;
  const targetWave = waveIndex != null ? waveIndex : (isMultiWave ? 1 : null);

  if (!isClientScriptReady(LAST_PLAN_RESULT, targetWave)) {
    showToast(t('toast.autobitNeedPlan'), 'warn');
    return;
  }

  const packet = generateClientBattlePacket(targetWave);
  if (!packet || Object.keys(packet).length === 0) return;

  LAST_AUTOBIT_PACKET = packet;
  const jsonStr = JSON.stringify(packet, null, ' ');
  navigator.clipboard.writeText(jsonStr).then(() => {
    if (targetWave != null && isMultiWave) {
      showToast(t('toast.clientWaveCopied', { num: targetWave }), 'ok');
    } else {
      showToast(t('toast.clientCopied'), 'ok');
    }
  }).catch(() => {
    showToast(t('toast.copyFailed'), 'warn');
  });
}

function copyPlanToClipboard() {
  if (!LAST_PLAN_RESULT || !LAST_PLAN_RESULT.waves) return;

  const lines = [];
  lines.push(t('plan.header', { adv: $('adv').value }));
  lines.push(t('plan.summary', { waves: LAST_PLAN_RESULT.waves.length, losses: fmt(LAST_PLAN_RESULT.totalLostValue) }));

  if (LAST_PLAN_RESULT.totalUnitsLost > 0) {
    const lossesStr = Object.entries(LAST_PLAN_RESULT.totalLosses || {})
      .filter(([_, n]) => n > 0)
      .map(([u, n]) => `${tUnit(u)} −${fmt(n)}`)
      .join(', ');
    if (lossesStr) lines.push(t('plan.lossesSummary', { units: lossesStr }));
    if (LAST_PLAN_RESULT.totalResources && Object.keys(LAST_PLAN_RESULT.totalResources).length > 0) {
      const resStr = Object.entries(LAST_PLAN_RESULT.totalResources)
        .filter(([_, n]) => n > 0)
        .map(([r, n]) => `${fmt(n)} ${tResource(r)}`)
        .join(', ');
      if (resStr) lines.push(t('plan.resourcesSummary', { res: resStr }));
    }
  }
  lines.push('');

  for (const w of LAST_PLAN_RESULT.waves) {
    lines.push(t('plan.waveHeader', { wave: w.index, camps: w.attacks.length }));
    if (w.burned && w.burned.length) {
      const dead = w.burned.filter((b) => !b.free).map((b) => b.name);
      const revived = w.burned.filter((b) => b.free).map((b) => b.name);
      if (dead.length) lines.push(t('plan.cdLabel', { list: dead.join(', ') }));
      if (revived.length) lines.push(t('plan.reviveLabel', { list: revived.join(', ') }));
    }
    for (const a of w.attacks) {
      lines.push(t('plan.campHeader', { num: a.camp.number, type: tCampType(a.camp.type), sector: a.camp.sector }));
      for (const s of (a.squad || [])) {
        const armyStr = s.army.map((u) => `${u.amount} ${tUnit(u.id)}`).join(' + ');
        const sLost = s.perUnit.filter((u) => u.lost > 0).map((u) => `${tUnit(u.id)} -${fmt(u.lost)}`).join(', ') || t('plan.noLoss');
        lines.push(t('plan.attackLine', { order: s.order, gen: s.general.name, role: tRole(s.role), army: armyStr, losses: sLost }));
      }
    }
    lines.push('');
  }

  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    showToast(t('toast.copied'), 'ok');
  }).catch(() => {
    showToast(t('toast.copyFailed'), 'warn');
  });
}

function showToast(msg, type = 'ok') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 18px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      z-index: 10000;
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    `;
  }
  const toastHost = document.querySelector('dialog[open]') || document.body;
  if (toast.parentNode !== toastHost) toastHost.appendChild(toast);

  if (type === 'ok') {
    toast.style.background = 'rgba(16, 185, 129, 0.95)';
    toast.style.color = '#fff';
  } else {
    toast.style.background = 'rgba(245, 158, 11, 0.95)';
    toast.style.color = '#000';
  }

  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2500);
}

// ---------------------------------------------------------------------------
// Autobit Script Studio & In-Game UID Mapper
// ---------------------------------------------------------------------------
let LAST_AUTOBIT_PACKET = null;

const GAME_TYPE_BASES = {
  1: 'General', 3: 'General', 7: 'HalloweenGeneral', 8: 'General',
  9: 'EasterGeneral', 11: 'General', 13: 'MajorGeneral', 14: 'StarGeneral1',
  15: 'StarGeneral2', 16: 'StarGeneral3', 24: 'General', 25: 'LordDraculGeneral',
  27: 'SantaGeneral', 29: 'GeneralVargus', 30: 'GeneralAnslem', 31: 'GeneralNusala',
  33: 'Xmas2019General', 36: 'MedicGeneral', 37: 'MadScientistGeneral', 47: 'MajorGeneral',
  50: 'Halloween2019General', 56: 'AssassinGeneral', 57: 'SylvanaGeneral', 63: 'GhostGeneral',
  75: 'NutcrackerGeneral', 79: 'ResoluteGeneral', 85: 'GeneralJuan', 96: 'NarcissisticGeneral',
};

const BASE_TO_GAME_TYPE = {
  HalloweenGeneral: 7, EasterGeneral: 9, MajorGeneral: 13,
  StarGeneral1: 14, StarGeneral2: 15, StarGeneral3: 16,
  LordDraculGeneral: 25, SantaGeneral: 27, GeneralVargus: 29,
  GeneralAnslem: 30, GeneralNusala: 31, Xmas2019General: 33,
  MedicGeneral: 36, MadScientistGeneral: 37, Halloween2019General: 50,
  AssassinGeneral: 56, SylvanaGeneral: 57, GhostGeneral: 63,
  NutcrackerGeneral: 75, ResoluteGeneral: 79, GeneralJuan: 85,
  NarcissisticGeneral: 96, GeneralMary: 33, General: 1,
};

const GAME_NAME_BASES = [
  ['призрачн', 'GhostGeneral'], ['майор', 'MajorGeneral'],
  ['боевых искусств', 'StarGeneral3'], ['мастер защит', 'StarGeneral2'],
  ['мастер зашит', 'StarGeneral2'], ['медик', 'MedicGeneral'],
  ['безумн', 'MadScientistGeneral'], ['щелкунчик', 'NutcrackerGeneral'],
  ['шелкунчик', 'NutcrackerGeneral'], ['сильван', 'SylvanaGeneral'],
  ['хуан', 'GeneralJuan'], ['ветеран', 'EasterGeneral'],
  ['близнец', 'Halloween2019General'], ['решительн', 'ResoluteGeneral'],
  ['клаус', 'Xmas2019General'], ['жнец', 'HalloweenGeneral'],
  ['нарцис', 'NarcissisticGeneral'], ['скрыт', 'AssassinGeneral'],
  ['мери', 'GeneralMary'], ['крис', 'GeneralMary'],
];

function stripHtml(text) {
  const src = String(text == null ? '' : text);
  let out = '';
  let depth = 0;
  for (const ch of src) {
    if (ch === '<') { depth += 1; continue; }
    if (ch === '>') { if (depth > 0) depth -= 1; continue; }
    if (depth === 0) out += ch;
  }
  return out.split(' ').filter((part) => part !== '').join(' ').trim();
}

function baseFromGameGeneral(name, type, typeMap) {
  const byType = typeMap && (typeMap[type] || typeMap[String(type)]);
  if (byType) return byType;
  if (GAME_TYPE_BASES[type]) return GAME_TYPE_BASES[type];
  const lower = stripHtml(name).toLowerCase();
  for (const pair of GAME_NAME_BASES) if (lower.includes(pair[0])) return pair[1];
  return null;
}

function hasExtraLifeGeneral(spec) {
  if (!spec) return false;
  const base = spec.base || '';
  if (['GhostGeneral', 'NarcissisticGeneral', 'Halloween2019General'].includes(base)) return true;
  if (Array.isArray(spec.skills)) {
    return spec.skills.some((s) => typeof s === 'string' && s.startsWith('Skill_InstantRecovery'));
  }
  if (spec.skills && typeof spec.skills === 'object') {
    if (spec.skills.Skill_InstantRecovery || spec.skills['16'] || spec.skills[16]) return true;
  }
  if (spec.skillList && typeof spec.skillList === 'object') {
    if (spec.skillList.Skill_InstantRecovery || spec.skillList['16'] || spec.skillList[16]) return true;
  }
  return false;
}

function parseInGameSpecialists(raw) {
  if (!raw) return [];
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw.trim());
    } catch (e) {
      return [];
    }
  }

  if (data && typeof data === 'object' && (data.type === 'adventure_snapshot' || Array.isArray(data.camps))) {
    LAST_ADVENTURE_SNAPSHOT = {
      adventureName: data.adventureName || '',
      adventureKey: data.adventureKey || '',
      isAdventure: !!data.isAdventure,
      campsCount: data.campsCount || (Array.isArray(data.camps) ? data.camps.length : 0),
      camps: Array.isArray(data.camps) ? data.camps : [],
      zoneId: data.zoneId || 0,
      exportedAt: data.exportedAt || null,
      specialistsCount: Array.isArray(data.specialists) ? data.specialists.length : 0,
    };
  }

  let specs = [];
  if (Array.isArray(data)) {
    specs = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.specialists)) specs = data.specialists;
    else if (Array.isArray(data.generals)) specs = data.generals;
    else {
      const norm = normalizeExport(data);
      if (norm && Array.isArray(norm.specialists)) specs = norm.specialists;
    }
  }

  return specs.map((s, idx) => {
    const rawName = s.rawName || (s.name ? (s.name.includes('<b') ? s.name : `<b>${s.name}</b>`) : `<b>${s.base || 'General'}</b>`);
    const cleanName = stripHtml(s.name || s.base || `General ${idx + 1}`);
    const resolvedType = s.type != null ? s.type : (BASE_TO_GAME_TYPE[s.base] || 1);
    const resolvedBase = s.base || baseFromGameGeneral(cleanName, resolvedType) || 'General';
    const cap = Number(s.capacity) || 200;
    return {
      id: String(s.id != null ? s.id : (s.uid != null ? s.uid : `spec_${idx + 1}`)),
      name: cleanName,
      rawName,
      base: resolvedBase,
      type: resolvedType,
      grid: s.grid != null ? Number(s.grid) : 0,
      capacity: cap,
      skills: s.skills || {},
      skillPoints: s.skillPoints || 0,
      iconId: s.iconId || null,
      has1UP: hasExtraLifeGeneral({ base: resolvedBase, skills: s.skills }),
      distancesToCamps: s.distancesToCamps || {},
    };
  });
}

function extractAttacksFromPlan(plan, targetWave = 'all') {
  if (!plan || !plan.waves) return [];
  const list = [];
  const waves = (targetWave === 'all' || targetWave == null)
    ? plan.waves
    : plan.waves.filter((w) => w.index === Number(targetWave));

  let globalOrder = 0;
  for (const w of waves) {
    for (const a of (w.attacks || [])) {
      const { target, targetName, snapCamp } = getCampClientTarget(a.camp);
      const squad = a.squad || [];

      for (let sIdx = 0; sIdx < squad.length; sIdx++) {
        const s = squad[sIdx];
        const g = s.general || {};
        const armyMap = {};
        let totalUnits = 0;
        for (const u of (s.army || [])) {
          if (u.amount > 0) {
            armyMap[u.id] = u.amount;
            totalUnits += u.amount;
          }
        }

        const role = String(s.role || '');
        const isOpener = role.includes('вскрытие') || role.includes('opener') || role.includes('відкриття');
        const isLeader = isLeaderOrBossCamp(a.camp, snapCamp);

        list.push({
          waveIndex: w.index,
          campNumber: a.camp ? a.camp.number : 0,
          campType: a.camp ? a.camp.type : 'Small',
          order: globalOrder++,
          stepOrder: s.order || (sIdx + 1),
          requiredUid: g.uid != null ? String(g.uid) : null,
          requiredBase: g.base || 'General',
          requiredName: stripHtml(g.name || g.base || 'General'),
          requiredCapacity: totalUnits,
          army: armyMap,
          isSacrifice: isOpener,
          isLeader,
          target,
          targetName,
          camp: a.camp || null,
          snapCamp: snapCamp || null,
          role: role || 'solo',
          time: 1000,
        });
      }
    }
  }
  return list;
}

const escAb = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let AUTOBIT_STATE = { specialists: [], rows: [], status: 'noPlan', missingCount: 0, adaptedCount: 0 };

function getAutobitSpecialists() {
  const area = $('autobitGenJsonArea');
  const text = area ? area.value.trim() : '';
  if (text) return parseInGameSpecialists(text);
  const saved = S.get('studioGenerals', null) || S.get('clientGenerals', null);
  if (saved) return parseInGameSpecialists(saved);
  return [];
}

function getGeneralTravelSpeed(specOrGen) {
  const base = (specOrGen && (specOrGen.base || specOrGen.name)) || '';
  const isSlow = base === 'General' || base === 'BattleGeneral' || base === 'TavernGeneral';
  let speedMultiplier = isSlow ? 1.0 : 2.0;

  let speedSkillLevel = 0;
  if (specOrGen && specOrGen.skills && typeof specOrGen.skills === 'object') {
    speedSkillLevel = Number(specOrGen.skills['5'] || specOrGen.skills[5] || specOrGen.skills['Skill_IncreaseCombatSpeed'] || 0);
  }
  if (speedSkillLevel > 0) {
    speedMultiplier *= (1.0 + speedSkillLevel * 0.11);
  }
  return {
    multiplier: speedMultiplier,
    isSlow,
    tilesPerSec: speedMultiplier * 0.30,
  };
}

function getGridDist(g1, g2) {
  if (g1 > 0 && g2 > 0) {
    const W = 64;
    const x1 = g1 % W;
    const y1 = Math.floor(g1 / W);
    const x2 = g2 % W;
    const y2 = Math.floor(g2 / W);
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }
  return 0;
}

function getDistanceBetweenPoints(spec, targetGrid, snapCamp) {
  if (spec && spec.distancesToCamps && targetGrid > 0) {
    const d = spec.distancesToCamps[targetGrid] || spec.distancesToCamps[String(targetGrid)];
    if (d > 0) return Number(d);
  }
  if (snapCamp && snapCamp.distances && spec && spec.id) {
    const d = snapCamp.distances[spec.id];
    if (d > 0) return Number(d);
  }
  const g1 = spec && spec.grid ? Number(spec.grid) : 0;
  if (g1 > 0 && targetGrid > 0) {
    const d = getGridDist(g1, targetGrid);
    if (d > 0) return Math.round(d * 10) / 10;
  }
  return 35;
}

function getDistanceBetweenCamps(campA, campB) {
  const gA = campA && (campA.grid || campA.target);
  const gB = campB && (campB.grid || campB.target);
  if (campA && campA.distancesToOtherCamps && gB) {
    const d = campA.distancesToOtherCamps[gB] || campA.distancesToOtherCamps[String(gB)];
    if (d > 0) return Number(d);
  }
  if (campB && campB.distancesToOtherCamps && gA) {
    const d = campB.distancesToOtherCamps[gA] || campB.distancesToOtherCamps[String(gA)];
    if (d > 0) return Number(d);
  }
  if (gA > 0 && gB > 0) {
    return Math.round(getGridDist(gA, gB) * 10) / 10;
  }
  return 20;
}

function estimateTravelDistance(spec, atk) {
  const tGrid = atk && atk.target ? Number(atk.target) : 0;

  // 1. Exact pathfinding distance from client snapshot
  if (spec && spec.distancesToCamps && tGrid > 0) {
    const d = spec.distancesToCamps[tGrid] || spec.distancesToCamps[String(tGrid)];
    if (d > 0 && d <= 50) return Number(d);
  }
  if (atk && atk.snapCamp && atk.snapCamp.distances && spec && spec.id) {
    const d = atk.snapCamp.distances[spec.id];
    if (d > 0 && d <= 50) return Number(d);
  }

  // 2. Sector-based realistic adventure distance
  if (atk && atk.camp && atk.camp.sector) {
    const s = Number(atk.camp.sector) || 1;
    return Math.min(35, 14 + (s - 1) * 4);
  }

  // 3. Euclidean grid path estimation
  const gGrid = spec && spec.grid ? Number(spec.grid) : 0;
  if (gGrid > 100 && tGrid > 100) {
    const d = getGridDist(gGrid, tGrid);
    if (d >= 5 && d <= 45) return Math.round(d * 10) / 10;
  }
  return 18;
}

function calculateSafeAttackTimings(rows, baseDelayMs = 1000) {
  // Ensure base delay is an exact multiple of 1 second (1000 ms)
  const normBaseDelayMs = Math.max(1000, Math.round(baseDelayMs / 1000) * 1000);
  const baseSec = Math.round(normBaseDelayMs / 1000);

  if (!rows || !rows.length) return;

  // First attack in wave: always base delay
  rows[0].calculatedTime = normBaseDelayMs;
  rows[0].timingType = 'base';
  rows[0].timingBadge = `${baseSec} s`;
  rows[0].timingDesc = t('autobit.timingBase');

  for (let idx = 1; idx < rows.length; idx++) {
    const prevR = rows[idx - 1];
    const currR = rows[idx];

    const prevAtk = prevR.atk;
    const currAtk = currR.atk;

    const prevCampNum = prevAtk ? prevAtk.campNumber : 0;
    const currCampNum = currAtk ? currAtk.campNumber : 0;

    const prevSpeed = getGeneralTravelSpeed(prevR.spec || prevAtk);
    const currSpeed = getGeneralTravelSpeed(currR.spec || currAtk);

    // Case 1: Squad attack on the SAME camp (e.g. Opener -> Closer on same camp)
    if (prevCampNum > 0 && prevCampNum === currCampNum) {
      const prevDist = estimateTravelDistance(prevR.spec, prevAtk);
      const currDist = estimateTravelDistance(currR.spec, currAtk);

      const prevTravelSec = prevDist / prevSpeed.tilesPerSec;
      const currTravelSec = currDist / currSpeed.tilesPerSec;

      let safeSec = 6;
      let isOvertake = false;

      if (currSpeed.multiplier > prevSpeed.multiplier) {
        // Closer is faster than opener (e.g. 2x Boris vs 1x Tavern): must wait so opener stays ahead
        isOvertake = true;
        safeSec = Math.max(15, Math.ceil((prevTravelSec - currTravelSec) + 8));
      } else {
        // Same speed or closer is slower: standard safe spacing between squad waves
        safeSec = Math.max(6, Math.ceil((prevTravelSec - currTravelSec) + 6));
      }

      safeSec = Math.min(30, Math.max(baseSec, safeSec));
      currR.calculatedTime = safeSec * 1000;
      currR.timingType = isOvertake ? 'overtake' : 'squad';
      currR.timingBadge = `🛡 ${safeSec} s`;
      currR.timingDesc = isOvertake
        ? t('autobit.timingOvertake', { v1: prevSpeed.multiplier.toFixed(1), v2: currSpeed.multiplier.toFixed(1) })
        : t('autobit.timingSafe');
      continue;
    }

    // Case 2: Attacks on DIFFERENT camps (prev attacks Camp A, curr attacks Camp B)
    const prevIsLeader = isLeaderOrBossCamp(prevAtk ? prevAtk.camp : null, prevAtk ? prevAtk.snapCamp : null);

    // 2A: If the PREVIOUS camp was a Leader or Boss:
    // Leader/Boss camps do NOT have an interception zone (граница отвлечения отсутствует),
    // and will NEVER intercept passing generals.
    // Therefore, the next attacking general has MINIMAL waiting (base delay, e.g. 1 s).
    if (prevIsLeader) {
      currR.calculatedTime = normBaseDelayMs;
      currR.timingType = 'afterLeader';
      currR.timingBadge = `${baseSec} s`;
      currR.timingDesc = t('autobit.timingAfterLeader');
      continue;
    }

    // 2B: If the PREVIOUS camp was a REGULAR camp:
    // It has an active red interception zone. The current general (whether attacking a boss
    // or another camp) risks being intercepted by the previous camp UNTIL the previous general
    // arrives at that camp and locks it in combat (disabling its red aggro zone).
    // Therefore, the current general MUST wait for the previous general to reach that camp and engage!
    const travelDist = estimateTravelDistance(prevR.spec, prevAtk);
    const prevTravelSec = travelDist / prevSpeed.tilesPerSec;

    // Full arrival time at previous camp + 2s combat engagement buffer
    let safeDelaySec = Math.ceil(prevTravelSec + 2);

    // If current general is faster than previous general (e.g. 2x Boris vs 1x Tavern):
    // add extra buffer so the faster general cannot catch up on the road
    if (currSpeed.multiplier > prevSpeed.multiplier) {
      safeDelaySec += 6;
    }

    // Realistic range for regular camp march: between 15s and 45s (rounded to whole seconds)
    safeDelaySec = Math.min(45, Math.max(15, safeDelaySec));

    currR.calculatedTime = safeDelaySec * 1000;
    currR.timingType = 'interception';
    currR.timingBadge = `🛡 ${safeDelaySec} s`;
    currR.timingDesc = t('autobit.timingInterception', {
      camp: prevCampNum || idx,
      dist: Math.round(travelDist),
    });
  }
}

function adaptPlanAttacksToSpecialists(attacks, specialists, baseDelayMs = 1000) {
  const byId = new Map(specialists.map((s) => [String(s.id), s]));
  const assignedUids = new Set();
  const rows = [];

  // Pass 1: Direct UID match
  for (const atk of attacks) {
    if (atk.requiredUid != null && byId.has(String(atk.requiredUid)) && !assignedUids.has(String(atk.requiredUid))) {
      const spec = byId.get(String(atk.requiredUid));
      assignedUids.add(String(spec.id));
      rows.push({ atk, spec, adapted: false });
    } else {
      rows.push({ atk, spec: null, adapted: false });
    }
  }

  // Pass 2: Match unassigned attacks to available specialists by base class, capacity, 1-UP
  for (const r of rows) {
    if (r.spec) continue;
    const atk = r.atk;
    const candidates = specialists.filter((s) => !assignedUids.has(String(s.id)));
    if (!candidates.length) continue;

    let best = null;
    let bestScore = -1;

    for (const cand of candidates) {
      let score = 0;
      const sameBase = cand.base === atk.requiredBase;
      if (sameBase) score += 100;
      else continue;

      if (cand.capacity >= atk.requiredCapacity) score += 50;
      else score -= 30;

      if (atk.isSacrifice && cand.has1UP) score += 20;
      if (!atk.isSacrifice && !cand.has1UP) score += 5;

      if (cand.grid && cand.grid > 0) score += 10;

      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    if (best) {
      r.spec = best;
      r.adapted = true;
      assignedUids.add(String(best.id));
    }
  }

  calculateSafeAttackTimings(rows, baseDelayMs);
  return rows;
}

// Checks if the Master Planner script is connected, in-game specialists with UIDs
// are obtained, and all generals deployed in the plan/wave match those game specialists.
function isClientScriptReady(plan = LAST_PLAN_RESULT, waveIndex = null) {
  if (!plan || !plan.waves || !plan.waves.length) return false;
  const specialists = getAutobitSpecialists();
  if (!specialists.length) return false;

  const attacks = extractAttacksFromPlan(plan, waveIndex != null ? waveIndex : 'all');
  if (!attacks.length) return false;

  const rows = adaptPlanAttacksToSpecialists(attacks, specialists);
  return rows.every((r) => r.spec != null);
}

function updateClientCopyButtonsVisibility() {
  const mainBtn = $('btnCopyClientPlan');
  if (mainBtn) {
    mainBtn.style.display = isClientScriptReady(LAST_PLAN_RESULT, 'all') ? '' : 'none';
  }
  document.querySelectorAll('.btn-wave-copy-client').forEach((btn) => {
    const waveNum = btn.dataset.wave ? Number(btn.dataset.wave) : null;
    btn.style.display = isClientScriptReady(LAST_PLAN_RESULT, waveNum) ? '' : 'none';
  });
}

function updateAutobitGenBadge(count) {
  const badge = $('autobitGenBadge');
  if (!badge) return;
  badge.textContent = count ? t('autobit.genLoadedBadge', { count }) : t('autobit.genNoneBadge');
  badge.classList.toggle('ok', !!count);
  badge.classList.toggle('warn', !count);
}

function renderAutobitSnapshotBanner() {
  const banner = $('autobitSnapshotBanner');
  if (!banner) return;
  if (!LAST_ADVENTURE_SNAPSHOT || !LAST_ADVENTURE_SNAPSHOT.adventureName) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }
  const snap = LAST_ADVENTURE_SNAPSHOT;
  const isAdv = snap.isAdventure;
  const title = t('autobit.snapshotBadge', { name: snap.adventureName });
  const info = t('autobit.snapshotInfo', {
    camps: snap.campsCount || 0,
    gens: snap.specialistsCount || 0,
  });
  banner.style.display = 'block';
  banner.innerHTML = `
    <div class="autobit-banner ${isAdv ? 'ok' : 'info'}" style="margin:0; padding:8px 12px; font-size:12px;">
      <div class="autobit-banner-text">
        <b>${isAdv ? '⚔️' : '🏰'} ${escAb(title)}</b> · <span class="dim">${escAb(info)}</span>
      </div>
    </div>
  `;
}

function getSelectedAutobitWave() {
  const sel = $('selAutobitWave');
  return sel && sel.value ? sel.value : 'all';
}

function resetAutobitResult() {
  LAST_AUTOBIT_PACKET = null;
  if ($('cardAutobitResults')) $('cardAutobitResults').style.display = 'none';
}

// Rebuilds the attack preview table and automatically adapts simulation
// requirements to the available in-game specialists with safe attack timings.
function refreshAutobitPreview() {
  const specialists = getAutobitSpecialists();
  updateAutobitGenBadge(specialists.length);
  renderAutobitSnapshotBanner();

  const delayTime = getAutobitDelayTime();
  const attacks = extractAttacksFromPlan(LAST_PLAN_RESULT, getSelectedAutobitWave());
  const rows = adaptPlanAttacksToSpecialists(attacks, specialists, delayTime);
  const missingCount = rows.filter((r) => !r.spec).length;
  const adaptedCount = rows.filter((r) => r.adapted).length;

  let status = 'ok';
  if (!attacks.length) status = 'noPlan';
  else if (!specialists.length) status = 'noGenerals';
  else if (missingCount) status = 'mismatch';

  AUTOBIT_STATE = { specialists, rows, status, missingCount, adaptedCount };
  resetAutobitResult();
  renderAutobitPlanStatus();
  renderAutobitTable();

  const btn = $('btnAutobitAnalyze');
  if (btn) btn.disabled = status !== 'ok';
  if ($('autobitBuildHint')) {
    $('autobitBuildHint').textContent = status === 'ok' ? t('autobit.buildHintOk') : t('autobit.buildHintBlocked');
  }
  updateClientCopyButtonsVisibility();
}

function renderAutobitPlanStatus() {
  const box = $('autobitPlanStatus');
  if (!box) return;
  const { status, rows, missingCount, adaptedCount } = AUTOBIT_STATE;
  const total = rows.length;
  let cls = 'ok';
  let text = '';
  let action = '';
  if (status === 'noPlan') {
    cls = 'warn';
    text = t('autobit.planNone');
  } else if (status === 'noGenerals') {
    cls = 'info';
    text = t('autobit.planNoGenerals');
  } else if (status === 'mismatch') {
    cls = 'danger';
    text = t('autobit.planMismatch', { missing: missingCount, total });
    action = `<button class="pri sm" id="btnAutobitApplyRecalc" style="white-space:nowrap;">${t('autobit.btnApplyRecalc')}</button>`;
  } else if (adaptedCount > 0) {
    text = t('autobit.planAdapted', { total });
  } else {
    text = t('autobit.planOk', { total });
  }
  box.innerHTML = `<div class="autobit-banner ${cls}"><div class="autobit-banner-text">${text}</div>${action}</div>`;
  if ($('btnAutobitApplyRecalc')) $('btnAutobitApplyRecalc').onclick = applyAutobitGeneralsAndRecalc;
}

function renderAutobitTable() {
  const tbody = $('autobitTableBody');
  if (!tbody) return;
  const { rows, specialists } = AUTOBIT_STATE;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="autobit-empty">${t('autobit.tableEmpty')}</td></tr>`;
    return;
  }
  const hasGenerals = specialists.length > 0;
  tbody.innerHTML = rows.map((r, idx) => {
    const atk = r.atk;
    const s = r.spec;
    const armyChips = Object.entries(atk.army || {})
      .filter(([, amt]) => amt > 0)
      .map(([id, amt]) => renderUnitChip(id, amt))
      .join(' ');
    const opener = atk.isSacrifice ? ` <span class="tag-pill warn" style="font-size:10px;">${t('autobit.roleOpener')}</span>` : '';

    let inGame;
    if (s) {
      const adaptedPill = r.adapted ? `<span class="tag-pill info" style="font-size:10px; margin-right:4px;" title="${escAb(t('autobit.adaptedDesc'))}">⚡ ${t('autobit.adaptedTag')}</span>` : '';
      const gridBadge = s.grid > 0 ? `<span class="tag-pill ok font-mono" style="font-size:10px; margin-left:4px;" title="Garrison grid">#${s.grid}</span>` : '';
      inGame = `<div style="font-weight:700; color:#f1f5f9; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
          ${adaptedPill}<span>${escAb(s.name)}</span>${gridBadge}
        </div>
        <div class="dim font-mono" style="font-size:11px;">UID: ${escAb(s.id)} · ${t('atk.cap', { cap: s.capacity })}</div>`;
    } else if (hasGenerals) {
      inGame = `<span class="tag-pill danger">${t('autobit.notInList')}</span>`;
    } else {
      inGame = '<span class="dim">—</span>';
    }

    const timingBadge = r.timingBadge || `${Math.round((r.calculatedTime || 1000) / 1000)} s`;
    const isOvertake = r.timingType === 'overtake';
    const timingPill = `<div style="display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
      <span class="tag-pill ${isOvertake ? 'warn' : 'ok'}" style="font-size:11px; font-weight:700; white-space:nowrap;" title="${escAb(r.timingDesc || '')}">${timingBadge}</span>
      <span class="dim" style="font-size:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escAb(r.timingDesc || '')}">${escAb(r.timingDesc || '')}</span>
    </div>`;

    return `
      <tr class="${hasGenerals && !s ? 'missing' : ''}">
        <td class="font-mono" style="font-weight:700;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; font-size:12px; display:flex; align-items:center; gap:4px;">
            <span>${t('atk.camp', { num: atk.campNumber })}</span>
            ${atk.isLeader ? `<span class="tag-pill info" style="font-size:9px;" title="${escAb(t('autobit.campLeaderBadge'))}">👑 ${t('camp.legend.boss')}</span>` : ''}
          </div>
          <div class="dim" style="font-size:11px;">${escAb(atk.targetName)} · ID ${escAb(atk.target)}</div>
        </td>
        <td>
          <div style="font-weight:600; color:#93c5fd; font-size:12px;">${escAb(atk.requiredName)}${opener}</div>
          <div class="dim" style="font-size:11px;">${escAb(atk.requiredBase)}</div>
        </td>
        <td class="font-mono">${armyChips}</td>
        <td>${inGame}</td>
        <td>${timingPill}</td>
      </tr>
    `;
  }).join('');
}

async function copyTextAutobit(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      (document.querySelector('dialog[open]') || document.body).appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e2) {
      return false;
    }
  }
}

async function buildAutobitScript() {
  refreshAutobitPreview();
  const st = AUTOBIT_STATE;
  if (st.status === 'noPlan') { showToast(t('toast.autobitNeedPlan'), 'warn'); return; }
  if (st.status === 'noGenerals') { showToast(t('toast.autobitNoGenerals'), 'warn'); return; }
  if (st.status === 'mismatch') { showToast(t('toast.autobitMismatch'), 'warn'); return; }

  const delayTime = getAutobitDelayTime();
  const packet = {};
  st.rows.forEach((r, idx) => {
    const s = r.spec;
    const atk = r.atk;
    packet[s.id] = {
      grid: s.grid != null ? s.grid : 0,
      name: s.rawName || `<b>${s.name}</b>`,
      order: idx,
      time: r.calculatedTime != null ? r.calculatedTime : delayTime,
      skills: s.skills || {},
      army: atk.army,
      type: s.type != null ? s.type : 1,
      target: atk.target,
      targetName: atk.targetName,
    };
  });

  LAST_AUTOBIT_PACKET = packet;
  const jsonStr = JSON.stringify(packet, null, ' ');
  if ($('autobitScriptOutput')) $('autobitScriptOutput').textContent = jsonStr;
  if ($('autobitStatusPills')) {
    $('autobitStatusPills').innerHTML = `<span class="tag-pill ok">${t('autobit.summarySuccess', { count: st.rows.length })}</span>`;
  }
  const card = $('cardAutobitResults');
  if (card) {
    card.style.display = 'flex';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const copied = await copyTextAutobit(jsonStr);
  showToast(copied ? t('toast.autobitScriptCopied') : t('toast.autobitCopyManual'), copied ? 'ok' : 'warn');
}

function openAutobitModal(targetWave = null) {
  const modal = $('autobitModal');
  if (!modal) return;

  // The Autobit script runs one wave at a time, so a wave is always selected.
  const selWave = $('selAutobitWave');
  if (selWave) {
    const waves = (LAST_PLAN_RESULT && LAST_PLAN_RESULT.waves) || [];
    if (!waves.length) {
      selWave.innerHTML = `<option value="all">${t('autobit.waveNone')}</option>`;
      selWave.disabled = true;
    } else {
      selWave.innerHTML = waves.map((w) => `<option value="${w.index}">${t('autobit.waveNum', { num: w.index })}</option>`).join('');
      selWave.disabled = waves.length === 1;
      const prev = selWave.dataset.last;
      let want = String(waves[0].index);
      if (targetWave != null && waves.some((w) => w.index === Number(targetWave))) want = String(targetWave);
      else if (prev && waves.some((w) => String(w.index) === prev)) want = prev;
      selWave.value = want;
      selWave.dataset.last = want;
    }
  }

  const area = $('autobitGenJsonArea');
  const saved = S.get('studioGenerals', null);
  if (saved && area && !area.value.trim()) area.value = JSON.stringify(saved, null, ' ');

  if (!modal.open) {
    if (modal.showModal) modal.showModal();
    else modal.setAttribute('open', '');
  }
  refreshAutobitPreview();
}

function closeAutobitModal() {
  const modal = $('autobitModal');
  if (!modal) return;
  if (modal.close) modal.close();
  else modal.removeAttribute('open');
}

async function copyAutobitScript() {
  if (!LAST_AUTOBIT_PACKET || Object.keys(LAST_AUTOBIT_PACKET).length === 0) {
    showToast(t('toast.autobitNeedPlan'), 'warn');
    return;
  }
  const copied = await copyTextAutobit(JSON.stringify(LAST_AUTOBIT_PACKET, null, ' '));
  showToast(copied ? t('toast.autobitScriptCopied') : t('toast.copyFailed'), copied ? 'ok' : 'warn');
}

// Makes the in-game generals the calculator's main roster (all enabled).
async function saveAutobitGeneralsToRoster() {
  const jsonText = $('autobitGenJsonArea') ? $('autobitGenJsonArea').value.trim() : '';
  if (!jsonText) {
    showToast(t('toast.autobitNoGenerals'), 'warn');
    return false;
  }
  try {
    const data = JSON.parse(jsonText);
    if (!parseInGameSpecialists(data).length) {
      showToast(t('toast.autobitParseEmpty'), 'warn');
      return false;
    }
    S.set('studioGenerals', data);
    S.set('clientGenerals', data);
    S.set('generalsExport', data);
    localStorage.removeItem('tsoplan.enabledGenerals');
    await applyGeneralsExport(data);
    S.set('enabledGenerals', GENERALS.map((g) => g.uid));
    renderGeneralsTable(GENERALS);
    showToast(t('toast.autobitSavedToRoster'), 'ok');
    refreshAutobitPreview();
    return true;
  } catch (e) {
    showToast(t('toast.jsonError', { err: e.message }), 'warn');
    return false;
  }
}

async function applyAutobitGeneralsAndRecalc() {
  const ok = await saveAutobitGeneralsToRoster();
  if (!ok) return;
  const camps = ($('camps').value || '').split(/[,\s]+/).filter(Boolean);
  if (!camps.length) {
    showToast(t('toast.needCamps'), 'warn');
    return;
  }
  const wave = getSelectedAutobitWave();
  const before = LAST_PLAN_RESULT;
  closeAutobitModal();
  await run();
  if (LAST_PLAN_RESULT && LAST_PLAN_RESULT !== before) {
    openAutobitModal(wave !== 'all' ? wave : null);
  }
}

function loadAutobitGeneralsData(data) {
  const specs = parseInGameSpecialists(data);
  if (!specs.length) {
    showToast(t('toast.autobitParseEmpty'), 'warn');
    return false;
  }
  if ($('autobitGenJsonArea')) $('autobitGenJsonArea').value = JSON.stringify(data, null, ' ');
  S.set('studioGenerals', data);
  if (data && (data.type === 'adventure_snapshot' || Array.isArray(data.camps))) {
    const name = data.adventureName || 'Adventure';
    const cCount = data.campsCount || (Array.isArray(data.camps) ? data.camps.length : 0);
    showToast(t('toast.snapshotLoaded', { name, camps: cCount, gens: specs.length }), 'ok');
    const currentAdv = $('adv') ? $('adv').value : '';
    const advList = (META && Array.isArray(META.adventures)) ? META.adventures : [];
    if (advList.length > 0 && (data.adventureKey || data.adventureName)) {
      const advMatch = advList.find((id) =>
        id === data.adventureKey ||
        tAdv(id) === data.adventureName ||
        (getAdventureTranslations(id) && Object.values(getAdventureTranslations(id)).some((v) => v === data.adventureName))
      );
      if (advMatch && advMatch !== currentAdv && $('adv')) {
        $('adv').value = advMatch;
        S.set('adventure', advMatch);
        updateDockSummary();
        loadAdventureInfo();
      }
    }
  } else {
    showToast(t('toast.autobitGenLoaded', { count: specs.length }), 'ok');
  }
  refreshAutobitPreview();
  return true;
}

function initAutobitJsonResize() {
  const handle = $('autobitGenJsonResize');
  const area = $('autobitGenJsonArea');
  if (!handle || !area) return;
  const clamp = (h) => Math.max(120, Math.min(window.innerHeight * 0.8, h));
  const saved = Number(S.get('autobitJsonHeight', 0));
  if (saved) area.style.height = clamp(saved) + 'px';

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('dragging');
    const startY = e.clientY;
    const startH = area.getBoundingClientRect().height;
    const move = (ev) => { area.style.height = clamp(startH + ev.clientY - startY) + 'px'; };
    const up = () => {
      handle.classList.remove('dragging');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      S.set('autobitJsonHeight', Math.round(area.getBoundingClientRect().height));
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });

  // Double click toggles between compact and tall sizes.
  handle.addEventListener('dblclick', () => {
    const h = area.getBoundingClientRect().height < 400 ? clamp(window.innerHeight * 0.6) : 220;
    area.style.height = h + 'px';
    S.set('autobitJsonHeight', Math.round(h));
  });
}

function initAutobitStudioEvents() {
  if ($('btnAutobitClose')) $('btnAutobitClose').onclick = closeAutobitModal;
  if ($('btnAutobitCloseFooter')) $('btnAutobitCloseFooter').onclick = closeAutobitModal;

  if ($('btnAutobitCopyPath')) {
    $('btnAutobitCopyPath').onclick = async () => {
      const ok = await copyTextAutobit('%LOCALAPPDATA%\\tso_portable\\userscripts');
      showToast(ok ? t('toast.pathCopied') : t('toast.copyFailed'), ok ? 'ok' : 'warn');
    };
  }

  if ($('btnAutobitPasteGen')) {
    $('btnAutobitPasteGen').onclick = async () => {
      try {
        let text = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
          text = await navigator.clipboard.readText();
        } else {
          text = prompt(t('autobit.genHint'));
        }
        if (!text || !text.trim()) {
          showToast(t('toast.clipboardEmpty'), 'warn');
          return;
        }
        loadAutobitGeneralsData(JSON.parse(text.trim()));
      } catch (err) {
        showToast(t('toast.jsonError', { err: err.message }), 'warn');
      }
    };
  }

  if ($('fileAutobitGen')) {
    $('fileAutobitGen').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        loadAutobitGeneralsData(JSON.parse(await file.text()));
      } catch (err) {
        showToast(t('toast.jsonError', { err: err.message }), 'warn');
      } finally {
        e.target.value = '';
      }
    };
  }

  if ($('btnAutobitToggleGenJson')) {
    $('btnAutobitToggleGenJson').onclick = () => {
      const wrap = $('autobitGenJsonWrap');
      if (!wrap) return;
      wrap.style.display = wrap.style.display === 'none' ? 'flex' : 'none';
    };
  }

  if ($('autobitGenJsonArea')) {
    $('autobitGenJsonArea').addEventListener('change', (e) => {
      try {
        const txt = e.target.value.trim();
        if (txt) S.set('studioGenerals', JSON.parse(txt));
      } catch (err) { /* invalid JSON is reported via the badge / status */ }
      refreshAutobitPreview();
    });
  }
  initAutobitJsonResize();

  if ($('selAutobitWave')) {
    $('selAutobitWave').onchange = (e) => {
      e.target.dataset.last = e.target.value;
      refreshAutobitPreview();
    };
  }

  if ($('numAutobitTime')) {
    $('numAutobitTime').oninput = () => refreshAutobitPreview();
    $('numAutobitTime').onchange = () => refreshAutobitPreview();
  }

  if ($('btnAutobitAnalyze')) $('btnAutobitAnalyze').onclick = buildAutobitScript;
  if ($('btnAutobitCopyScript')) $('btnAutobitCopyScript').onclick = copyAutobitScript;
  if ($('btnAutobitSaveToRoster')) $('btnAutobitSaveToRoster').onclick = saveAutobitGeneralsToRoster;
}

init();
})();
