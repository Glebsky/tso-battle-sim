#!/usr/bin/env node
// CLI wrapper. Example:
//   node plan.js "BonabertiBusiness: 1,2,3,4" --generals generals.sample.json \
//     --use Swordsman,ArmoredMarksman,MountedMarksman --no-loss Besieger \
//     --stock Swordsman=400,MountedMarksman=600 --loss-accounting max \
//     --step 10 --max-generals all --beam 5 --chain-camps 1 --sacrifice cheap \
//     --general-usage max --max-chain-length 3
const fs = require('fs');
const path = require('path');
const { plan, DEFAULT_UNITS, DEFAULT_CHEAP_UNITS } = require('./planner');

function parseArgs(argv) {
  const out = { flags: {}, positional: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out.flags[a.slice(2)] = argv[++i];
    else out.positional.push(a);
  }
  return out;
}

const args = parseArgs(process.argv);
const on = (v) => v === '1' || v === 'true' || v === 'yes' || v === 'on';
const [advPart, campPart = ''] = args.positional.join(' ').split(':');
const genPath = args.flags.generals || path.join(__dirname, 'generals.sample.json');
const generalsExport = JSON.parse(fs.readFileSync(genPath, 'utf8'));

const stock = {};
for (const pair of (args.flags.stock || args.flags.limit || '').split(',').filter(Boolean)) {
  const [id, n] = pair.split('=');
  stock[id.trim()] = Number(n);
}

// --max-generals: number, or "all"/omitted for no limit (use every general you own)
const mg = args.flags['max-generals'];
const maxGeneralsPerCamp = (mg === undefined || mg === 'all' || mg === 'inf') ? undefined : Number(mg);

const result = plan({
  adventure: advPart.trim(),
  camps: campPart.split(/[,\s]+/).filter(Boolean),
  generalsExport,
  units: args.flags.use ? args.flags.use.split(',').map((s) => s.trim()) : DEFAULT_UNITS,
  noLoss: (args.flags['no-loss'] || '').split(',').map((s) => s.trim()).filter(Boolean),
  stock,
  unitValues: generalsExport.unitValues || {},
  stepPct: Number(args.flags.step || 10),
  // --sacrifice-cooldown 0 отключает учёт 2-часового отката слитых генералов
  sacrificeCooldown: args.flags['sacrifice-cooldown'] === undefined
    ? undefined
    : on(args.flags['sacrifice-cooldown']),
  // --unit-types: сколько типов юнитов может смешивать одна армия (по умолчанию 3)
  maxUnitTypes: args.flags['unit-types'] ? Number(args.flags['unit-types']) : undefined,
  reps: Number(args.flags.reps || 60),
  verify: Number(args.flags.verify || 400),
  lossAccounting: args.flags['loss-accounting'] === 'avg' ? 'avg' : 'max',
  maxGeneralsPerCamp,
  beam: Number(args.flags.beam || 5),
  chainCamps: on(args.flags['chain-camps']),
  // --max-chain-length: максимум лагерей на один генерал в цепочке (0 = без лимита)
  maxChainLength: args.flags['max-chain-length'] ? Number(args.flags['max-chain-length']) : 0,
  // --travel-sec-per-tile / --travel-base-sec: время перехода между лагерями
  // цепочки (по умолчанию 0 — учитывается только время боёв)
  timing: {
    travelSecPerTile: args.flags['travel-sec-per-tile'] ? Number(args.flags['travel-sec-per-tile']) : 0,
    travelBaseSec: args.flags['travel-base-sec'] ? Number(args.flags['travel-base-sec']) : 0,
  },
  // --general-usage max (или --use-all-generals 1): задействовать максимум генералов
  generalUsage: (args.flags['general-usage'] === 'max' || on(args.flags['use-all-generals']))
    ? 'max' : 'min',
  coverBudget: args.flags['cover-budget'] ? Number(args.flags['cover-budget']) : undefined,
  sacrificePolicy: args.flags.sacrifice || 'cheap',
  cheapUnits: args.flags.cheap ? args.flags.cheap.split(',').map((s) => s.trim()) : DEFAULT_CHEAP_UNITS,
});

const f = (n) => Math.round(n * 100) / 100;
const fmtStock = (o) => Object.entries(o).map(([k, v]) => k + ': ' + v).join(', ') || 'без ограничений';
const fmtArmy = (a) => a.map((u) => u.amount + ' ' + u.id).join(' + ');

