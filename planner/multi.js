// Multi-general (squad) and multi-camp (chain) simulation on the real WASM engine.
//
// KEY ENGINE FACTS (verified empirically):
//  1) Battles.init(config, attackers[], defenders[]) accepts SEVERAL attackers.
//     Each attacker is a separate sequential battle against the SAME camp and
//     defender casualties CARRY OVER from one general to the next.
//     Top-level victory_chance == 1 means the camp is fully cleared.
//     -> that is a real in-game multi-general attack on one camp (a "squad").
//  2) The same call accepts SEVERAL defenders. One attacker then fights the
//     camps one after another with the army it has left.
//     -> that is the "one army takes several camps in a row" trick (a "chain").
// Results are grouped by attacker_wave (squad step) and defender_wave (camp).
const { loadEngine, campGarrison } = require('./engine');

const statsCache = new Map();

// Unit stats straight from the engine tooltip: ini / hp / dmg / splash / flanking.
function unitStats(id) {
  if (statsCache.has(id)) return statsCache.get(id);
  const engine = loadEngine();
  let d = null;
  try {
    d = engine.Tooltip.get_data({ Unit: { id, value: 0, amount: 1 } }, []);
  } catch (e) { d = null; }
  statsCache.set(id, d);
  return d;
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

function run(engine, config, attackers, defenders) {
  return engine.Battles.init(config, attackers, defenders).run();
}

// squad: [{ general, army }] in attack order (general 1, general 2, ...)
function simulateSquad({ camp, squad, repetitions = 60, unitValues = {}, buffs = [] }) {
  const engine = loadEngine();
  const attackers = squad.map((s) => attackerGarrison(s.general, s.army, unitValues));
  const config = { repetitions, skip_by: false, skip_by_victory: false, skip_by_losses: null, buffs };
  const res = run(engine, config, attackers, [campGarrison(camp)]);

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
      // only real troops, never the general figure itself
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

// ONE general + ONE army against SEVERAL camps in a row.
// The army keeps its casualties from camp to camp, so this is the exact
// in-game behaviour of sending a general through a chain of camps.
// Succeeds only when every camp in the chain is cleared with 100% certainty.
function simulateChainCamps({ camps, general, army, repetitions = 60, unitValues = {}, buffs = [] }) {
  const engine = loadEngine();
  const config = { repetitions, skip_by: false, skip_by_victory: false, skip_by_losses: null, buffs };
  const ids = new Set(army.map((u) => u.id));
  const res = run(
    engine,
    config,
    [attackerGarrison(general, army, unitValues)],
    camps.map((c) => campGarrison(c)),
  );

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

module.exports = { simulateSquad, simulateChainCamps, unitStats, attackerGarrison };
