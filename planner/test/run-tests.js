// Auto-battle wave planner tests.
//
// Two levels:
//  1) pure algorithm tests of the wave-cover solver (no WASM, deterministic);
//  2) end-to-end plan() scenarios on the real engine with synthetic camps
//     (adventureCamps), covering the acceptance criteria of the optimizer:
//     minimum waves first, cheapest plan second, chain reuse, timing.
//  3) a regression test of the browser worker path (planner.worker.js).
//
// Run: npm test  (or: node planner/test/run-tests.js)
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { plan, buildPositionOptions, greedyCover, backtrackCover, bestCover,
  pickDeferredCamp, hopTravelSec } = require('../planner');

const TESTS = [];
function test(name, fn) { TESTS.push({ name, fn }); }

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const BASE = path.join(__dirname, '..');

function genSpec(id, name, base, capacity) {
  return { id, name, base, capacity, skills: {} };
}
const G215 = (n) => genSpec('g215' + n, 'G215-' + n, 'General', 215);
const M285 = () => genSpec('m285', 'M285', 'MajorGeneral', 285);
const roster = (list) => ({ specialists: list });

// Synthetic camps with calibrated difficulty (see run-tests comments):
//   EASY — 10 BanditRecruit, any army wins, ~0 losses
//   MED  — 40 DefensiveMiner + 50 RecklessRider: 215 Swordsman wins
//   HARD — 70 DefensiveMiner + 85 RecklessRider: 215 Swordsman loses,
//          285 Swordsman wins, a 2x215 Swordsman squad wins
const EASY = (n) => ({
  key: 'easy' + n, number: n, type: 'Small', sector: 1, hitpoints: 250,
  coordinates: { x: n, y: n },
  units: [{ id: 'BanditRecruit', value: 0, amount: 10 }],
});
const MED = (n) => ({
  key: 'med' + n, number: n, type: 'Small', sector: 1, hitpoints: 250,
  units: [{ id: 'DefensiveMiner', value: 0, amount: 40 }, { id: 'RecklessRider', value: 0, amount: 50 }],
});
const HARD = (n) => ({
  key: 'hard' + n, number: n, type: 'Small', sector: 1, hitpoints: 250,
  units: [{ id: 'DefensiveMiner', value: 0, amount: 70 }, { id: 'RecklessRider', value: 0, amount: 85 }],
});

function runPlan(camps, generals, tokens, extra) {
  return plan(Object.assign({
    adventure: 'test',
    adventureCamps: camps,
    camps: tokens,
    generalsExport: generals,
    units: ['Swordsman'],
    reps: 20,
    verify: 60,
    lossAccounting: 'max',
  }, extra || {}));
}

const allAttacks = (r) => r.waves.flatMap((w) => w.attacks);

// ---------------------------------------------------------------------------
// 1) Pure solver tests (deterministic, no engine)
// ---------------------------------------------------------------------------
const opt = (lostValue, classes, covers, extra) => Object.assign({
  lostValue, classCounts: classes, covers, generals: classes.reduce((s, [, n]) => s + n, 0),
  usage: {}, capacitySum: lostValue, poolPressure: 0,
}, extra || {});

test('solver: globally optimal assignment beats greedy-in-order (3 camps x 3 generals)', () => {
  // Task example, section 4: the strong general (S, 1 copy) must go where it
  // pays most, not to the first camp where it is locally cheapest.
  const S = 'Strong|1', W = 'Weak|1';
  const camps = [{ number: 1 }, { number: 2 }, { number: 3 }];
  const optionsByPos = [
    [opt(10, [[W, 1]], [0]), opt(6, [[S, 1]], [0])],   // greedy takes S here (6 < 10)
    [opt(50, [[W, 1]], [1]), opt(7, [[S, 1]], [1])],   // S is worth 43 here
    [opt(50, [[W, 1]], [2]), opt(8, [[S, 1]], [2])],
  ];
  const avail = new Map([[W, 2], [S, 1]]);
  const picks = bestCover(camps, optionsByPos, avail, {}, 100000, 'min');
  assert.ok(picks, 'cover must exist');
  const total = picks.reduce((s, p) => s + p.option.lostValue, 0);
  // Optimal: camp1=W(10), camp2=S(7), camp3=W(50) => 67; greedy would give 106.
  assert.strictEqual(total, 67, 'bestCover must find the global optimum, got ' + total);
  const bt = backtrackCover(camps, optionsByPos, avail, {}, 'min', 100000);
  assert.ok(bt, 'backtrackCover must find a cover');
  assert.strictEqual(bt.reduce((s, p) => s + p.option.lostValue, 0), 67);
});

