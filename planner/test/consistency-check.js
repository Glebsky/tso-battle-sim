// Consistency gate: every i18n key referenced by app.js/index.html exists in
// i18n.js (all 3 locales), and the result fields the UI renders are produced
// by BOTH planners (server planner.js and browser planner.worker.js).
'use strict';
const fs = require('fs');
const path = require('path');
const UI = path.join(__dirname, '..', 'ui');
const PLAN = path.join(__dirname, '..');

const i18n = fs.readFileSync(path.join(UI, 'i18n.js'), 'utf8');
const app = fs.readFileSync(path.join(UI, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(UI, 'index.html'), 'utf8');

const keys = new Set();
for (const m of app.matchAll(/\bt\('([a-z0-9._-]+)'/gi)) keys.add(m[1]);
// data-i18n="key" and data-i18n-placeholder/title="key"; data-i18n-html is a
// boolean flag attribute ("true"), not a key.
for (const m of html.matchAll(/data-i18n(?:-placeholder|-title)?="([a-z0-9._-]+)"/gi)) keys.add(m[1]);
for (const m of html.matchAll(/data-i18n-html="(?!true)([a-z0-9._-]+)"/gi)) keys.add(m[1]);

// Every key must appear 3 times (en, uk, ru).
const broken = [];
for (const k of keys) {
  const re = new RegExp("^\\s*'" + k.replace(/[.*]/g, (c) => '\\' + c) + "'", 'gm');
  const count = (i18n.match(re) || []).length;
  if (count !== 3) broken.push(k + ' x' + count);
}
console.log('i18n keys referenced:', keys.size);
console.log('keys not in all 3 locales:', broken.length ? broken.join(', ') : 'none');

const worker = fs.readFileSync(path.join(UI, 'planner.worker.js'), 'utf8');
const planner = fs.readFileSync(path.join(PLAN, 'planner.js'), 'utf8');
let bad = broken.length;
for (const f of ['durationSec', 'chainTotal', 'deferred', 'blocker', 'startSec', 'endSec']) {
  const ok = planner.includes(f) && worker.includes(f);
  console.log('result field ' + f + ': ' + (ok ? 'OK in both planners' : 'MISMATCH'));
  if (!ok) bad++;
}
if (broken.length) console.log('\nBroken i18n keys:\n  ' + broken.join('\n  '));
process.exit(bad ? 1 : 0);
