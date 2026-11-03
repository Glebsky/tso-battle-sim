// Quick API smoke: meta + adventure + plan with chains and timing.
const http = require('http');
const fs = require('fs');
const path = require('path');

const get = (u) => new Promise((res, rej) =>
  http.get(u, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => res(b)); }).on('error', rej));

const post = (u, body) => new Promise((res, rej) => {
  const d = JSON.stringify(body);
  const req = http.request(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) },
  }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => res({ status: r.statusCode, body: b })); });
  req.on('error', rej); req.write(d); req.end();
});

(async () => {
  const meta = await get('http://localhost:8788/api/meta');
  console.log('meta ok:', meta.includes('"adventures"'));
  const adv = await get('http://localhost:8788/api/adventure?id=BountyHunterNew');
  console.log('adventure ok:', adv.includes('"camps"'));
  const camps = JSON.parse(adv).camps;
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'generals.sample.json'), 'utf8'));
  const res = await post('http://localhost:8788/api/plan', {
    adventure: 'BountyHunterNew', adventureCamps: camps, camps: ['1', '2', '3', '4', '5'],
    generalsExport: g, enabledGenerals: ['s1', 's5', 's6'],
    units: ['Recruit', 'Swordsman', 'Marksman', 'ArmoredMarksman'],
    reps: 10, verify: 40, chainCamps: true, generalUsage: 'min',
  });
  const j = JSON.parse(res.body);
  console.log('api plan status', res.status, '| waves', j.waves && j.waves.length,
    '| camps', j.totalCamps, '| durationSec', j.waves && j.waves[0].durationSec,
    '| chained', j.waves && j.waves[0].attacks.filter((a) => a.chained).length);
})();
