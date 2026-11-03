// TSO Adventure Tactical Planner — In-Browser WebAssembly Web Worker
// Runs multi-wave combat simulations and tactical campaign planning directly
// in a background browser thread, eliminating server timeouts and serverless limits.

/* global wasm_bindgen, importScripts */

const baseOrigin = (self.location && self.location.origin) ? self.location.origin : '';
try {
  importScripts(baseOrigin + '/wasm.js');
} catch (e) {
  try {
    importScripts('wasm.js');
  } catch (err) {
    console.error('Failed to importScripts wasm.js:', err);
  }
}

let wasmInitPromise = null;

async function ensureEngine() {
  if (wasmInitPromise) return wasmInitPromise;
  wasmInitPromise = (async () => {
    const wasmUrl = baseOrigin ? (baseOrigin + '/wasm_bg.wasm') : '/wasm_bg.wasm';
    await wasm_bindgen(wasmUrl);
    return wasm_bindgen;
  })();
  return wasmInitPromise;
}

// ---------------------------------------------------------------------------
// Engine Bridge
// ---------------------------------------------------------------------------
function generalCapacity(base, skills = []) {
  const entity = { General: { uid: 'probe', capacity: 0, skills, unit: { id: base, value: 0, amount: 1 } } };
  const data = wasm_bindgen.Tooltip.get_data(entity, skills);
  return data.capacity;
}

const statsCache = new Map();
function unitStats(id) {
  if (statsCache.has(id)) return statsCache.get(id);
  let d = null;
  try {
    d = wasm_bindgen.Tooltip.get_data({ Unit: { id, value: 0, amount: 1 } }, []);
  } catch (e) { d = null; }
  statsCache.set(id, d);
  return d;
}

function campGarrison(camp) {
  const campUnits = Array.isArray(camp.units)
    ? camp.units
    : Object.entries(camp.units || {}).map(([id, amount]) => ({ id, amount }));
  return {
    kind: 'Default',
    hitpoints: camp.hitpoints ?? 250,
    camp_id: camp.key,
    camp_type: camp.type || 'Small',
    general: null,
    units: campUnits.map((u) => ({
      id: u.id,
      value: u.value != null ? Number(u.value) : 0,
      amount: Number(u.amount) || 0,
    })),
  };
}

function attackerGarrison(general, army, unitValues) {
  return {
    Garrison: {
      kind: 'Default',
      hitpoints: 250,
      camp_id: '0',
      camp_type: 'Small',
      general: {
        uid: general.uid,
        skills: general.skills || [],
        capacity: general.capacity,
        unit: { id: general.base, value: 0, amount: 1 },
      },
      units: army
        .filter((u) => u.amount > 0)
        .map((u) => ({ id: u.id, value: unitValues[u.id] ?? 1, amount: u.amount })),
    },
  };
}

function mergePerUnit(target, list, order) {
  for (const u of list) {
    if (!target.byId.has(u.id)) {
      const rec = { id: u.id, lost: 0, max: 0 };
      target.byId.set(u.id, rec);
      target.list.push(rec);
    }
    const acc = target.byId.get(u.id);
    acc.lost += u.lost;
    acc.max += u.max;
  }
  return order;
}

function simulateSquad({ camp, squad, repetitions = 60, unitValues = {}, buffs = [] }) {
  const attackers = squad.map((s) => attackerGarrison(s.general, s.army, unitValues));
  const config = { repetitions, skip_by: false, skip_by_victory: false, skip_by_losses: null, buffs };
  const res = wasm_bindgen.Battles.init(config, attackers, [campGarrison(camp)]).run();

  const waves = res.battle_results.map((br, i) => {
    const ids = new Set((squad[i] ? squad[i].army : []).map((u) => u.id));
    return {
      order: i + 1,
      generalUid: br.general_uid,
      victoryChance: br.victory_chance,
      rounds: br.combat_rounds ? br.combat_rounds.avg : 0,
      // Real battle time of this step in seconds, straight from the engine.
      durationSec: br.duration ? br.duration.avg : 0,
      defKills: br.defender.reduce((s, u) => s + u.lost_amount, 0),
      perUnit: br.attacker
        .filter((u) => ids.has(u.id))
        .map((u) => ({ id: u.id, lost: u.lost_amount, max: u.lost.max })),
    };
  });

  const agg = { byId: new Map(), list: [] };
  for (const w of waves) mergePerUnit(agg, w.perUnit);

  return {
    victoryChance: res.victory_chance,
    lostAmount: res.lost_amount,
    lostValue: res.lost_value,
    xp: res.xp,
    duration: res.max_duration,
    waves,
    perUnit: agg.list,
  };
}

function simulateChainCamps({ camps, general, army, repetitions = 60, unitValues = {}, buffs = [] }) {
  const config = { repetitions, skip_by: false, skip_by_victory: false, skip_by_losses: null, buffs };
  const ids = new Set(army.map((u) => u.id));
  const res = wasm_bindgen.Battles.init(
    config,
    [attackerGarrison(general, army, unitValues)],
    camps.map((c) => campGarrison(c)),
  ).run();

  const perCamp = camps.map(() => null);
  for (const br of res.battle_results) {
    const idx = (br.defender_wave || 1) - 1;
    if (idx < 0 || idx >= camps.length) continue;
    perCamp[idx] = {
      camp: camps[idx],
      victoryChance: br.victory_chance,
      rounds: br.combat_rounds ? br.combat_rounds.avg : 0,
      // Real battle time of this camp fight in seconds, from the engine.
      durationSec: br.duration ? br.duration.avg : 0,
      defKills: br.defender.reduce((s, u) => s + u.lost_amount, 0),
      perUnit: br.attacker
        .filter((u) => ids.has(u.id))
        .map((u) => ({ id: u.id, lost: u.lost_amount, max: u.lost.max })),
    };
  }

  const agg = { byId: new Map(), list: [] };
  const remaining = new Map(army.map((u) => [u.id, u.amount]));
  for (const c of perCamp) {
    if (!c) continue;
    c.armyBefore = army
      .map((u) => ({ id: u.id, amount: Math.max(0, Math.round(remaining.get(u.id) || 0)) }))
      .filter((u) => u.amount > 0);
    for (const u of c.perUnit) remaining.set(u.id, (remaining.get(u.id) || 0) - u.lost);
    mergePerUnit(agg, c.perUnit);
  }

  const cleared = perCamp.every((c) => c && c.victoryChance === 1);

  return {
    victoryChance: res.victory_chance,
    cleared,
    campsCleared: perCamp.filter((c) => c && c.victoryChance === 1).length,
    lostAmount: res.lost_amount,
    lostValue: res.lost_value,
    xp: res.xp,
    duration: res.max_duration,
    perCamp,
    perUnit: agg.list,
  };
}

// ---------------------------------------------------------------------------
// Unit & Resource Metadata
// ---------------------------------------------------------------------------
const DEFAULT_UNITS = [
  'Swordsman', 'MountedSwordsman', 'Knight',
  'Marksman', 'ArmoredMarksman', 'MountedMarksman', 'Besieger',
];

const ALL_PLAYER_UNITS = [
  'Recruit', 'Militia', 'Soldier', 'EliteSoldier', 'Cavalry',
  'Bowman', 'Longbowman', 'Crossbowman', 'Cannoneer',
  'Swordsman', 'MountedSwordsman', 'Knight',
  'Marksman', 'ArmoredMarksman', 'MountedMarksman', 'Besieger',
];

const DEFAULT_FREE_SACRIFICE_BASES = [
  'GhostGeneral',
  'NarcissisticGeneral',
  'Halloween2019General',
];

const DEFAULT_CHEAP_UNITS = [
  'Recruit', 'Militia', 'Soldier', 'Cavalry',
  'Bowman', 'Longbowman', 'Crossbowman',
];

const UNIT_RESOURCES = {
  Recruit: { Settler: 1, Brew: 5, BronzeSword: 10 },
  Bowman: { Settler: 1, Brew: 5, Bow: 10 },
  Militia: { Settler: 1, Brew: 10, IronSword: 10 },
  Cavalry: { Settler: 1, Brew: 30, Horse: 40 },
  Longbowman: { Settler: 1, Brew: 10, Longbow: 10 },
  Soldier: { Settler: 1, Brew: 15, SteelSword: 10 },
  Crossbowman: { Settler: 1, Brew: 20, Crossbow: 10 },
  EliteSoldier: { Settler: 1, Brew: 15, DamasceneSword: 10 },
  Cannoneer: { Settler: 1, Brew: 20, Cannon: 10, Gunpowder: 50 },
  Swordsman: { Settler: 1, Brew: 5, PlatinumSword: 10 },
  MountedSwordsman: { Settler: 1, Brew: 15, PlatinumSword: 10, BattleHorse: 20 },
  Knight: { Settler: 1, Brew: 15, PlatinumSword: 20, BattleHorse: 20 },
  Marksman: { Settler: 1, Brew: 5, Arquebus: 10 },
  ArmoredMarksman: { Settler: 1, Brew: 15, PlatinumSword: 10, Arquebus: 10 },
  MountedMarksman: { Settler: 1, Brew: 15, Arquebus: 10, BattleHorse: 20 },
  Besieger: { Settler: 1, Brew: 20, Mortar: 10, Gunpowder: 50 },
};