test('solver: chain covering NON-ADJACENT camps is used when cheaper', () => {
  const X = 'General|250';
  const camps = [{ number: 1 }, { number: 2 }, { number: 3 }];
  const optionsByPos = [
    [opt(100, [[X, 1]], [0]), opt(50, [[X, 1]], [0, 2], { kind: 'chain' })],
    [opt(5, [[X, 1]], [1])],
    [opt(100, [[X, 1]], [2])],
  ];
  // Two generals: one runs the chain (camps 1 and 3), one solos camp 2.
  const avail = new Map([[X, 2]]);
  const picks = bestCover(camps, optionsByPos, avail, {}, 100000, 'min');
  assert.ok(picks, 'cover must exist');
  const total = picks.reduce((s, p) => s + p.option.lostValue, 0);
  assert.strictEqual(total, 55, 'chain(0,2)=50 + solo(1)=5, got ' + total);
  const chain = picks.find((p) => p.option.covers.length > 1);
  assert.ok(chain, 'a chain option must be selected');
  assert.deepStrictEqual(chain.option.covers, [0, 2]);
});

test('solver: pickDeferredCamp defers unservable camps first', () => {
  const X = 'General|250';
  const camps = [{ number: 1 }, { number: 2 }];
  const optionsByPos = [
    [opt(1, [[X, 1]], [0]), opt(2, [[X, 1]], [0]), opt(3, [[X, 1]], [0])],
    [], // no options at all
  ];
  assert.strictEqual(pickDeferredCamp(camps, optionsByPos, new Map([[X, 1]]), {}), 1);
});

test('solver: greedyCover rolls back class counters of rejected options', () => {
  // Regression: a rejected option must not leak class counts back into the pool.
  const A = 'A|200', B = 'B|200';
  const camps = [{ number: 1 }];
  const optionsByPos = [
    [opt(1, [[A, 1], [B, 1]], [0]), opt(2, [[B, 1]], [0])],
  ];
  // A has 1 free, B has 0: the first option fails on B; the second option
  // must ALSO fail (B is still 0), so the cover is impossible.
  const picks = greedyCover(camps, optionsByPos, new Map([[A, 1], [B, 0]]), {});
  assert.strictEqual(picks, null, 'leaked rollback would wrongly accept option 2');
});

test('solver: buildPositionOptions keeps only chains fully inside the wave', () => {
  const solo = new Map([[0, [opt(1, [['X', 1]], [0])]], [2, [opt(1, [['X', 1]], [0])]], [4, [opt(1, [['X', 1]], [0])]]]);
  const chains = new Map([
    [0, [Object.assign(opt(9, [['X', 1]], [0, 2]), { campsIdx: [0, 2] })]],
    [2, [Object.assign(opt(9, [['X', 1]], [0, 2, 4]), { campsIdx: [2, 4] })]],
  ]);
  const positions = [0, 2, 4];
  const byPos = buildPositionOptions(positions, solo, chains);
  assert.strictEqual(byPos.length, 3);
  // chain anchored at window 0 covers window idx 0 and 2 -> positions 0 and 1
  const chain0 = byPos[0].find((o) => o.covers.length > 1);
  assert.deepStrictEqual(chain0.covers, [0, 1]);
  // chain anchored at window 2 covers window idx 2 and 4 -> positions 1 and 2
  const chain2 = byPos[1].find((o) => o.covers.length > 1);
  assert.deepStrictEqual(chain2.covers, [1, 2]);
  // dropping camp 4 (position 2) invalidates the chain anchored at 2
  const byPos2 = buildPositionOptions([0, 2], solo, chains);
  assert.strictEqual(byPos2[1].filter((o) => o.covers.length > 1).length, 0,
    'chain needs camp 4, must be dropped');
});

