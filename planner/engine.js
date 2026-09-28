// Real TSO combat engine (tsowiki WASM) running offline in Node.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
// Drop any adventure JSON from tsowiki.eu/data/adventures/<id>.json in here.
const ADVENTURE_DIR = process.env.TSO_ADVENTURES || path.join(ROOT, 'adventures');

function adventureFile(id) {
  const candidates = [
    path.join(ADVENTURE_DIR, id + '.json'),
    path.join(ROOT, id + '.json'), // legacy location
  ];
  for (const f of candidates) if (fs.existsSync(f)) return f;
  throw new Error(
    '\u041d\u0435\u0442 \u0444\u0430\u0439\u043b\u0430 \u043f\u0440\u0438\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f: ' + id + '.json (\u043f\u043e\u043b\u043e\u0436\u0438\u0442\u0435 \u0435\u0433\u043e \u0432 ' + ADVENTURE_DIR + ')'
  );
}

let wb = null;
let lastWasmError = null;

function loadEngine() {
  if (wb) return wb;
  const RealError = Error;
  function LoggingError(msg) {
    lastWasmError = String(msg);
    return new RealError(msg);
  }
  LoggingError.prototype = RealError.prototype;
  const src = fs.readFileSync(path.join(ROOT, 'wasm.js'), 'utf8');
  const ctx = {
    console, TextEncoder, TextDecoder, WebAssembly, Symbol, FinalizationRegistry,
    URL, Error: LoggingError, Number, Object, Array, Uint8Array, ArrayBuffer,
    crypto: require('crypto').webcrypto, BigInt, String, Boolean, Math, JSON, Map, Set,
  };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;globalThis.__wb = wasm_bindgen;', ctx);
  wb = ctx.__wb;
  wb.initSync({ module: fs.readFileSync(path.join(ROOT, 'wasm_bg.wasm')) });
  return wb;
}

// Capacity is computed by the engine itself, exactly like the web simulator does.
function generalCapacity(base, skills = []) {
  const engine = loadEngine();
  const entity = { General: { uid: 'probe', capacity: 0, skills, unit: { id: base, value: 0, amount: 1 } } };
  const data = engine.Tooltip.get_data(entity, skills);
  return data.capacity;
}

function listAdventures() {
  if (!fs.existsSync(ADVENTURE_DIR)) fs.mkdirSync(ADVENTURE_DIR, { recursive: true });
  const dirs = [ADVENTURE_DIR, ROOT];
  const seen = new Map();
  for (const dir of dirs) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const id = f.replace(/\.json$/, '');
      if (seen.has(id)) continue;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (!d.camps) continue;
        seen.set(id, { id, camps: Object.keys(d.camps).length, dir });
      } catch (e) { /* not an adventure file */ }
    }
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function loadAdventure(id) {
  const data = JSON.parse(fs.readFileSync(adventureFile(id), 'utf8'));
  const camps = Object.entries(data.camps).map(([key, c]) => ({
    key,
    number: c.number,
    type: c.type,
    sector: c.sector,
    building: c.building || null,
    coordinates: c.coordinates || null,
    position: c.position || null,
    hitpoints: c.hitpoints ?? 250,
    units: c.units.map((u) => ({ id: u.id, value: 0, amount: u.amount })),
  }));
  camps.sort((a, b) => a.number - b.number);
  return { data, camps };
}

function campGarrison(camp) {
  return {
    kind: 'Default',
    hitpoints: camp.hitpoints ?? 250,
    camp_id: camp.key,
    camp_type: camp.type || 'Small',
    general: null,
    units: (camp.units || []).map((u) => ({
      id: u.id,
      value: u.value != null ? Number(u.value) : 0,
      amount: Number(u.amount) || 0,
    })),
  };
}

// army: [{id, amount}], general: {uid, base, skills:[], capacity}
function simulate({ camp, army, general, repetitions = 100, buffs = [], unitValues = {} }) {
  const engine = loadEngine();
  const units = army
    .filter((u) => u.amount > 0)
    .map((u) => ({ id: u.id, value: unitValues[u.id] ?? 1, amount: u.amount }));
  const attacker = {
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
      units,
    },
  };
  const config = { repetitions, skip_by: false, skip_by_victory: false, skip_by_losses: null, buffs };
  const battles = engine.Battles.init(config, [attacker], [campGarrison(camp)]);
  const res = battles.run();
  const br = res.battle_results[0];
  return {
    victoryChance: res.victory_chance,
    lostAmount: res.lost_amount,
    lostValue: res.lost_value,
    xp: res.xp,
    duration: res.max_duration,
    perUnit: br ? br.attacker.map((u) => ({ id: u.id, lost: u.lost_amount, max: u.lost.max })) : [],
  };
}

module.exports = {
  ADVENTURE_DIR,
  loadEngine,
  generalCapacity,
  listAdventures,
  loadAdventure,
  simulate,
  campGarrison,
  lastWasmError: () => lastWasmError,
};