const DEFAULT_UNIT_VALUES = {
  Recruit: 1, Bowman: 2, Longbowman: 3, Cavalry: 4, Militia: 5, Soldier: 9,
  Crossbowman: 50, EliteSoldier: 50, Cannoneer: 100, Swordsman: 50, Marksman: 50,
  MountedSwordsman: 100, ArmoredMarksman: 100, Knight: 105, MountedMarksman: 120, Besieger: 120,
};

function calcLostResources(losses) {
  const res = {};
  for (const [unitId, count] of Object.entries(losses || {})) {
    if (!count || count <= 0) continue;
    const recipe = UNIT_RESOURCES[unitId];
    if (!recipe) continue;
    for (const [rId, amt] of Object.entries(recipe)) {
      res[rId] = Math.round(((res[rId] || 0) + amt * count) * 10) / 10;
    }
  }
  return res;
}

function resolveCamps(camps, tokens) {
  const byNumber = new Map(camps.map((c) => [String(c.number), c]));
  const byKey = new Map(camps.map((c) => [c.key, c]));
  return tokens.map((t) => {
    const s = String(t).trim();
    const c = byNumber.get(s) || byKey.get(s);
    if (!c) throw new Error('Лагерь не найден: ' + s + ' (доступны 1..' + camps.length + ' или полные id)');
    return c;
  });
}

function normalizeSkills(raw, skillMap, type, unmapped) {
  const out = [];
  const add = (name, lvl) => {
    const n = String(name);
    const full = n.startsWith('Skill_') ? n : 'Skill_' + n;
    out.push(/[0-9]$/.test(full) ? full : full + lvl);
  };
  if (Array.isArray(raw)) {
    for (const s of raw) if (s) out.push(String(s));
    return out;
  }
  for (const [key, lvl] of Object.entries(raw || {})) {
    if (key.startsWith('Skill_')) { add(key, lvl); continue; }
    const mapped = skillMap && (skillMap[type + '.' + key] || skillMap[key]);
    if (mapped) { add(mapped, lvl); continue; }
    if (/^[0-9]+$/.test(key)) { unmapped.add(key); continue; }
    add(key, lvl);
  }
  return out;
}

const DEFAULT_SKILL_MAP = {
  0: 'Skill_IncreaseBowmanMaximumAD',
  1: 'Skill_IncreaseXP',
  2: 'Skill_IncreaseGeneralSplashAndAD',
  3: 'Skill_DescreaseBossHP',
  4: 'Skill_IncreaseLongbowmanAndMarksmanAD',
  5: 'Skill_IncreaseCombatSpeed',
  6: 'Skill_IncreaseTravelSpeed',
  7: 'Skill_IncreaseRecoverySpeed',
  8: 'Skill_IncreaseADEveryRound',
  9: 'Skill_IncreaseSwiftSplashAndAD',
  10: 'Skill_GetRecruits',
  11: 'Skill_IncreasePeacefulMovementSpeed',
  12: 'Skill_IncreaseCapacity',
  13: 'Skill_IncreaseHeavyAD',
  14: 'Skill_ResurrectLosses',
  15: 'Skill_IncreaseEliteSoldierSplashAndAD',
  16: 'Skill_InstantRecovery',
  17: 'Skill_GetStarCoins',
  18: 'Skill_GeneralAttacksTwice',
  19: 'Skill_IncreaseAccuracy',
};

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

function normalizeExport(raw, warnings) {
  if (!raw || typeof raw !== 'object') return { specialists: [] };
  const list = Array.isArray(raw) ? raw : [raw];
  if (!Array.isArray(raw)) {
    if (raw.specialists) return raw;
    if (raw.generals) return Object.assign({}, raw, { specialists: raw.generals });
    if (raw.waves && Array.isArray(raw.waves)) return normalizeExport(raw.waves, warnings);
  }
  const looksLikePlan = list.some((wave) => wave && typeof wave === 'object' &&
    Object.keys(wave).some((k) => wave[k] && typeof wave[k] === 'object' && wave[k].army));
  if (!looksLikePlan) return { specialists: [] };
  const typeMap = (!Array.isArray(raw) && raw.typeMap) || null;
  const byUid = new Map();
  for (const wave of list) {
    for (const uid of Object.keys(wave || {})) {
      const atk = wave[uid];
      if (!atk || typeof atk !== 'object' || !atk.army) continue;
      const total = Object.keys(atk.army)
        .reduce((sum, id) => sum + (Number(atk.army[id]) || 0), 0);
      const cur = byUid.get(uid);
      if (!cur) {
        byUid.set(uid, {
          uid,
          name: stripHtml(atk.name) || uid,
          rawName: atk.name || null,
          grid: atk.grid != null ? atk.grid : null,
          type: atk.type || null,
          skills: Object.assign({}, atk.skills || {}),
          capacity: total,
        });
        continue;
      }
      if (cur.grid == null && atk.grid != null) cur.grid = atk.grid;
      if (!cur.rawName && atk.name) cur.rawName = atk.name;
      if (!cur.type && atk.type) cur.type = atk.type;
      cur.capacity = Math.max(cur.capacity, total);
    }
  }
  const specialists = [];
  const unmapped = [];
  for (const gen of byUid.values()) {
    const base = baseFromGameGeneral(gen.rawName || gen.name, gen.type, typeMap);
    if (!base) { unmapped.push(gen.name + ' (type ' + gen.type + ')'); continue; }
    specialists.push(Object.assign({}, gen, { base }));
  }
  if (warnings && unmapped.length) {
    warnings.push('Пропущены неизвестные генералы: ' + unmapped.join(', '));
  }
  return { specialists };
}

function buildGenerals(exportData, warnings) {
  const norm = normalizeExport(exportData, warnings);
  const specs = (norm && (norm.specialists || norm.generals)) || [];
  const skillMap = Object.assign({}, DEFAULT_SKILL_MAP, (norm && norm.skillMap) || (exportData && exportData.skillMap) || {});
  const unmapped = new Set();
  const generals = specs.map((s, idx) => {
    const resolvedType = s.type != null ? s.type : (BASE_TO_GAME_TYPE[s.base] || null);
    const skills = normalizeSkills(s.skills, skillMap, resolvedType, unmapped);
    const given = Number(s.capacity) || 0;
    return {
      uid: s.uid || s.id || ('gen_' + idx),
      name: s.name || s.base || ('Генерал ' + (idx + 1)),
      rawName: s.rawName || null,
      grid: s.grid != null ? s.grid : 0,
      type: resolvedType,
      base: s.base,
      skills,
      capacity: given > 0 ? given : generalCapacity(s.base, skills),
      skillList: s.skills || {},
    };
  });
  return generals;
}

function classKey(g) {
  return g.base + '|' + (g.skills || []).slice().sort().join(',') + '|' + g.capacity;
}

function groupClasses(generals) {
  const map = new Map();
  for (const g of generals) {
    const k = classKey(g);
    if (!map.has(k)) map.set(k, { id: k, sample: g, capacity: g.capacity, members: [] });
    map.get(k).members.push(g);
  }
  return [...map.values()].sort((a, b) => b.capacity - a.capacity);
}

const candidateArmiesCache = new Map();
function candidateArmies(units, capacity, stepPct, pool, maxUnitTypes) {
  const poolKey = Object.entries(pool || {}).map(([k, v]) => k + ':' + v).sort().join(',');
  const cacheKey = capacity + '|' + stepPct + '|' + (maxUnitTypes || 2) + '|' + units.join(',') + '|' + poolKey;
  if (candidateArmiesCache.has(cacheKey)) return candidateArmiesCache.get(cacheKey);

  const avail = (id) => (pool[id] === undefined ? Infinity : Math.max(0, pool[id]));
  const cap = (id, n) => Math.min(n, avail(id));
  const armies = [];
  const seen = new Set();
  const push = (army) => {
    const k = army.map((u) => u.id + ':' + u.amount).join('|');
    if (army.length && !seen.has(k)) { seen.add(k); armies.push(army); }
  };
  for (const u of units) {
    const a = cap(u, capacity);
    if (a > 0) push([{ id: u, amount: a }]);
  }
  const mk = (ids, amounts) => {
    const army = [];
    for (let n = 0; n < ids.length; n++) {
      const x = cap(ids[n], amounts[n]);
      if (x > 0) army.push({ id: ids[n], amount: x });
    }
    if (army.length) push(army);
  };
  const step = Math.max(5, Math.round((capacity * stepPct) / 100));
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      for (let a = step; a < capacity; a += step) {
        mk([units[i], units[j]], [a, capacity - a]);
      }
    }
  }
  if ((maxUnitTypes || 2) >= 3) {
    const triple = step * 2;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        for (let k = j + 1; k < units.length; k++) {
          for (let a = triple; a < capacity; a += triple) {
            for (let b = triple; a + b < capacity; b += triple) {
              mk([units[i], units[j], units[k]], [a, b, capacity - a - b]);
            }
          }
        }
      }
    }
  }
  if ((maxUnitTypes || 2) >= 4) {
    const quad = step * 3;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        for (let k = j + 1; k < units.length; k++) {
          for (let l = k + 1; l < units.length; l++) {
            for (let a = quad; a < capacity; a += quad) {
              for (let b = quad; a + b < capacity; b += quad) {
                for (let c = quad; a + b + c < capacity; c += quad) {
                  mk([units[i], units[j], units[k], units[l]], [a, b, c, capacity - a - b - c]);
                }
              }
            }
          }
        }
      }
    }
  }
  candidateArmiesCache.set(cacheKey, armies);
  return armies;
}