test('timing: hopTravelSec uses coordinates, real distances and config', () => {
  const a = { coordinates: { x: 0, y: 0 } };
  const b = { coordinates: { x: 3, y: 4 } }; // 5 tiles away
  assert.strictEqual(hopTravelSec(a, b, {}), 0, 'no timing config -> 0');
  assert.strictEqual(hopTravelSec(a, b, { travelSecPerTile: 2 }), 10);
  assert.strictEqual(hopTravelSec(a, b, { travelBaseSec: 7, travelSecPerTile: 2 }), 17);
  const real = { distancesToOtherCamps: { 42: 3 } };
  assert.strictEqual(hopTravelSec(real, { grid: 42 }, { travelSecPerTile: 5 }), 15);
  assert.strictEqual(hopTravelSec({}, {}, { travelBaseSec: 4 }), 4);
});

// ---------------------------------------------------------------------------
// 2) End-to-end plan() scenarios on the real engine
// ---------------------------------------------------------------------------
test('scenario: all camps in one wave when generals >= camps', () => {
  const camps = [EASY(1), EASY(2), EASY(3), EASY(4), EASY(5)];
  const r = runPlan(camps, roster([G215(1), G215(2), G215(3), G215(4), G215(5)]),
    ['1', '2', '3', '4', '5'], { chainCamps: false });
  assert.strictEqual(r.waves.length, 1, 'one wave expected, got ' + r.waves.length);
  assert.strictEqual(r.totalCamps, 5);
  for (const a of allAttacks(r)) {
    assert.strictEqual(a.generalsUsed, 1);
    assert.strictEqual(a.chained, false);
  }
});

test('scenario: one wave only via general reuse (chains), fewer generals than camps', () => {
  const camps = [EASY(1), EASY(2), EASY(3), EASY(4), EASY(5)];
  const r = runPlan(camps, roster([M285()]), ['1', '2', '3', '4', '5'], { chainCamps: true });
  assert.strictEqual(r.waves.length, 1, 'chains must pack 5 camps into 1 wave');
  assert.strictEqual(r.totalCamps, 5);
  const chained = allAttacks(r).filter((a) => a.chained);
  assert.ok(chained.length >= 2, 'the general must reuse its army across camps');
  assert.strictEqual(chained[0].general.uid, chained[chained.length - 1].general.uid);
});

test('scenario: non-obvious distribution — strong general reserved for the hard camp', () => {
  const camps = [EASY(1), HARD(2)];
  const r = runPlan(camps, roster([G215(1), M285()]), ['1', '2'], { chainCamps: false });
  assert.strictEqual(r.waves.length, 1, '1 wave: 285 on hard, 215 on easy');
  const hard = allAttacks(r).find((a) => a.camp.number === 2);
  const easy = allAttacks(r).find((a) => a.camp.number === 1);
  assert.ok(hard, 'hard camp must be attacked');
  assert.strictEqual(hard.general.capacity, 285, 'hard camp needs the strong general');
  assert.strictEqual(easy.general.capacity, 215, 'weak general takes the easy camp');
});

test('scenario: squad comparison — 2x215 squad on hard when no strong general exists', () => {
  const camps = [HARD(1)];
  const r = runPlan(camps, roster([G215(1), G215(2)]), ['1'], { chainCamps: false });
  assert.strictEqual(r.waves.length, 1);
  const atk = allAttacks(r)[0];
  assert.strictEqual(atk.generalsUsed, 2, 'hard camp must fall to a 2-general squad');
  assert.strictEqual(atk.squad.length, 2);
});

test('scenario: strong general preferred over squad when solo is cheaper', () => {
  const camps = [HARD(2), EASY(1)];
  const r = runPlan(camps, roster([M285(), G215(1), G215(2)]), ['1', '2'], { chainCamps: false });
  assert.strictEqual(r.waves.length, 1);
  const hard = allAttacks(r).find((a) => a.camp.number === 2);
  assert.strictEqual(hard.generalsUsed, 1, 'solo 285 (cost 138) beats squad 2x215 (cost 268)');
  assert.strictEqual(hard.general.capacity, 285);
});

test('scenario: no one-wave solution — minimum two waves', () => {
  const camps = [EASY(1), EASY(2)];
  const r = runPlan(camps, roster([M285()]), ['1', '2'], { chainCamps: false });
  assert.strictEqual(r.waves.length, 2, 'one general without chains -> camp per wave');
  assert.strictEqual(r.waves[0].attacks.length, 1);
  assert.strictEqual(r.waves[1].attacks.length, 1);
  assert.strictEqual(r.totalCamps, 2);
});

