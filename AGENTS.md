# AGENTS.md: Developer & Agent Guide for TSO Adventure Tactical Planner

> **AI Agent Reference & Architecture Guide**  
> This document provides autonomous AI coding agents (and human maintainers) with the architectural context, domain models, algorithms, and development guidelines required to inspect, modify, or extend this repository.

---

## 1. Project Overview & Technology Stack

**TSO Adventure Tactical Planner** is an offline, multi-wave campaign optimizer and battle calculator for *The Settlers Online* (TSO). Unlike traditional calculators that optimize a single camp at a time, this system ingests an entire adventure (or selected subset of camps) and the player's full pool of generals, then solves a multi-wave scheduling and assignment problem.

### Technology Stack:
- **Runtime**: Node.js (CommonJS, `package.json` specifies `"type": "commonjs"`).
- **External Dependencies**: Zero runtime npm dependencies (built solely using Node.js standard libraries: `http`, `fs`, `path`, `vm`, `url`).
- **Combat Simulation Engine**: Compiled WebAssembly binary (`wasm_bg.wasm` + `wasm.js`), originating from the official TSO battle simulation engine (via tsowiki.eu). Loaded inside a Node `vm` sandbox in `planner/engine.js`.
- **Frontend**: Pure Vanilla HTML5, CSS3, and ES6+ JavaScript. No build step, no bundlers, no external frameworks.

---

## 2. Directory & File Structure

```
battle-sim/
├── README.md               # User documentation (EN)
├── README.ru.md            # User documentation (RU)
├── AGENTS.md               # This document: AI agent & developer guidelines
├── GUIDE.md                # Tactical concept overview
├── package.json            # CommonJS package manifest ("scripts": { "start": "node planner/server.js" })
├── wasm.js                 # JS glue/loader for WebAssembly engine
├── wasm_bg.wasm            # Compiled WebAssembly binary for TSO combat simulation
├── adventures/             # 105+ JSON adventure map definitions
└── planner/                # Core logic, server, and UI
    ├── server.js           # Lightweight HTTP server & API router
    ├── engine.js           # WASM bridge, single-battle simulator, adventure loader
    ├── multi.js            # Squad (multi-general) and chain battle simulation
    ├── matching.js         # Bipartite matching (Hungarian-style assignment)
    ├── planner.js          # Core optimizer: army candidates, wave allocation, life tracker
    ├── plan.js             # CLI entrypoint for headless calculation
    ├── generals.*.json     # Sample generals export files for testing
    └── ui/                 # Web interface assets
        ├── index.html      # Responsive zero-scroll UI layout and CSS
        ├── app.js          # Client-side SPA logic, event bindings, dashboard rendering
        ├── i18n.js         # Tri-lingual localization engine (EN, UK, RU)
        ├── unit-icons.js   # Unit icons and metadata dictionaries
        └── icons/          # SVG unit and general icons
```

---

## 3. Module Responsibilities

### `planner/server.js`
- Serves static assets from `planner/ui/` with appropriate MIME types.
- Dispatches HTTP JSON API requests:
  - `GET /api/meta`: Returns list of adventures, player units (`ALL_PLAYER_UNITS`, `DEFAULT_UNITS`), and directory paths.
  - `GET /api/adventure?id=<NAME>`: Returns camp details (`number`, `key`, `type`, `sector`, `units`) for the requested adventure.
  - `POST /api/generals`: Parses and validates tsowiki generals export JSON; computes capacities and skills.
  - `POST /api/plan`: Executes `planner.js:plan(body)`. **Crucial**: Automatically purges `require.cache` for `planner`, `multi`, and `engine` before execution, enabling hot-reloading during development without restarting the server.

### `planner/engine.js`
- Initializes the WebAssembly simulator inside a Node.js `vm.createContext` sandbox.
- Interacts with `wb.Battles` exported by `wasm.js`.
- Key exports:
  - `simulateBattle(campDef, general, army, config)`: Runs a single battle simulation, returning win probability, rounds, casualties, and surviving enemies.
  - `loadAdventure(id)` / `listAdventures()`: Reads and caches adventure definitions from `adventures/*.json`.
  - `calcGeneralCapacity(gen)`: Calculates troop capacity accounting for skills like `Skill_GarrisonAnnex`.
  - `hasSkill(gen, skillId)` / `getSkillPoints(gen, skillId)`: Queries general talents.

### `planner/multi.js`
- Provides `simulateSquad(campDef, squad, options)`: Simulates sequential attacks on a single camp (opener generals sacrificing or softening up the camp, followed by a finishing closer general). Correctly tracks remaining enemy units and HP between wave steps.

### `planner/matching.js`
- Provides optimal/greedy general-to-camp matching algorithms for assigning multiple generals across concurrent camps within a wave.

### `planner/planner.js`
- The core optimization engine.
- Implements candidate generation, loss evaluation, `noLoss` constraint checking, and multi-wave progression.
- Contains the general life cycle and cooldown state machine (`extraLivesPerUid`).