function violatesNoLoss(perUnit, noLoss) {
  if (!noLoss || !noLoss.length) return false;
  return perUnit.some((u) => noLoss.includes(u.id) && u.max > 0);
}

function violatesSacrifice(steps, waves, opts) {
  if (opts.sacrificePolicy === 'any') return false;
  for (let i = 0; i < steps.length - 1; i++) {
    const w = waves[i];
    if (!w) continue;
    const total = steps[i].army.reduce((s, u) => s + u.amount, 0);
    if (!total) continue;
    const lost = w.perUnit.reduce((s, u) => s + u.max, 0);
    if (lost / total < opts.wipeThreshold) continue;
    if (opts.sacrificePolicy === 'none') return true;
    if (opts.generalUsage === 'max' &&
      steps[i].army.every((u) => !(opts.noLoss || []).includes(u.id))) continue;
    if (!steps[i].army.every((u) => opts.isCheap(u.id))) return true;
  }
  return false;
}

function lossesOf(perUnit, mode) {
  const out = {};
  for (const u of perUnit) {
    const n = mode === 'avg' ? Math.ceil(u.lost) : u.max;
    if (n > 0) out[u.id] = (out[u.id] || 0) + n;
  }
  return out;
}

function usageOf(armies) {
  const out = {};
  for (const army of armies) for (const u of army) out[u.id] = (out[u.id] || 0) + u.amount;
  return out;
}

function fitsPool(usage, pool) {
  return Object.entries(usage).every(([id, n]) => pool[id] === undefined || n <= pool[id]);
}

function poolPressureOf(usage, limits) {
  let p = 0;
  for (const [id, n] of Object.entries(usage)) {
    const lim = limits[id];
    if (lim === undefined || lim === null) continue;
    p += lim > 0 ? n / lim : 1;
  }
  return p;
}

function classCountsOf(chain) {
  const out = new Map();
  for (const s of chain) out.set(s.cls.id, (out.get(s.cls.id) || 0) + 1);
  return out;
}

function classCountsOk(chain, avail) {
  for (const [id, n] of classCountsOf(chain)) if ((avail.get(id) || 0) < n) return false;
  return true;
}

function roleOf(i, len) {
  if (len === 1) return 'соло';
  if (i === 0) return 'вскрытие';
  return i === len - 1 ? 'добивание' : 'продавливание';
}

function mkSquadOption(chain, res, opts) {
  return {
    kind: 'squad',
    span: 1,
    squad: chain.map((s, i) => ({
      classId: s.cls.id,
      base: s.cls.sample.base,
      capacity: s.cls.capacity,
      army: s.army,
      order: i + 1,
      role: roleOf(i, chain.length),
      defKills: res.waves[i] ? Math.round(res.waves[i].defKills) : 0,
      rounds: res.waves[i] ? res.waves[i].rounds : 0,
      durationSec: res.waves[i] ? res.waves[i].durationSec || 0 : 0,
      perUnit: res.waves[i] ? res.waves[i].perUnit : [],
    })),
    generals: chain.length,
    classCounts: [...classCountsOf(chain)],
    lostValue: res.lostValue,
    lostAmount: res.lostAmount,
    xp: res.xp,
    perUnit: res.perUnit,
    losses: lossesOf(res.perUnit, opts.lossAccounting),
    usage: usageOf(chain.map((s) => s.army)),
    capacitySum: chain.reduce((s, x) => s + x.cls.capacity, 0),
    poolPressure: poolPressureOf(usageOf(chain.map((s) => s.army)), opts.limits || {}),
  };
}

// One general + one army sweeping several camps. The camps need NOT be
// adjacent: the general walks past camps that other generals take in the
// same wave, so `campsIdx` (window indexes) may skip positions.
function mkChainOption(cls, army, camps, res, opts, campsIdx) {
  return {
    kind: 'chain',
    span: camps.length,
    campsIdx: campsIdx || camps.map((_, i) => i),
    classId: cls.id,
    base: cls.sample.base,
    capacity: cls.capacity,
    army,
    perCamp: res.perCamp.map((c, i) => ({
      campKey: camps[i].key,
      campNumber: camps[i].number,
      armyBefore: c.armyBefore || army,
      defKills: Math.round(c.defKills),
      rounds: c.rounds,
      durationSec: c.durationSec || 0,
      perUnit: c.perUnit,
    })),
    generals: 1,
    classCounts: [[cls.id, 1]],
    lostValue: res.lostValue,
    lostAmount: res.lostAmount,
    xp: res.xp,
    perUnit: res.perUnit,
    losses: lossesOf(res.perUnit, opts.lossAccounting),
    usage: usageOf([army]),
    capacitySum: cls.capacity,
    poolPressure: poolPressureOf(usageOf([army]), opts.limits || {}),
  };
}

const MAX_LINEUP_OPTIONS = 64;

function lineupOf(option) {
  return option.classCounts.map(([c, k]) => c + '×' + k).sort().join('+');
}

function keepDiverse(list, n) {
  const picked = [];
  const seen = new Set();
  const keyOf = (o) => lineupOf(o) + '|' +
    Object.entries(o.usage).map(([id, v]) => id + ':' + v).sort().join('+');
  const take = (sorted, limit) => {
    for (const o of sorted) {
      if (picked.length >= limit) return;
      const k = keyOf(o);
      if (seen.has(k)) continue;
      seen.add(k); picked.push(o);
    }
  };
  const by = (f) => list.slice().sort(f);
  const cheapFirst = (a, b) => a.generals - b.generals || a.lostValue - b.lostValue;

  const best = new Map();
  for (const o of list) {
    const k = lineupOf(o);
    const cur = best.get(k);
    if (!cur || o.generals < cur.generals ||
      (o.generals === cur.generals && o.lostValue < cur.lostValue)) best.set(k, o);
  }
  take([...best.values()].sort(cheapFirst), Math.max(n, MAX_LINEUP_OPTIONS));

  const cap = picked.length + n;
  const half = Math.max(1, Math.ceil(n / 2));
  take(by(cheapFirst).slice(0, half), cap);
  take(by((a, b) => a.poolPressure - b.poolPressure || a.lostValue - b.lostValue).slice(0, half), cap);
  take(by((a, b) => a.capacitySum - b.capacitySum || a.lostValue - b.lostValue).slice(0, half), cap);
  take(by((a, b) => b.generals - a.generals || a.lostValue - b.lostValue).slice(0, half), cap);
  take(by((a, b) => a.lostValue - b.lostValue), cap);
  return picked;
}

