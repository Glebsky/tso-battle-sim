(() => {
const {
  t,
  tUnit,
  tResource = (r) => r,
  getResourceIcon = () => '📦',
  tCampType,
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
      const icon = getResourceIcon(rId);
      return `${icon ? icon + ' ' : ''}${fmt(total)} ${rName}`;
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
      await applyGeneralsExport(data);
    } catch (err) {
      alert(t('toast.jsonError', { err: err.message }));
    }
  };

  $('genAll').onclick = () => toggleAllGenerals(true);
  $('genNone').onclick = () => toggleAllGenerals(false);
  $('run').onclick = run;
  if ($('runMobile')) $('runMobile').onclick = run;
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
    const enabled = S.get('enabledGenerals', GENERALS.map((g) => g.uid));

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
        <button class="sec" id="btnCopyClientPlan">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          ${t('result.btnCopyClient')}
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
            <button class="sec btn-wave-copy-client" data-wave="${w.index}" style="padding:2px 8px; font-size:11px; height:24px; white-space:nowrap;" title="${t('result.btnCopyWaveClient', { num: w.index })}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:3px;">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              ${t('result.btnCopyWaveClient', { num: w.index })}
            </button>
          </div>
        </div>
        <div class="wave-body">
          ${burnedBanner}
    `;

    for (const a of w.attacks) {
      const lost = a.perUnit.filter((u) => u.lost > 0)
        .map((u) => renderUnitLossChip(u.id, u.lost)).join(' ') || `<span class="tag-pill ok">${t('atk.noLoss')}</span>`;
      
      const enemy = a.camp.units.map((u) => renderUnitChip(u.id, u.amount)).join(' ');

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
  document.querySelectorAll('.btn-wave-copy-client').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const waveNum = Number(btn.getAttribute('data-wave'));
      copyClientScriptToClipboard(waveNum);
    };
  });
}

function getCampClientTarget(camp) {
  if (!camp) return { target: 0, targetName: '' };
  let target = 0;
  if (camp.coordinates && typeof camp.coordinates.x === 'number' && typeof camp.coordinates.y === 'number') {
    target = camp.coordinates.x + camp.coordinates.y * 68;
  } else if (camp.position && typeof camp.position.x === 'number' && typeof camp.position.y === 'number') {
    target = camp.number || 0;
  } else {
    target = camp.number || 0;
  }

  let name = '';
  const b = camp.building || '';
  if (b.includes('Banditsleader') || b.includes('leader') || camp.type === 'Leader') {
    name = 'Шатер вожака разбойников';
  } else if (b.includes('BanditsLvl2') || camp.type === 'Medium') {
    name = 'Лагерь разбойников (средний)';
  } else if (b.includes('BanditsLvl3') || camp.type === 'Heavy') {
    name = 'Лагерь разбойников (сложный)';
  } else if (b.includes('Bandits') || camp.type === 'Small') {
    name = 'Лагерь разбойников (легкий)';
  } else {
    name = 'Лагерь разбойников';
  }

  if (name.length > 25) {
    name = name.slice(0, 24) + '...';
  }

  return { target, targetName: name };
}

function generateClientBattlePacket(waveIndex = null) {
  if (!LAST_PLAN_RESULT || !LAST_PLAN_RESULT.waves || !LAST_PLAN_RESULT.waves.length) return null;

  const waves = waveIndex != null
    ? LAST_PLAN_RESULT.waves.filter((w) => w.index === waveIndex)
    : LAST_PLAN_RESULT.waves;

  if (!waves.length) return null;

  const packet = {};
  let currentOrder = 0;

  for (const w of waves) {
    for (const a of w.attacks) {
      const { target, targetName } = getCampClientTarget(a.camp);
      const squad = a.squad || [];

      for (let sIdx = 0; sIdx < squad.length; sIdx++) {
        const s = squad[sIdx];
        const g = s.general;
        const uid = g.uid;

        const armyMap = {};
        for (const u of (s.army || [])) {
          if (u.amount > 0) {
            armyMap[u.id] = u.amount;
          }
        }

        packet[uid] = {
          grid: g.grid != null ? g.grid : 0,
          name: g.rawName || (g.name ? `<b>${g.name}</b>` : `<b>${g.base}</b>`),
          order: currentOrder++,
          time: 1000,
          skills: g.skills || {},
          army: armyMap,
          type: g.type || 1,
          target,
          targetName,
        };
      }
    }
  }

  return packet;
}

function copyClientScriptToClipboard(waveIndex = null) {
  const isMultiWave = LAST_PLAN_RESULT && LAST_PLAN_RESULT.waves && LAST_PLAN_RESULT.waves.length > 1;
  const targetWave = waveIndex != null ? waveIndex : (isMultiWave ? 1 : null);

  const packet = generateClientBattlePacket(targetWave);
  if (!packet || Object.keys(packet).length === 0) return;

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
      z-index: 100;
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(toast);
  }

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

init();
})();