### `planner/ui/app.js`
- Client application running in the browser.
- Uses `S` storage wrapper around `localStorage` for persisting settings, queue, and generals.
- Manages real-time adventure search (`filterAdventures` / `matchesAdventure`).
- Renders the interactive camp grid, queue list, generals table with talent tooltips, and bento result cards.

### `planner/ui/i18n.js`
- Self-contained localization engine supporting `en`, `uk`, `ru`.
- Exposes `t(key, params)`, `setLanguage(lang)`, `onLanguageChange(cb)`, and `updatePageTranslations()`.
- Automatically translates elements with `data-i18n`, `data-i18n-title`, `data-i18n-placeholder`, and `data-i18n-html`.

---

## 4. Key Domain Models & Rules

### 1. General Extra Lives & 2-Hour Cooldown (1-UP Mechanics)
In The Settlers Online, defeated generals suffer a 2-hour recovery cooldown unless they possess a revival life (1-UP).
- **Inherent 1-UP**: `GhostGeneral`, `NarcissisticGeneral`, `Halloween2019General` (Younger Gemini).
- **Skill 1-UP**: `Skill_InstantRecovery` talent.
- **TSO Rule Cap**: A general can have **at most 1 extra life** per adventure (`extraLives = Math.min(1, base + skill)`).
- **Lifecycle Tracking (`extraLivesPerUid`)**:
  - 1st defeat with `extraLife > 0`: `extraLives` decremented to 0. Status set to `revived` (`✨ Бесплатный слив 1-UP`). The general **remains available** for the next wave.
  - Defeat with `extraLife === 0`: Status set to `cooldown` (`⏳ Откат 2 часа`). The general is **strictly excluded** from all subsequent waves.

### 2. Troop Protection («Без потерь» / `noLoss`)
Players protect costly elite troops (e.g. `MountedMarksman`, `Besieger`):
- **Opener Isolation**: Any general acting as an opener / sacrificial wave (`squad[0 .. n-2]`) is **prohibited** from carrying any unit in the `noLoss` list (`isOpenerSafe` assertion).
- **Closer Safety**: Units from `noLoss` may only be assigned to the final closer general (`squad[n-1]`), and only when the simulation guarantees 100% victory with exactly 0 casualties for those units.

### 3. Boss Mechanics & Flanking
Boss camps in high-level adventures (e.g. *Bonaberti Business* camps 9, 12, 15, 18) have bosses with up to 60,000 HP guarded by high-armor retainers (`GoldenGuard`, `FirmDefender`):
- Non-flanking units (`MountedMarksman`, `Besieger`) will target minions and get wiped out by the boss.
- To clear boss camps efficiently, the army composition must deploy units with the `flanking` attribute: **`ArmoredMarksman`** (Бронированные стрелки) or **`Cavalry`** (Кавалерия).

### 4. General Optimization Modes
- **`max` (Maximum parallelization / minimum waves)**: Priority 1 is clearing the maximum possible number of camps concurrently in the current wave. Conserves single-general solutions for easy camps to free up squad pairs for difficult camps downstream.
- **`min` (Preserve generals and troops)**: Priority 1 is minimizing general casualties and lost troop values (`lostValue`).

---

## 5. Development & Contribution Conventions

### Adding or Modifying UI Elements
1. **No External Build Tools**: Do not introduce npm build steps, Webpack, Vite, or TypeScript unless explicitly requested by the user. Keep files pure CSS and Vanilla JS.
2. **Localization Discipline**:
   - Whenever adding a new text string or placeholder to `planner/ui/index.html` or `planner/ui/app.js`, **always** add the corresponding translation key to all three languages in `planner/ui/i18n.js` (`en`, `uk`, `ru`).
   - Use `data-i18n="key"` for element text, `data-i18n-placeholder="key"` for inputs, `data-i18n-title="key"` for tooltips.
3. **State Management**:
   - Persist user choices with `S.set(key, value)` and retrieve with `S.get(key, defaultValue)`.
4. **Clean UI & User-Facing Texts**:
   - Avoid internal technical jargon in end-user interfaces (e.g. do not show raw WASM identifiers or engine engine badges).

---

## 6. Verification & Testing Workflows

### 1. Syntax Verification
Check syntax of all modified JavaScript files:
```bash
node --check planner/server.js
node --check planner/planner.js
node --check planner/ui/app.js
node --check planner/ui/i18n.js
```

### 2. CLI Smoke Test
Verify that the combat simulator and planner execute properly from the terminal:
```bash
node planner/plan.js "BonabertiBusiness: 1, 2" \
  --generals planner/generals.sample.json \
  --use Swordsman,Knight,MountedMarksman \
  --no-loss MountedMarksman \
  --reps 10 --verify 50
```

### 3. Server Health & API Check
Start the server and test API endpoints:
```bash
# Start server on background or test port
PORT=8788 node planner/server.js &

# Verify endpoints
curl -s http://localhost:8788/api/meta | grep -o '"adventures":\[[^]]*\]' | head -c 100
curl -s "http://localhost:8788/api/adventure?id=BonabertiBusiness" | grep -o '"camps":\[[^]]*\]' | head -c 100
```