function searchCampOptions(camp, classes, availByClass, pool, opts) {
  const { units, stepPct, reps, verify, unitValues, noLoss, maxGeneralsPerCamp, beam, maxOptions } = opts;
  const squadLimit = opts.generalUsage === 'max' ? 48 : maxOptions;
  const soloLimit = opts.generalUsage === 'max' ? 24 : maxOptions;
  const sim = (chain, repetitions) => {
    try {
      return simulateSquad({
        camp,
        squad: chain.map((s) => ({ general: s.cls.sample, army: s.army })),
        repetitions,
        unitValues,
      });
    } catch (e) {
      return null;
    }
  };
  const isOpenerSafe = (army) => army.every((u) => !(noLoss || []).includes(u.id));
  const accept = (chain, r) => r && r.victoryChance === 1 &&
    !violatesNoLoss(r.perUnit, noLoss) &&
    !violatesSacrifice(chain, r.waves, opts) &&
    chain.slice(0, -1).every((s) => isOpenerSafe(s.army));

  const solo = [];
  const probes = [];
  for (const cls of classes) {
    if ((availByClass.get(cls.id) || 0) < 1) continue;
    if (opts.timeBudgetMs > 0 && (Date.now() - opts.t0) >= opts.timeBudgetMs) break;
    for (const army of candidateArmies(units, cls.capacity, stepPct, pool, opts.maxUnitTypes)) {
      if (opts.timeBudgetMs > 0 && (Date.now() - opts.t0) >= opts.timeBudgetMs) break;
      const chain = [{ cls, army }];
      const r = sim(chain, reps);
      if (!r) continue;
      probes.push({
        cls, army,
        defKills: r.waves[0] ? r.waves[0].defKills : 0,
        lostValue: r.lostValue,
        noLossSafe: !violatesNoLoss(r.perUnit, noLoss),
      });
      if (accept(chain, r)) {
        const full = sim(chain, verify);
        if (accept(chain, full)) solo.push(mkSquadOption(chain, full, opts));
      }
    }
  }
  const soloable = solo.length > 0;
  if (soloable) {
    return { options: keepDiverse(solo, soloLimit), soloable: true };
  }

  const openerProbes = probes.filter((p) => isOpenerSafe(p.army));
  const byKills = openerProbes.slice().sort((a, b) => b.defKills - a.defKills || a.lostValue - b.lostValue);
  const uniq = (list, n) => {
    const out = []; const seen = new Set();
    for (const p of list) {
      const k = p.cls.id + '|' + p.army.map((u) => u.id + ':' + u.amount).join('+');
      if (seen.has(k)) continue;
      seen.add(k); out.push(p);
      if (out.length >= n) break;
    }
    return out;
  };
  const cheapProbes = openerProbes
    .filter((p) => p.army.every((u) => opts.isCheap(u.id)))
    .sort((a, b) => b.defKills - a.defKills || a.lostValue - b.lostValue);
  const openerPool = byKills;
  const perClassBest = (list) => {
    const best = new Map();
    for (const p of list) {
      const cur = best.get(p.cls.id);
      if (!cur || p.defKills > cur.defKills ||
        (p.defKills === cur.defKills && p.lostValue < cur.lostValue)) best.set(p.cls.id, p);
    }
    return [...best.values()].sort((a, b) => b.defKills - a.defKills || a.lostValue - b.lostValue);
  };
  const classSpread = perClassBest(openerPool);
  const openers = opts.sacrificePolicy === 'cheap' && cheapProbes.length
    ? uniq([...cheapProbes.slice(0, beam), ...openerPool.slice(0, beam), ...classSpread],
      beam * 2 + classSpread.length)
    : uniq([...openerPool.slice(0, beam), ...classSpread],
      beam + classSpread.length);

  const safeByKills = probes.filter((p) => p.noLossSafe)
    .sort((a, b) => b.defKills - a.defKills || a.lostValue - b.lostValue);
  const allByKills = probes.slice().sort((a, b) => b.defKills - a.defKills || a.lostValue - b.lostValue);
  const allByCheap = probes.slice().sort((a, b) => a.lostValue - b.lostValue || b.defKills - a.defKills);
  const enders = uniq(
    [...safeByKills.slice(0, beam), ...allByKills.slice(0, beam), ...allByCheap.slice(0, beam),
      ...perClassBest(allByKills)],
    beam + 4 + classes.length,
  );

  const found = [];
  let frontier = openers.map((p) => ({ chain: [p], kills: p.defKills }));
  const kMax = soloable ? Math.min(2, maxGeneralsPerCamp) : maxGeneralsPerCamp;
  for (let k = 2; k <= kMax; k++) {
    if (opts.timeBudgetMs > 0 && (Date.now() - opts.t0) >= opts.timeBudgetMs) break;
    const next = [];
    const winners = [];
    for (const node of frontier) {
      if (opts.timeBudgetMs > 0 && (Date.now() - opts.t0) >= opts.timeBudgetMs) break;
      for (const cand of enders) {
        const chain = [...node.chain, cand];
        if (!classCountsOk(chain, availByClass)) continue;
        if (!fitsPool(usageOf(chain.map((s) => s.army)), pool)) continue;
        const r = sim(chain, reps);
        if (accept(chain, r)) { winners.push({ chain, r }); continue; }
        next.push({ chain, kills: r.waves.reduce((s, w) => s + w.defKills, 0) });
      }
    }
    const bestByLineup = new Map();
    for (const w of winners) {
      const key = w.chain.map((s) => s.cls.id).sort().join('+');
      const cur = bestByLineup.get(key);
      if (!cur || w.r.lostValue < cur.r.lostValue) bestByLineup.set(key, w);
    }
    const shortlist = [...bestByLineup.values()]
      .sort((a, b) => a.r.lostValue - b.r.lostValue)
      .slice(0, MAX_LINEUP_OPTIONS);
    for (const w of shortlist) {
      const full = sim(w.chain, verify);
      if (accept(w.chain, full)) found.push(mkSquadOption(w.chain, full, opts));
    }
    if (found.length) break;
    frontier = next.sort((a, b) => b.kills - a.kills).slice(0, Math.max(beam, 4));
    if (!frontier.length) break;
  }
  return { options: keepDiverse(found, squadLimit), soloable: false };
}

function findCampOptions(camp, classes, availByClass, pool, opts) {
  const res = searchCampOptions(camp, classes, availByClass, pool, opts);
  if (res.options.length) return res;
  if (opts.sacrificePolicy === 'cheap' || opts.sacrificePolicy === 'none') {
    const relaxed = searchCampOptions(camp, classes, availByClass, pool, {
      ...opts,
      sacrificePolicy: 'any',
    });
    if (relaxed.options.length) {
      return {
        options: relaxed.options.map((o) => ({ ...o, sacrificeExempt: true })),
        soloable: relaxed.soloable,
        sacrificeExempt: true,
      };
    }
  }
  return res;
}

// Extend solo winners so that ONE general sweeps several camps. The chain is
// grown camp by camp and may SKIP a camp the army cannot take (or that other
// generals will take): only camps the army really clears join the chain.
// Seeds cover every general class (one army per class), so the chain search
// is not biased to a single general family.
// Verification runs once on the longest screened chain and shrinks while it
// fails, instead of re-verifying every prefix (5-10x fewer heavy sims).
function buildChainOptions(window, optionsByCamp, classById, pool, opts) {
  const byAnchor = new Map();
  if (!opts.chainCamps || window.length < 2) return byAnchor;
  const maxLen = opts.maxChainLength > 0 ? opts.maxChainLength : Infinity;
  const isSafe = (perUnit) => !violatesNoLoss(perUnit, opts.noLoss);
  for (let i = 0; i < window.length - 1; i++) {
    const info = optionsByCamp.get(window[i].key);
    if (!info || !info.soloable) continue;
    const soloOpts = (info.options || []).filter((o) => o.kind === 'squad' && o.generals === 1);
    const seeds = [];
    const seenClass = new Set();
    for (const o of soloOpts) {
      const cid = o.squad[0].classId;
      if (seenClass.has(cid)) continue;
      seenClass.add(cid);
      seeds.push(o);
      if (seeds.length >= (opts.chainSeeds || 3)) break;
    }
    for (const seed of seeds) {
      const cls = classById.get(seed.squad[0].classId);
      if (!cls) continue;
      const army = seed.squad[0].army;
      if (opts.timeBudgetMs > 0 && (Date.now() - opts.t0) >= opts.timeBudgetMs) break;
      let camps = [window[i]];
      let idxs = [i];
      for (let j = i + 1; j < window.length; j++) {
        if (camps.length >= maxLen) break;
        if (opts.timeBudgetMs > 0 && (Date.now() - opts.t0) >= opts.timeBudgetMs) break;
        const next = [...camps, window[j]];
        const quick = simulateChainCamps({
          camps: next, general: cls.sample, army, repetitions: opts.reps, unitValues: opts.unitValues,
        });
        // Camp j not clearable with the army left (or not loss-safe): the
        // general walks past it — it stays available for other generals.
        if (!quick.cleared || !isSafe(quick.perUnit)) continue;
        camps = next;
        idxs.push(j);
      }
      while (camps.length >= 2) {
        if (opts.timeBudgetMs > 0 && (Date.now() - opts.t0) >= opts.timeBudgetMs) break;
        const full = simulateChainCamps({
          camps, general: cls.sample, army, repetitions: opts.verify, unitValues: opts.unitValues,
        });
        if (full.cleared && isSafe(full.perUnit)) {
          if (!byAnchor.has(i)) byAnchor.set(i, []);
          byAnchor.get(i).push(mkChainOption(cls, army, camps, full, opts, idxs));
          break;
        }
        camps = camps.slice(0, -1);
        idxs = idxs.slice(0, -1);
      }
    }
  }
  return byAnchor;
}

// ---------------------------------------------------------------------------
// WAVE COVER: assign every camp of the wave one winning option (solo attack,
// multi-general squad, or multi-camp chain) so that general classes and the
// shared troop pool are respected. Options declare the wave positions they
// COVER (`covers`), so a chain may take camps that are not adjacent.
// All covers return picks [{ pos, option }] or null when the camps cannot be
// served at all.
// ---------------------------------------------------------------------------

// Attach wave positions to camp options. `positions` are window indexes of
// the camps that should be served by this wave; every option gets `covers`
// (the positions it takes). Chains only survive when ALL their camps are in
// the wave; they stay anchored at their first camp.
function buildPositionOptions(positions, soloByWindowIdx, chainsByAnchor) {
  const posOfWindow = new Map();
  positions.forEach((wi, p) => posOfWindow.set(wi, p));
  const optionsByPos = [];
  for (let p = 0; p < positions.length; p++) {
    const wi = positions[p];
    const list = (soloByWindowIdx.get(wi) || []).map((o) => ({ ...o, covers: [p] }));
    for (const ch of (chainsByAnchor.get(wi) || [])) {
      if (!ch.campsIdx.every((x) => posOfWindow.has(x))) continue;
      list.push({ ...ch, covers: ch.campsIdx.map((x) => posOfWindow.get(x)) });
    }
    // Cheapest per camp first: fewest generals per covered camp, then the
    // weakest generals, then the lowest price.
    list.sort((a, b) =>
      (a.generals / a.covers.length) - (b.generals / b.covers.length) ||
      a.capacitySum - b.capacitySum ||
      a.lostValue - b.lostValue);
    optionsByPos.push(list);
  }
  return optionsByPos;
}

