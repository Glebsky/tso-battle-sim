#!/usr/bin/env node
// Local web UI for the TSO adventure planner.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { listAdventures, loadAdventure, ADVENTURE_DIR } = require('./engine');
const { plan, buildGenerals, ALL_PLAYER_UNITS, DEFAULT_UNITS } = require('./planner');

const PORT = Number(process.env.PORT || 8787);
const UI_DIR = path.join(__dirname, 'ui');
const MAPS_DIR = path.join(__dirname, '..', 'maps');
if (!fs.existsSync(MAPS_DIR)) {
  try { fs.mkdirSync(MAPS_DIR, { recursive: true }); } catch (e) {}
}

const MAP_FOLDERS = ['maps2400', 'maps1600', 'maps1200', 'maps', 'maps800', 'maps3200'];

function fetchRemoteMap(key) {
  return new Promise((resolve) => {
    let index = 0;
    function tryNext() {
      if (index >= MAP_FOLDERS.length) return resolve(null);
      const folder = MAP_FOLDERS[index++];
      const remoteUrl = `https://tsowiki.eu/images/${folder}/${key}.webp`;
      const req = https.get(remoteUrl, {
        headers: {
          'Referer': 'https://tsowiki.eu/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      }, (res) => {
        if (res.statusCode === 200) {
          resolve({ res, folder });
        } else {
          res.resume();
          tryNext();
        }
      });
      req.on('error', () => tryNext());
    }
    tryNext();
  });
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.wasm': 'application/wasm',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    // API endpoints
    if (req.method === 'GET' && url.pathname === '/api/meta') {
      return send(res, 200, {
        adventures: listAdventures(),
        adventureDir: ADVENTURE_DIR,
        allUnits: ALL_PLAYER_UNITS,
        defaultUnits: DEFAULT_UNITS,
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/adventure') {
      const { data, camps } = loadAdventure(url.searchParams.get('id'));
      return send(res, 200, {
        map: data.map || null,
        camps: camps.map((c) => ({
          number: c.number, key: c.key, type: c.type, sector: c.sector,
          building: c.building, coordinates: c.coordinates,
          position: data.camps[c.key]?.position || null,
          units: c.units.map((u) => ({ id: u.id, amount: u.amount })),
        })),
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/map-image') {
      const key = (url.searchParams.get('key') || '').trim();
      if (!key || !/^[a-zA-Z0-9_-]+$/.test(key)) {
        return send(res, 400, { error: 'Invalid map key' });
      }
      const localFile = path.join(MAPS_DIR, `${key}.webp`);
      if (fs.existsSync(localFile) && fs.statSync(localFile).size > 0) {
        res.writeHead(200, {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        return fs.createReadStream(localFile).pipe(res);
      }
      const remote = await fetchRemoteMap(key);
      if (!remote) {
        return send(res, 404, { error: 'Map image not found' });
      }
      res.writeHead(200, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      const fileStream = fs.createWriteStream(localFile);
      fileStream.on('error', () => {
        try { fs.unlinkSync(localFile); } catch (e) {}
      });
      remote.res.pipe(fileStream);
      remote.res.pipe(res);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/generals') {
      const body = await readBody(req);
      const generals = buildGenerals(body.generalsExport).map((g) => ({
        uid: g.uid, name: g.name, base: g.base, capacity: g.capacity, skills: g.skillList,
        type: g.type, grid: g.grid, rawName: g.rawName,
      }));
      return send(res, 200, { generals, unitValues: body.generalsExport.unitValues || {} });
    }
    if (req.method === 'POST' && url.pathname === '/api/plan') {
      const body = await readBody(req);
      delete require.cache[require.resolve('./planner')];
      delete require.cache[require.resolve('./multi')];
      delete require.cache[require.resolve('./engine')];
      const freshPlanner = require('./planner');
      return send(res, 200, freshPlanner.plan(body));
    }
    if (req.method === 'GET') {
      let reqPath = decodeURIComponent(url.pathname);
      if (reqPath === '/' || !reqPath) reqPath = '/index.html';
      const cleanPath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
      const candidates = [
        path.join(UI_DIR, cleanPath),
        path.join(path.resolve(__dirname, '..'), cleanPath),
      ];
      for (const localFile of candidates) {
        if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
          const ext = path.extname(localFile).toLowerCase();
          const mime = MIME_TYPES[ext] || 'application/octet-stream';
          return send(res, 200, fs.readFileSync(localFile), mime);
        }
      }
    }

    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: (e && e.message) || String(e) });
  }
});

server.listen(PORT, () => {
  console.log('TSO planner UI: http://localhost:' + PORT);
});
