// Serves-asset check: the running server must expose the new UI field and the
// patched worker code.
const http = require('http');
const get = (u) => new Promise((res, rej) =>
  http.get(u, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => res({ s: r.statusCode, b })); }).on('error', rej));

(async () => {
  let bad = 0;
  for (const [p, expect] of [
    ['/', 'id="chainLen"'],
    ['/planner.worker.js', 'buildPositionOptions'],
    ['/planner.worker.js', 'pickDeferredCamp'],
    ['/planner.worker.js', 'hopTravelSec'],
    ['/wasm.js', 'Battles'],
    ['/i18n.js', 'settings.chainLen.label'],
    ['/app.js', 'maxChainLength'],
  ]) {
    const r = await get('http://localhost:8787' + p);
    const ok = r.s === 200 && r.b.includes(expect);
    console.log((ok ? 'OK  ' : 'FAIL') + ' ' + p + '  (status ' + r.s + ')');
    if (!ok) bad++;
  }
  process.exit(bad ? 1 : 0);
})();