// One left-to-right pass over the still-uncovered camps, first fitting option
// wins. Cheap safety net so that a long wave is never dropped just because
// the exact search ran out of budget.
function greedyCover(camps, optionsByPos, availByClass, pool) {
  const covered = new Array(camps.length).fill(false);
  const avail = new Map(availByClass);
  const poolNow = { ...pool };
  const picks = [];
  for (let p = 0; p < camps.length; p++) {
    if (covered[p]) continue;
    let taken = null;
    for (const opt of optionsByPos[p]) {
      if (!opt.covers.every((q) => !covered[q])) continue;
      let ok = true;
      const undone = [];
      for (const [cid, n] of opt.classCounts) {
        if ((avail.get(cid) || 0) < n) { ok = false; break; }
        avail.set(cid, (avail.get(cid) || 0) - n);
        undone.push([cid, n]);
      }
      if (ok && fitsPool(opt.usage, poolNow)) {
        for (const [id, n] of Object.entries(opt.usage)) {
          if (poolNow[id] !== undefined) poolNow[id] -= n;
        }
        taken = opt;
        break;
      }
      // roll back only what was actually deducted
      for (const [cid, n] of undone) avail.set(cid, (avail.get(cid) || 0) + n);
    }
    if (!taken) return null;
    for (const q of taken.covers) covered[q] = true;
    picks.push({ pos: p, option: taken });
  }
  return picks;
}

// Global general allocation heuristic. The plain left-to-right search gets
// two things wrong: camp 1 grabs the elite generals, and the boss camp at the
// end is left with whatever is still standing. This pass serves the HARDEST
// camp first and gives every camp the option that respects the strategy
// (spare generals / spare stock / spare capacity). Chains are first-class
// candidates: taking 3 camps with 1 general is exactly what saves waves.
const COVER_STRATEGIES = ['generals', 'economy', 'pressure', 'balanced'];

// Why the last allocation attempt failed. Without this the planner silently
// takes fewer camps and there is no way to tell whether generals or troops ran
// out, which is exactly what you need to know to make a wave longer.
let lastCoverFail = null;

function coverFailReason(list, avail, poolNow) {
  let classBlocked = false;
  let poolBlocked = false;
  for (const opt of list) {
    const classesOk = opt.classCounts.every(([cid, cnt]) => (avail.get(cid) || 0) >= cnt);
    const poolOk = fitsPool(opt.usage, poolNow);
    if (!poolOk) poolBlocked = true;
    if (!classesOk) classBlocked = true;
  }
  if (poolBlocked && !classBlocked) return 'не хватает запаса ограниченных юнитов';
  if (classBlocked && !poolBlocked) return 'нет свободных генералов нужной вместимости';
  return 'кончились и свободные генералы, и запас юнитов';
}

function coverByDifficulty(camps, optionsByPos, availByClass, pool, mode, strategy = 'generals') {
  const n = camps.length;
  const covered = new Array(n).fill(false);

  const hardness = (i) => {
    const list = optionsByPos[i];
    return {
      need: Math.min(...list.map((o) => o.generals)),
      cap: Math.min(...list.map((o) => o.capacitySum)),
      count: list.length,
      // An option covering several camps (a chain) keeps the wave alive:
      // its anchor camp must be served BEFORE the camps it could swallow.
      spread: Math.max(...list.map((o) => o.covers.length)),
    };
  };
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  order.sort((a, b) => {
    const A = hardness(a); const B = hardness(b);
    return B.need - A.need || B.spread - A.spread ||
      B.cap - A.cap || A.count - B.count || a - b;
  });

  const avail = new Map(availByClass);
  const poolNow = { ...pool };
  const chosen = new Map();

  const canTake = (opt) => {
    for (const [cid, cnt] of opt.classCounts) if ((avail.get(cid) || 0) < cnt) return false;
    return fitsPool(opt.usage, poolNow);
  };
  const apply = (opt, sign) => {
    for (const [cid, cnt] of opt.classCounts) avail.set(cid, (avail.get(cid) || 0) - sign * cnt);
    for (const [id, cnt] of Object.entries(opt.usage)) {
      if (poolNow[id] !== undefined) poolNow[id] -= sign * cnt;
    }
  };

  // Which resource runs out first differs per wave: sometimes it is generals,
  // sometimes the limited troops that every army wants. This choice is what
  // decides how many camps fit into ONE wave, so all strategies get a shot.
  // Options that cover more camps (chains) always come first: they are what
  // lets one general serve several camps in the same wave.
  const genScale = Math.max(1, [...availByClass.values()].reduce((s, x) => s + x, 0));
  const cmp = strategy === 'pressure'
    ? (a, b) => b.covers.length - a.covers.length || a.generals - b.generals ||
      a.poolPressure - b.poolPressure || a.lostValue - b.lostValue || a.capacitySum - b.capacitySum
    : strategy === 'economy'
      ? (a, b) => a.generals - b.generals || b.covers.length - a.covers.length ||
        a.capacitySum - b.capacitySum ||
        a.poolPressure - b.poolPressure || a.lostValue - b.lostValue
      : strategy === 'balanced'
        ? (a, b) => (a.poolPressure + a.generals / genScale) -
          (b.poolPressure + b.generals / genScale) ||
          b.covers.length - a.covers.length ||
          a.lostValue - b.lostValue || a.capacitySum - b.capacitySum
        : (a, b) => a.generals - b.generals || b.covers.length - a.covers.length ||
          a.poolPressure - b.poolPressure ||
          a.lostValue - b.lostValue || a.capacitySum - b.capacitySum;

  for (const i of order) {
    if (covered[i]) continue;
    const candidates = optionsByPos[i]
      .filter((o) => o.covers.every((q) => !covered[q]))
      .sort(cmp);
    const opt = candidates.find(canTake);
    if (!opt) {
      lastCoverFail = {
        number: camps[i].number,
        need: hardness(i).need,
        reason: coverFailReason(optionsByPos[i], avail, poolNow),
      };
      return null;
    }
    chosen.set(i, opt);
    for (const q of opt.covers) covered[q] = true;
    apply(opt, 1);
  }

  // The number of camps in this wave is already fixed, so the only thing left
  // to improve is the price. Solo options may be swapped freely; chains stay.
  let improved = true;
  let rounds = 0;
  while (improved && rounds++ < 8) {
    improved = false;
    for (const i of order) {
      const cur = chosen.get(i);
      if (!cur || cur.covers.length > 1) continue;
      apply(cur, -1);
      const better = optionsByPos[i]
        .filter((o) => o !== cur && o.covers.length === 1 && canTake(o) &&
          (mode === 'max' || o.generals <= cur.generals) &&
          (o.lostValue < cur.lostValue ||
            (o.lostValue === cur.lostValue && o.generals < cur.generals)))
        .sort((a, b) => a.lostValue - b.lostValue || a.generals - b.generals)[0];
      apply(better || cur, 1);
      if (better) { chosen.set(i, better); improved = true; }
    }
  }

  return [...chosen.entries()].sort((a, b) => a[0] - b[0])
    .map(([pos, option]) => ({ pos, option }));
}

// Backtracking constraint solver (CSP with Dynamic MRV + Forward Checking).
// Explores the whole assignment space of solo options AND chains, so a
// globally optimal distribution is found even when a greedy pass would spend
// the elite generals on the first easy camp.
function backtrackCover(camps, optionsByPos, availByClass, pool, mode, budget = 30000) {
  const n = camps.length;
  for (let i = 0; i < n; i++) if (!optionsByPos[i].length) return null;

  const minLost = new Array(n);
  let lbTotal = 0;
  for (let i = 0; i < n; i++) {
    minLost[i] = Math.min(...optionsByPos[i].map((o) => o.lostValue));
    lbTotal += minLost[i];
  }

  const avail = new Map(availByClass);
  const poolNow = { ...pool };
  // chosen: [{pos, option}] — one entry per ANCHOR; a chain covers its other
  // camps without a separate entry.
  const chosen = [];
  const assigned = new Set();
  let best = null;
  let nodes = 0;

  const canTake = (opt) => {
    for (const [cid, cnt] of opt.classCounts) if ((avail.get(cid) || 0) < cnt) return false;
    return fitsPool(opt.usage, poolNow);
  };
  const apply = (opt, sign) => {
    for (const [cid, cnt] of opt.classCounts) avail.set(cid, (avail.get(cid) || 0) - sign * cnt);
    for (const [id, cnt] of Object.entries(opt.usage)) {
      if (poolNow[id] !== undefined) poolNow[id] -= sign * cnt;
    }
  };

  const solve = () => {
    if (assigned.size === n) {
      const picks = chosen.slice();
      const generals = picks.reduce((s, p) => s + p.option.generals, 0);
      const value = picks.reduce((s, p) => s + p.option.lostValue, 0);
      // Priority 2: cheapest plan wins; generals only break ties (mode-aware).
      const better = !best || value < best.value ||
        (value === best.value && (mode === 'max' ? generals > best.generals : generals < best.generals));
      if (better) best = { picks, generals, value };
      return;
    }
    if (nodes++ > budget) return;
    // Proven optimum: the theoretical price floor has been reached.
    if (best && best.value <= lbTotal) return;

    // Dynamic MRV: find the unassigned camp with the FEWEST remaining ways to
    // be served. A camp can be served by its own options AND by chains
    // anchored at other camps that cover it — without counting those, the
    // solver would assign solo options first and kill every chain.
    let bestCamp = null;
    let minDomain = Infinity;
    let bestSpread = -1;
    let bestValidOptions = null;

    for (let i = 0; i < n; i++) {
      if (assigned.has(i)) continue;
      const valid = optionsByPos[i].filter((o) =>
        o.covers.every((q) => !assigned.has(q)) && canTake(o));
      if (valid.length === 0) return; // Forward Checking: dead end, prune immediately!
      let domain = valid.length;
      let spread = valid.reduce((m, o) => Math.max(m, o.covers.length), 0);
      for (let j = 0; j < n; j++) {
        if (j === i || assigned.has(j)) continue;
        for (const o of optionsByPos[j]) {
          if (o.covers.length > 1 && o.covers.includes(i) &&
            o.covers.every((q) => q === i || !assigned.has(q)) && canTake(o)) {
            domain += 1;
            spread = Math.max(spread, o.covers.length);
            break;
          }
        }
      }
      if (domain < minDomain || (domain === minDomain && spread > bestSpread)) {
        minDomain = domain;
        bestSpread = spread;
        bestCamp = i;
        bestValidOptions = valid;
        if (minDomain === 1 && spread === 1) break;
      }
    }

    if (bestCamp === null || !bestValidOptions) return;

    // Try options that cover MORE camps first (chains keep the wave alive),
    // then the cheapest — so the first complete solution is already good.
    const sorted = bestValidOptions.sort((a, b) =>
      b.covers.length - a.covers.length ||
      a.lostValue - b.lostValue || a.generals - b.generals || a.capacitySum - b.capacitySum
    );

    for (const opt of sorted) {
      const fresh = opt.covers.filter((q) => !assigned.has(q));
      apply(opt, 1);
      chosen.push({ pos: bestCamp, option: opt });
      for (const q of fresh) assigned.add(q);
      solve();
      for (const q of fresh) assigned.delete(q);
      chosen.pop();
      apply(opt, -1);
      if (best && best.value <= lbTotal) return;
      if (nodes > budget) return;
    }
  };

  solve();
  return best ? best.picks : null;
}