test('scenario: same wave count — cheapest army family wins', () => {
  // Swordsmen are expensive (value 50), Recruits are cheap (value 1).
  // A pure Swordsman army loses ~3344 per camp; the mix that dumps losses
  // into cheap Recruits costs ~144. Same wave count -> pick the cheap one.
  const camps = [MED(1), MED(2)];
  const generals = roster([M285(), M285()]);
  const swordsOnly = runPlan(camps, generals, ['1', '2'],
    { chainCamps: false, units: ['Swordsman'] });
  const withBoth = runPlan(camps, generals, ['1', '2'],
    { chainCamps: false, units: ['Recruit', 'Swordsman'] });
  assert.strictEqual(swordsOnly.waves.length, 1);
  assert.strictEqual(withBoth.waves.length, 1, 'both plans are single-wave');
  assert.ok(withBoth.totalLostValue < swordsOnly.totalLostValue * 0.25,
    'planner must prefer the cheap-loss army family: ' + withBoth.totalLostValue +
    ' vs ' + swordsOnly.totalLostValue);
});

test('scenario: chained camps accumulate real battle time (sequential)', () => {
  const camps = [EASY(1), EASY(2), EASY(3)];
  const r = runPlan(camps, roster([M285()]), ['1', '2', '3'], { chainCamps: true });
  assert.strictEqual(r.waves.length, 1);
  const chained = allAttacks(r).filter((a) => a.chained);
  assert.ok(chained.length >= 2);
  // Each next chain camp must start exactly when the previous battle ends.
  for (let i = 1; i < chained.length; i++) {
    assert.ok(chained[i].startSec >= chained[i - 1].endSec - 0.01,
      'chain step ' + i + ' must not start before the previous fight ends');
  }
  const sumBattles = chained.reduce((s, a) => s + a.durationSec, 0);
  assert.ok(r.waves[0].durationSec >= sumBattles - 1,
    'wave duration must cover the whole sequential chain');
});

test('scenario: chained travel time adds between camps', () => {
  const camps = [EASY(1), EASY(2), EASY(3)];
  const plain = runPlan(camps, roster([M285()]), ['1', '2', '3'],
    { chainCamps: true, timing: {} });
  const travel = runPlan(camps, roster([M285()]), ['1', '2', '3'],
    { chainCamps: true, timing: { travelBaseSec: 10 } });
  assert.strictEqual(plain.waves.length, 1);
  assert.strictEqual(travel.waves.length, 1);
  const hops = travel.waves[0].attacks.filter((a) => a.chained).length - 1;
  const diff = travel.waves[0].durationSec - plain.waves[0].durationSec;
  assert.ok(Math.abs(diff - hops * 10) <= 5,
    'travel must add ' + (hops * 10) + 's, got +' + diff + 's');
});

test('scenario: independent attacks run in parallel (wave = max, not sum)', () => {
  const camps = [EASY(1), EASY(2)];
  const r = runPlan(camps, roster([G215(1), G215(2)]), ['1', '2'], { chainCamps: false });
  assert.strictEqual(r.waves.length, 1);
  const durs = allAttacks(r).map((a) => a.durationSec);
  assert.ok(durs.every((d) => d > 0), 'each attack has a real battle time');
  const sum = durs.reduce((s, d) => s + d, 0);
  assert.ok(r.waves[0].durationSec <= sum / 2 + 5,
    'wave duration must be the longest attack (' + r.waves[0].durationSec +
    '), not the sum (' + sum + ')');
});

test('constraints: noLoss units never die (army avoids them or survives)', () => {
  const camps = [MED(1)];
  const r = runPlan(camps, roster([M285()]), ['1'],
    { units: ['Recruit', 'Marksman'], noLoss: ['Marksman'] });
  assert.strictEqual(r.waves.length, 1, 'camp must be taken without losing Marksmen');
  const lost = (r.totalLosses && r.totalLosses.Marksman) || 0;
  assert.strictEqual(lost, 0, 'protected units must not die');
  for (const a of allAttacks(r)) {
    for (const s of a.squad) {
      for (const u of (s.perUnit || [])) {
        if (u.id === 'Marksman') assert.strictEqual(u.max, 0, 'Marksman may not be at risk');
      }
    }
  }
});