if (args.flags.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const warn of (result.warnings || [])) console.log('! ' + warn);
  console.log('Приключение: ' + result.adventure);
  console.log('Порядок атак (как указан): ' + result.order.join(' → '));
  console.log('Гарнизон войск: ' + fmtStock(result.initialStock));
  console.log('Режим: потери ' + (result.lossAccounting === 'avg' ? 'по среднему' : 'по худшему случаю') +
    ' | макс. генералов на лагерь: ' + result.maxGeneralsPerCamp +
    ' | жертвенные армии: ' + result.sacrificePolicy +
    ' | цепочки лагерей: ' + (result.chainCamps ? 'вкл' : 'выкл') +
    ' | генералов задействовать: ' +
    (result.generalUsage === 'max' ? 'МАКСИМУМ' : 'минимум'));

  for (const w of result.waves) {
    console.log('\n=== Волна ' + w.index + ': ' + w.attacks.length + ' лагерей, ' +
      w.generalsUsed + '/' + w.generalsAvailable + ' генералов' +
      (w.durationSec ? ', ~' + Math.round(w.durationSec) + ' сек' : '') + ' ===');
    console.log('  Гарнизон до волны: ' + fmtStock(w.stockBefore));
    for (const a of w.attacks) {
      let tag = '';
      if (a.chained) tag = '  [ЦЕПОЧКА ' + a.chainIndex + '/' + a.chainTotal +
        ': лагеря ' + a.chainCamps.join('→') + ' одним генералом]';
      else if (a.generalsUsed > 1) tag = '  [ОТРЯД из ' + a.generalsUsed + ' генералов]';
      console.log('  Лагерь ' + a.camp.number + ' (' + a.camp.key + ', ' + a.camp.type +
        ', сектор ' + a.camp.sector + ')' + tag);
      console.log('    Противник: ' + a.camp.units.map((u) => u.amount + ' ' + u.id).join(', '));
      for (const s of a.squad) {
        console.log('    ' + s.order + ') ' + s.general.name + ' [' + s.general.base +
          ', вмест. ' + s.general.capacity + '] — ' + s.role +
          (s.startSec != null ? ' (старт +' + Math.round(s.startSec) + ' сек' +
            (s.durationSec ? ', бой ~' + Math.round(s.durationSec) + ' сек' : '') + ')' : ''));
        console.log('       Армия: ' + fmtArmy(s.army));
        console.log('       Убито в лагере: ' + s.defKills + ' | раундов ' + f(s.rounds) +
          ' | свои потери: ' + (s.perUnit.filter((u) => u.lost > 0)
            .map((u) => u.id + ' −' + f(u.lost)).join(', ') || 'нет'));
      }
      if (!a.chained || a.chainIndex === 1) {
        console.log('    ИТОГО' + (a.chained ? ' по цепочке' : ' по лагерю') + ': потери ' + f(a.lostAmount) +
          ' юнитов (стоимость ' + f(a.lostValue) + '), победа 100%' +
          (a.soloable === false ? ' — одиночным генералом невозможно' : ''));
        if (a.sacrificeExempt) {
          console.log('    ⚠ взят только ценой жертвенной армии из недешёвых юнитов');
        }
      }
    }
    console.log('  Задействовано войск: ' + fmtStock(w.waveUsage));
    console.log('  Списано потерь: ' + fmtStock(w.waveLosses));
    if ((w.deferred || []).length) {
      console.log('  Перенесено на следующую волну: лагеря ' +
        w.deferred.map((c) => c.number).join(', '));
    }
    if ((w.burned || []).length) {
      console.log('  Слито генералов: ' + w.burned.map((b) => b.name +
        (b.free ? ' (бесплатный слив, остаётся в строю)' : ' (откат 2 ч, дальше не участвует)')).join(', '));
    }
    console.log('  Гарнизон после волны: ' + fmtStock(w.stockAfter));
    if (w.blocker) {
      console.log('  Волна не выросла дальше: лагерь ' + w.blocker.number + ' — ' +
        w.blocker.reason + ' (там нужен отряд из ' + w.blocker.need + ' генералов)');
    }
  }

  if (result.unsolved.length) {
    console.log('\nНе взяты: ' + result.unsolved.map((c) => c.number).join(', '));
    if (result.stopReason) console.log('Причина: ' + result.stopReason);
    for (const c of result.unsolved) {
      if (c.minGenerals) console.log('  лагерь ' + c.number + ': минимум генералов в отряде = ' + c.minGenerals);
    }
  }
  console.log('\nВзято лагерей: ' + result.totalCamps + '/' + result.order.length +
    ' | волн: ' + result.waves.length +
    ' | задействовано генералов: ' + result.totalGenerals +
    ' | стоимость потерь: ' + f(result.totalLostValue) +
    ' | остаток гарнизона: ' + fmtStock(result.finalStock) +
    ' | время ' + f(result.seconds) + ' c');

  if (result.totalUnitsLost > 0) {
    console.log('Потери войск: ' + Object.entries(result.totalLosses).map(([u, n]) => u + ' −' + f(n)).join(', ') +
      ' (всего ' + f(result.totalUnitsLost) + ' юнитов)');
    if (result.totalResources && Object.keys(result.totalResources).length) {
      console.log('Ресурсы на восстановление потерь: ' + Object.entries(result.totalResources)
        .map(([r, n]) => f(n) + ' ' + r).join(', '));
    }
  }
}