// Both covers serve the same camps, so only HOW they take them can differ:
// priority 2 — the cheaper plan (loss value) wins; generals only break ties.
function pickBetterCover(a, b, mode) {
  if (!a) return b;
  if (!b) return a;
  const score = (picks) => ({
    generals: picks.reduce((s, p) => s + p.option.generals, 0),
    value: picks.reduce((s, p) => s + p.option.lostValue, 0),
  });
  const A = score(a); const B = score(b);
  if (A.value !== B.value) return A.value < B.value ? a : b;
  if (A.generals !== B.generals) {
    return mode === 'max' ? (A.generals > B.generals ? a : b) : (A.generals < B.generals ? a : b);
  }
  return a;
}

// Exact branch-and-bound over the set of served camps (bitmask). Always takes
// the LOWEST uncovered camp next, so every cover is enumerated once; chains
// may cover any set of still-open positions. Prunes with the optimistic
// per-camp price floor.
function bestCover(camps, optionsByPos, availByClass, pool, budget, mode) {
  const n = camps.length;
  if (n === 0) return [];
  if (n > 30) return null; // bitmask guard, heuristic covers still ran

  const minLost = new Array(n);
  for (let i = 0; i < n; i++) {
    if (!optionsByPos[i].length) return null;
    minLost[i] = Math.min(...optionsByPos[i].map((o) => o.lostValue));
  }
  const full = (1 << n) - 1;

  let best = null;
  let nodes = 0;
  let exhausted = false;

  const dfs = (mask, value, gens, picks) => {
    if (best && value + lbRemaining(mask) >= best.value) return;
    if (mask === full) {
      best = { picks: picks.slice(), value, gens };
      return;
    }
    if (nodes++ > budget) { exhausted = true; return; }
    let p = 0;
    while (mask & (1 << p)) p++;
    for (const opt of optionsByPos[p]) {
      let nextMask = mask;
      let ok = true;
      for (const q of opt.covers) {
        if (nextMask & (1 << q)) { ok = false; break; }
        nextMask |= (1 << q);
      }
      if (!ok) continue;
      // feasibility first, then track the class counters and pool imperatively
      if (!optionFits(opt)) continue;
      applyOption(opt, 1);
      picks.push({ pos: p, option: opt });
      dfs(nextMask, value + opt.lostValue, gens + opt.generals, picks);
      picks.pop();
      applyOption(opt, -1);
    }
  };

  const lbRemaining = (mask) => {
    let s = 0;
    for (let i = 0; i < n; i++) if (!(mask & (1 << i))) s += minLost[i];
    return s;
  };

  const avail = new Map(availByClass);
  const poolNow = { ...pool };
  const optionFits = (opt) => {
    for (const [cid, cnt] of opt.classCounts) if ((avail.get(cid) || 0) < cnt) return false;
    return fitsPool(opt.usage, poolNow);
  };
  const applyOption = (opt, sign) => {
    for (const [cid, cnt] of opt.classCounts) avail.set(cid, (avail.get(cid) || 0) - sign * cnt);
    for (const [id, cnt] of Object.entries(opt.usage)) {
      if (poolNow[id] !== undefined) poolNow[id] -= sign * cnt;
    }
  };

  dfs(0, 0, 0, []);
  if (best) return best.picks;
  if (!exhausted) return null;
  return greedyCover(camps, optionsByPos, availByClass, pool);
}

// Which camp should be deferred to the next wave when the full set cannot be
// covered: the camp that is hardest to serve alongside the others — fewest
// options that still fit the free resources, or the biggest general demand.
function pickDeferredCamp(camps, optionsByPos, availByClass, pool) {
  const avail = new Map(availByClass);
  const poolNow = { ...pool };
  let worst = -1;
  let worstKey = null;
  for (let p = 0; p < camps.length; p++) {
    const list = optionsByPos[p];
    const takeable = list.filter((o) =>
      o.classCounts.every(([cid, cnt]) => (avail.get(cid) || 0) >= cnt) &&
      fitsPool(o.usage, poolNow)).length;
    const minGen = list.length ? Math.min(...list.map((o) => o.generals)) : Infinity;
    // Higher key = defer first: unservable, then most constrained, then the
    // most general-hungry; ties defer the camp that comes later.
    const key = (list.length === 0 ? 1e9 : 0) +
      (1e6 - takeable * 1000) +
      minGen * 10 + p;
    if (worstKey === null || key > worstKey) { worstKey = key; worst = p; }
  }
  return worst;
}


// Travel time between two camps of a chain, in seconds. Real game path
// distances are used when the export carries them; otherwise the straight
// coordinate distance times travelSecPerTile. Both coefficients default to 0
// (pure battle timing) because general movement speed is player-specific.
function hopTravelSec(fromCamp, toCamp, timing) {
  if (!timing || (!timing.travelSecPerTile && !timing.travelBaseSec)) return 0;
  let dist = 0;
  if (fromCamp && toCamp) {
    const real = fromCamp.distancesToOtherCamps &&
      toCamp.grid != null && fromCamp.distancesToOtherCamps[toCamp.grid];
    if (real) dist = Number(real) || 0;
    else if (fromCamp.coordinates && toCamp.coordinates) {
      const dx = fromCamp.coordinates.x - toCamp.coordinates.x;
      const dy = fromCamp.coordinates.y - toCamp.coordinates.y;
      dist = Math.sqrt(dx * dx + dy * dy);
    }
  }
  return (timing.travelBaseSec || 0) + (timing.travelSecPerTile || 0) * dist;
}

