// Runs planner.worker.js inside a Node vm sandbox with the real WASM engine,
// so the browser worker code path can be tested without a browser.
//
// The worker expects browser globals (self, importScripts, fetch); the
// harness provides them. fetch() ignores its URL and hands back the compiled
// WebAssembly.Module straight from disk, which is the exact path wasm.js
// takes when the browser feeds it a cached Response.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKER_SRC = path.join(ROOT, 'planner', 'ui', 'planner.worker.js');
const WASM_JS = path.join(ROOT, 'wasm.js');
const WASM_BIN = fs.readFileSync(path.join(ROOT, 'wasm_bg.wasm'));

function createWorkerSandbox() {
  const ctx = {
    console,
    TextEncoder,
    TextDecoder,
    WebAssembly,
    Symbol,
    FinalizationRegistry,
    URL,
    Error,
    Number,
    Object,
    Array,
    Uint8Array,
    ArrayBuffer,
    crypto: require('crypto').webcrypto,
    BigInt,
    String,
    Boolean,
    Math,
    JSON,
    Map,
    Set,
    Date,
    fetch: () => Promise.resolve(new WebAssembly.Module(WASM_BIN)),
    postMessage: () => {},
    importScripts: () => {},
  };
  ctx.self = ctx;
  ctx.location = { origin: 'file://test' };
  vm.createContext(ctx);
  // importScripts loads the real wasm.js glue into the same context, exactly
  // like the browser worker does.
  ctx.importScripts = (url) => {
    const src = fs.readFileSync(WASM_JS, 'utf8');
    vm.runInContext(src + '\n;globalThis.__wbLoaded = true;', ctx);
  };
  vm.runInContext(fs.readFileSync(WORKER_SRC, 'utf8'), ctx, { filename: 'planner.worker.js' });
  return ctx;
}

// Sends a START_PLAN message to the sandboxed worker and resolves with the
// RESULT payload (or rejects with the ERROR text). Progress messages are
// collected into the optional out array.
function runPlanInWorker(payload, progressOut) {
  const ctx = createWorkerSandbox();
  const messages = [];
  ctx.postMessage = (msg) => messages.push(msg);
  return new Promise((resolve, reject) => {
    ctx.self.onmessage({ data: { type: 'START_PLAN', payload } }).then(() => {
      const result = messages.find((m) => m && m.type === 'RESULT');
      const error = messages.find((m) => m && m.type === 'ERROR');
      if (error) return reject(new Error(error.error || 'worker failed'));
      if (!result) return reject(new Error('worker produced no RESULT message'));
      if (progressOut) {
        for (const m of messages) if (m && m.type === 'PROGRESS') progressOut.push(m.data);
      }
      resolve(result.data);
    }, reject);
  });
}

module.exports = { createWorkerSandbox, runPlanInWorker };