test('constraints: enabledGenerals subset is respected', () => {
  const camps = [EASY(1), EASY(2)];
  const r = runPlan(camps, roster([G215(1), G215(2), M285()]), ['1', '2'],
    { enabledGenerals: ['m285'], chainCamps: true });
  for (const a of allAttacks(r)) {
    assert.strictEqual(a.general.uid, 'm285', 'only the enabled general may fight');
  }
  assert.ok(r.totalCamps >= 1);
});

test('constraints: maxChainLength caps camps per general', () => {
  const camps = [EASY(1), EASY(2), EASY(3), EASY(4), EASY(5)];
  const r = runPlan(camps, roster([M285()]), ['1', '2', '3', '4', '5'],
    { chainCamps: true, maxChainLength: 2 });
  for (const a of allAttacks(r)) {
    // solo attacks are chains of length 1
    assert.ok((a.chainTotal || 1) <= 2, 'chains may not exceed the cap, got ' + a.chainTotal);
  }
  // 5 camps, at most 2 per general per wave -> at least 3 waves
  assert.strictEqual(r.waves.length, 3, 'expected 3 waves, got ' + r.waves.length);
});

test('constraints: maxGeneralsPerCamp=1 forbids squads', () => {
  const camps = [HARD(1)];
  const r = runPlan(camps, roster([G215(1), G215(2)]), ['1'],
    { chainCamps: false, maxGeneralsPerCamp: 1 });
  assert.ok(r.unsolved.length >= 1, 'hard camp is unsolvable without squads');
  assert.ok(r.stopReason, 'a stop reason must be reported');
});

test('constraints: unlimited squad size solves the same camp', () => {
  const camps = [HARD(1)];
  const r = runPlan(camps, roster([G215(1), G215(2)]), ['1'], { chainCamps: false });
  assert.strictEqual(r.unsolved.length, 0);
  assert.strictEqual(allAttacks(r)[0].generalsUsed, 2);
});

test('reproducibility: same input produces the same plan', () => {
  const camps = [EASY(1), HARD(2)];
  const generals = roster([G215(1), M285()]);
  const r1 = runPlan(camps, generals, ['1', '2'], { chainCamps: false });
  const r2 = runPlan(camps, generals, ['1', '2'], { chainCamps: false });
  assert.strictEqual(r1.waves.length, r2.waves.length);
  const key = (r) => allAttacks(r).map((a) => a.camp.number + ':' + a.general.uid).sort().join('|');
  assert.strictEqual(key(r1), key(r2));
});

// ---------------------------------------------------------------------------
// 3) Worker (browser path) regression: chains must be used there too
// ---------------------------------------------------------------------------
test('worker: one wave via chains — browser code path uses chain options', async () => {
  const { runPlanInWorker } = require('./worker-harness');
  const { loadAdventure } = require('../engine');
  const camps = loadAdventure('BountyHunterNew').camps;
  const generals = JSON.parse(fs.readFileSync(path.join(BASE, 'generals.sample.json'), 'utf8'));
  const r = await runPlanInWorker({
    adventure: 'BountyHunterNew',
    adventureCamps: camps,
    camps: ['1', '2', '3', '4', '5'],
    generalsExport: generals,
    enabledGenerals: ['s1', 's5', 's6'],
    units: ['Recruit', 'Swordsman', 'Marksman', 'ArmoredMarksman'],
    reps: 10, verify: 40,
    chainCamps: true,
    generalUsage: 'min',
  });
  assert.strictEqual(r.waves.length, 1, 'worker must pack all 5 camps into 1 wave');
  assert.strictEqual(r.totalCamps, 5);
  const chained = r.waves[0].attacks.filter((a) => a.chained);
  assert.ok(chained.length >= 2, 'worker cover must actually use chain options');
  assert.ok(r.waves[0].durationSec > 0, 'worker must report wave timing');
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
(async () => {
  let failed = 0;
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  for (const t of TESTS) {
    if (only.length && !only.some((o) => t.name.includes(o))) continue;
    const t0 = Date.now();
    try {
      await t.fn();
      console.log('ok   ' + t.name + '  (' + Math.round(Date.now() - t0) + ' ms)');
    } catch (e) {
      failed++;
      console.log('FAIL ' + t.name);
      console.log('     ' + (e && e.message ? e.message.split('\n').join('\n     ') : e));
    }
  }
  console.log('\n' + (failed ? failed + ' test(s) FAILED' : 'all tests passed'));
  process.exit(failed ? 1 : 0);
})();