// ---------------------------------------------------------------------------
// Main Tactical Plan Function (Worker Version)
// ---------------------------------------------------------------------------
function plan(input, onProgress) {
  const {
    adventure,
    adventureCamps,
    camps: campTokens,
    generalsExport,
    enabledGenerals,
    units = DEFAULT_UNITS,
    noLoss = [],
    stock: stockInput = input.limits || {},
    unitValues = {},
    stepPct = 10,
    reps = 60,
    verify = 400,
    lossAccounting = 'max',
    beam = 5,
    maxOptions = 8,
    chainCamps = false,
    chainSeeds = 3,
    sacrificePolicy = 'cheap',
    cheapUnits = DEFAULT_CHEAP_UNITS,
    wipeThreshold = 0.9,
    generalUsage = 'min',
    timeBudgetMs = 0,
    // How many different unit types one army may mix. Real plans use 3
    // (tank + two damage dealers), which is also the default here.
    maxUnitTypes = 3,
    // A general whose army is wiped out goes on a 2 hour cooldown in game, so
    // it cannot take part in the following waves of the same run.
    sacrificeCooldown = true,
    // These classes may be sacrificed once for free (no cooldown).
    freeSacrificeBases = DEFAULT_FREE_SACRIFICE_BASES,
    // Cap on how many camps ONE general may take in a chain (0 = unlimited).
    maxChainLength = 0,
    // Wave timing model: battle durations come from the engine; travel time
    // between the camps of a chain can be added on top. travelSecPerTile uses
    // camp coordinates (or real game distances when the export carries them).
    timing = {},
  } = input;

  // 'max' = employ as many generals as possible per wave (push further),
  // 'min' = spend as few generals as possible (default, v5 behaviour).
  const usageMode = generalUsage === 'max' ? 'max' : 'min';
  // "max" explores a wider space, so it gets a bigger search budget.
  const coverBudget = Number(input.coverBudget) > 0
    ? Number(input.coverBudget)
    : (usageMode === 'max' ? 60000 : 20000);

  const t0 = Date.now();
  if (!adventureCamps || !adventureCamps.length) {
    throw new Error('Данные лагерей приключения не переданы в Web Worker');
  }
  const camps = adventureCamps;
  const targets = resolveCamps(camps, campTokens);
  const warnings = [];
  let generals = buildGenerals(generalsExport, warnings);
  if (enabledGenerals && enabledGenerals.length) {
    generals = generals.filter((g) => enabledGenerals.includes(g.uid));
  }
  if (!generals.length) throw new Error('Не выбрано ни одного генерала');

  let classes = groupClasses(generals);
  let classById = new Map(classes.map((c) => [c.id, c]));

  // Calculate extra lives (1-UP free sacrifices) per general UID based on
  // innate base abilities (GhostGeneral, NarcissisticGeneral) and skills (Skill_InstantRecovery).
  const freeSacrificeSet = new Set(freeSacrificeBases || []);
  const extraLivesPerUid = new Map();
  for (const g of generals) {
    let lives = 0;
    if (freeSacrificeSet.has(g.base)) lives += 1;
    let hasInstantRecovery = false;
    if (Array.isArray(g.skills)) {
      hasInstantRecovery = g.skills.some((s) => typeof s === 'string' && s.startsWith('Skill_InstantRecovery'));
    } else if (g.skills && typeof g.skills === 'object') {
      hasInstantRecovery = Boolean(g.skills.Skill_InstantRecovery);
    }
    if (!hasInstantRecovery && g.skillList && typeof g.skillList === 'object') {
      hasInstantRecovery = Boolean(g.skillList.Skill_InstantRecovery || g.skillList['16'] || g.skillList[16]);
    }
    if (hasInstantRecovery) lives += 1;
    // In TSO, extra lives do not stack beyond 1 (max 1 free resurrection per adventure).
    extraLivesPerUid.set(g.uid, Math.min(1, lives));
  }
  const burnedUids = new Set();

  // No limit by default: a squad may use every general you own.
  const raw = input.maxGeneralsPerCamp;
  const requested = (raw === undefined || raw === null || raw === '' ||
    Number(raw) <= 0 || !Number.isFinite(Number(raw))) ? generals.length : Number(raw);
  const maxGeneralsPerCamp = Math.max(1, Math.min(requested, generals.length));

  const cheapSet = new Set(cheapUnits);
  const timingOpts = {
    travelSecPerTile: Number(timing.travelSecPerTile) || 0,
    travelBaseSec: Number(timing.travelBaseSec) || 0,
  };
  const opts = {
    units, noLoss,
    unitValues: Object.keys(unitValues || {}).length ? { ...DEFAULT_UNIT_VALUES, ...unitValues } : DEFAULT_UNIT_VALUES,
    stepPct, reps, verify, lossAccounting,
    maxUnitTypes,
    maxGeneralsPerCamp, beam, maxOptions,
    chainCamps, chainSeeds, maxChainLength,
    sacrificePolicy, wipeThreshold,
    generalUsage: usageMode,
    limits: {},
    isCheap: (id) => cheapSet.has(id),
    timeBudgetMs,
    t0,
  };

  const stock = {};
  for (const u of units) {
    const v = stockInput[u];
    if (v !== undefined && v !== null && v !== '') stock[u] = Number(v);
  }
  const initialStock = { ...stock };
  // Pressure on the limited stock is always measured against the starting
  // amounts, so options stay comparable from wave to wave.
  opts.limits = initialStock;

  let remaining = targets.slice();
  const waves = [];
  const optionCache = new Map();
  const campInfo = new Map();
  let stopReason = null;
  let guard = 0;
  let timedOut = false;

  while (remaining.length && guard++ < 60) {
    if (timeBudgetMs > 0 && (Date.now() - t0) >= timeBudgetMs) {
      timedOut = true;
      stopReason = 'Превышен лимит времени выполнения (' + Math.round(timeBudgetMs / 1000) + ' сек). Рассчитано волн: ' + waves.length;
      break;
    }

    const reach = chainCamps ? generals.length * 2 + 4 : generals.length + 4;
    const window = remaining.slice(0, Math.min(remaining.length, reach));
    const availByClass = new Map(classes.map((c) => [c.id, c.members.length]));

    const optionsByCamp = new Map();
    for (let cIdx = 0; cIdx < window.length; cIdx++) {
      const camp = window[cIdx];
      if (timeBudgetMs > 0 && (Date.now() - t0) >= timeBudgetMs) {
        timedOut = true;
        break;
      }
      if (typeof onProgress === 'function') {
        const solved = targets.length - remaining.length + cIdx;
        const total = targets.length;
        const pct = Math.min(99, Math.round((solved / total) * 100));
        onProgress({
          stage: 'searching',
          currentCamp: camp.number,
          solvedCamps: solved,
          totalCamps: total,
          pct,
          waveIndex: waves.length + 1,
        });
      }
      // Every wave starts with all generals free, and units marked "no loss"
      // never shrink the stock, so the search result for a camp is usually
      // identical wave after wave. Recomputing it was the single most
      // expensive thing the planner did.
      const cacheKey = camp.key + '|' +
        [...availByClass].map(([k, v]) => k + ':' + v).join(',') + '|' +
        Object.entries(stock).map(([k, v]) => k + ':' + v).join(',');
      let found = optionCache.get(cacheKey);
      if (!found) {
        found = findCampOptions(camp, classes, availByClass, stock, opts);
        optionCache.set(cacheKey, found);
      }
      optionsByCamp.set(camp.key, found);
      if (!campInfo.has(camp.key)) {
        campInfo.set(camp.key, {
          soloable: found.soloable,
          minGenerals: found.options.length ? found.options[0].generals : null,
          sacrificeExempt: !!found.sacrificeExempt,
        });
      }
    }
    if (timedOut) {
      stopReason = 'Превышен лимит времени выполнения (' + Math.round(timeBudgetMs / 1000) + ' сек). Рассчитано волн: ' + waves.length;
      break;
    }

    const chainsByAnchor = buildChainOptions(window, optionsByCamp, classById, stock, opts);
    const soloByWindowIdx = new Map();
    for (let wi = 0; wi < window.length; wi++) {
      soloByWindowIdx.set(wi, (optionsByCamp.get(window[wi].key) || {}).options || []);
    }

    // PRIORITY 1 — serve as many camps as possible in THIS wave. Start with
    // every camp of the window; only when the exact cover search fails are the
    // least servable camps deferred to the next wave. This is what keeps the
    // plan at the minimum number of waves: a hard camp in the middle no longer
    // pushes every later camp into an extra wave.
    let positions = window.map((_, wi) => wi);
    let chosen = null;
    const deferredIdx = [];
    let deferredReason = null;
    while (positions.length) {
      if (timeBudgetMs > 0 && (Date.now() - t0) >= timeBudgetMs) {
        timedOut = true;
        break;
      }
      const waveCamps = positions.map((wi) => window[wi]);
      const optionsByPos = buildPositionOptions(positions, soloByWindowIdx, chainsByAnchor);
      // Whether a wave fits at all usually depends on which bottleneck is
      // respected, so every allocation strategy gets a shot before the wave is
      // declared impossible; the best result wins.
      lastCoverFail = null;
      const tries = COVER_STRATEGIES.map((s) =>
        coverByDifficulty(waveCamps, optionsByPos, availByClass, stock, usageMode, s));
      tries.push(backtrackCover(waveCamps, optionsByPos, availByClass, stock, usageMode));
      tries.push(bestCover(waveCamps, optionsByPos, availByClass, stock, coverBudget, usageMode));
      chosen = tries.reduce((best, c) => pickBetterCover(best, c, usageMode), null);
      if (chosen) break;
      if (positions.length === 1) break;
      if (!deferredReason && lastCoverFail) deferredReason = lastCoverFail;
      const dropPos = pickDeferredCamp(waveCamps, optionsByPos, availByClass, stock);
      deferredIdx.push(positions[dropPos]);
      positions.splice(dropPos, 1);
    }
    if (timedOut) {
      stopReason = 'Превышен лимит времени выполнения (' + Math.round(timeBudgetMs / 1000) + ' сек). Рассчитано волн: ' + waves.length;
      break;
    }

    if (!chosen) {
      const head = remaining[0];
      const info = optionsByCamp.get(head.key) || { options: [] };
      stopReason = info.options.length
        ? 'Лагерь ' + head.number + ': нужен отряд из ' + info.options[0].generals +
          ' генералов, но столько свободных генералов/войск в этой волне нет'
        : 'Лагерь ' + head.number + ' не берётся даже отрядом из ' + maxGeneralsPerCamp +
          ' генералов (добавь генералов, юниты с фланки��ованием ' +
          '(ArmoredMarksman/Cavalry) или увеличь запас войск)';
      break;
    }

    const stockBefore = { ...stock };
    const waveLosses = {};
    const freeByClass = new Map(classes.map((c) => [c.id, c.members.slice()]));
    const attacks = [];
    const takenWindowIdx = [];
    let waveEndSec = 0;

    for (const { pos, option } of chosen) {
      const info = (k) => campInfo.get(k) || {};
      for (const [id, n] of Object.entries(option.losses)) {
        waveLosses[id] = (waveLosses[id] || 0) + n;
        if (stock[id] !== undefined) stock[id] = Math.max(0, stock[id] - n);
      }

      if (option.kind === 'chain') {
        const g = freeByClass.get(option.classId).shift();
        const general = {
          uid: g.uid,
          name: g.name,
          base: g.base,
          capacity: g.capacity,
          type: g.type,
          grid: g.grid,
          rawName: g.rawName,
          skills: g.skillList,
        };
        // The general walks its camps one after another: battle times and
        // travel between the camps accumulate into one sequence.
        let seqSec = 0;
        let prevCamp = null;
        option.campsIdx.forEach((cwi, t) => {
          const camp = window[cwi];
          if (prevCamp) seqSec += hopTravelSec(prevCamp, camp, timingOpts);
          const startSec = seqSec;
          const pc = option.perCamp[t];
          const dur = pc.durationSec || 0;
          seqSec += dur;
          waveEndSec = Math.max(waveEndSec, seqSec);
          prevCamp = camp;
          takenWindowIdx.push(cwi);
          attacks.push({
            camp: {
              number: camp.number,
              key: camp.key,
              type: camp.type,
              sector: camp.sector,
              building: camp.building || null,
              coordinates: camp.coordinates || null,
              position: camp.position || null,
              units: camp.units,
            },
            generalsUsed: t === 0 ? 1 : 0,
            chained: true,
            chainIndex: t + 1,
            chainTotal: option.campsIdx.length,
            chainCamps: option.perCamp.map((x) => x.campNumber),
            squad: [{
              order: 1,
              role: t === 0 ? 'соло' : 'тот же генерал, шаг ' + (t + 1),
              general,
              army: pc.armyBefore,
              defKills: pc.defKills,
              rounds: pc.rounds,
              durationSec: dur,
              startSec,
              perUnit: pc.perUnit,
            }],
            army: pc.armyBefore,
            general,
            lostValue: t === 0 ? option.lostValue : 0,
            lostAmount: t === 0 ? option.lostAmount : 0,
            xp: t === 0 ? option.xp : 0,
            perUnit: t === 0 ? option.perUnit : pc.perUnit,
            losses: t === 0 ? option.losses : {},
            soloable: info(camp.key).soloable,
            sacrificeExempt: !!option.sacrificeExempt,
            startSec,
            durationSec: dur,
            endSec: seqSec,
          });
        });
        continue;
      }

      const camp = window[positions[pos]];
      // Squad steps hit the same camp strictly in sequence: general 2 attacks
      // what is left after general 1.
      let seqSec = 0;
      const squad = option.squad.map((s) => {
        const g = freeByClass.get(s.classId).shift();
        const startSec = seqSec;
        const dur = s.durationSec || 0;
        seqSec += dur;
        return {
          ...s,
          startSec,
          durationSec: dur,
          endSec: seqSec,
          general: {
            uid: g.uid,
            name: g.name,
            base: g.base,
            capacity: g.capacity,
            type: g.type,
            grid: g.grid,
            rawName: g.rawName,
            skills: g.skillList,
          },
        };
      });
      waveEndSec = Math.max(waveEndSec, seqSec);
      takenWindowIdx.push(positions[pos]);
      attacks.push({
        camp: {
          number: camp.number,
          key: camp.key,
          type: camp.type,
          sector: camp.sector,
          building: camp.building || null,
          coordinates: camp.coordinates || null,
          position: camp.position || null,
          units: camp.units,
        },
        generalsUsed: option.generals,
        chained: false,
        squad,
        army: option.squad.length === 1 ? option.squad[0].army : undefined,
        general: squad[0].general,
        lostValue: option.lostValue,
        lostAmount: option.lostAmount,
        xp: option.xp,
        perUnit: option.perUnit,
        losses: option.losses,
        soloable: info(camp.key).soloable,
        sacrificeExempt: !!option.sacrificeExempt,
        startSec: 0,
        durationSec: seqSec,
        endSec: seqSec,
      });
    }

    // Who did we throw away in this wave? An army that is (almost) completely
    // wiped means the general is dead: 2 hours of cooldown, so it is out for
    // the rest of the run. Ghost and Narcissistic generals survive their first
    // sacrifice for free and stay available.
    const burned = [];
    if (sacrificeCooldown) {
      for (const atk of attacks) {
        for (const step of atk.squad) {
          const total = step.army.reduce((s, u) => s + u.amount, 0);
          if (!total) continue;
          const lost = (step.perUnit || []).reduce((s, u) => s + (u.max || 0), 0);
          if (lost / total < wipeThreshold) continue;
          const uid = step.general.uid;
          if (burnedUids.has(uid)) continue;
          const livesLeft = extraLivesPerUid.get(uid) || 0;
          if (livesLeft > 0) {
            extraLivesPerUid.set(uid, livesLeft - 1);
            burned.push({
              uid,
              name: step.general.name,
              base: step.general.base,
              free: true,
              livesRemaining: livesLeft - 1,
            });
            continue;
          }
          burnedUids.add(uid);
          burned.push({ uid, name: step.general.name, base: step.general.base, free: false });
        }
      }
    }

    let blocker = null;
    if (deferredIdx.length) {
      const wi = deferredIdx[0];
      const dInfo = optionsByCamp.get(window[wi].key) || { options: [] };
      blocker = {
        number: window[wi].number,
        need: dInfo.options.length ? dInfo.options[0].generals : null,
        reason: (deferredReason && deferredReason.reason) ||
          'не хватило свободных генералов/войск в этой волне',
      };
    }

    waves.push({
      index: waves.length + 1,
      burned,
      blocker,
      deferred: deferredIdx.map((wi) => ({
        number: window[wi].number,
        key: window[wi].key,
      })),
      durationSec: Math.round(waveEndSec * 10) / 10,
      stockBefore,
      stockAfter: { ...stock },
      waveLosses,
      generalsUsed: attacks.reduce((s, a) => s + a.generalsUsed, 0),
      generalsAvailable: generals.length,
      waveUsage: attacks.reduce((acc, a) => {
        if (a.chained && a.chainIndex > 1) return acc;
        for (const s of a.squad) for (const u of s.army) acc[u.id] = (acc[u.id] || 0) + u.amount;
        return acc;
      }, {}),
      attacks,
    });
    const takenKeys = new Set(takenWindowIdx.map((wi) => window[wi].key));
    remaining = remaining.filter((c) => !takenKeys.has(c.key));

    if (typeof onProgress === 'function') {
      const solved = targets.length - remaining.length;
      const total = targets.length;
      const pct = Math.min(100, Math.round((solved / total) * 100));
      onProgress({
        stage: 'wave_done',
        solvedCamps: solved,
        totalCamps: total,
        pct,
        waveIndex: waves.length,
      });
    }

    if (burnedUids.size) {
      const before = generals.length;
      generals = generals.filter((g) => !burnedUids.has(g.uid));
      if (generals.length !== before) {
        classes = groupClasses(generals);
        classById = new Map(classes.map((c) => [c.id, c]));
        // Cached camp options were computed with the old class list.
        optionCache.clear();
      }
      if (!generals.length && remaining.length) {
        stopReason = 'Все генералы на откате после сливов (2 ч), собрать ещё одну волну не из кого';
        break;
      }
    }
  }

  const totalLosses = {};
  for (const w of waves) {
    for (const [u, n] of Object.entries(w.waveLosses || {})) {
      if (n > 0) totalLosses[u] = Math.round(((totalLosses[u] || 0) + n) * 10) / 10;
    }
  }
  const totalLostResources = calcLostResources(totalLosses);
  const totalUnitsLost = Math.round(Object.values(totalLosses).reduce((s, v) => s + v, 0) * 10) / 10;

  return {
    adventure,
    order: targets.map((c) => c.number),
    lossAccounting,
    maxGeneralsPerCamp,
    chainCamps,
    sacrificePolicy,
    generalUsage: usageMode,
    initialStock,
    finalStock: stock,
    waves,
    unsolved: remaining.map((c) => ({
      number: c.number, key: c.key, type: c.type,
      soloable: (campInfo.get(c.key) || {}).soloable,
      minGenerals: (campInfo.get(c.key) || {}).minGenerals,
    })),
    warnings,
    stopReason,
    timedOut,
    totalCamps: waves.reduce((s, w) => s + w.attacks.length, 0),
    totalGenerals: waves.reduce((s, w) => s + w.generalsUsed, 0),
    totalLostValue: waves.flatMap((w) => w.attacks).reduce((s, a) => s + a.lostValue, 0),
    totalLosses,
    totalUnitsLost,
    totalResources: totalLostResources,
    seconds: (Date.now() - t0) / 1000,
  };
}


// ---------------------------------------------------------------------------
// Worker Message Dispatcher
// ---------------------------------------------------------------------------
self.onmessage = async (e) => {
  const { type, payload } = e.data || {};

  if (type === 'INIT') {
    try {
      await ensureEngine();
      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: 'Failed to init WASM: ' + (err.message || String(err)) });
    }
    return;
  }

  if (type === 'START_PLAN') {
    try {
      await ensureEngine();
      const res = plan(payload, (progress) => {
        self.postMessage({ type: 'PROGRESS', data: progress });
      });
      self.postMessage({ type: 'RESULT', data: res });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message || String(err) });
    }
  }
};
