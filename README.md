# TSO Adventure Tactical Planner

[English](README.md) | [Русский](README.ru.md)

> **End-to-end campaign optimizer and tactical attack planner for *The Settlers Online (TSO)***

---

## About the Project: Core Concept

In most existing TSO battle calculators, players must manually experiment and find setups for every single enemy camp individually.

**TSO Adventure Tactical Planner solves the problem for the entire campaign at once:**
1. You load the **full pool of your generals** (complete with all their talents, skills, and troop capacities).
2. You pick an adventure and select **all desired camps** (a single sector or the whole map at once).
3. You click **«Calculate wave plan»**.

The system automatically assigns generals across camps, arranges attacks into **concurrent waves**, accounts for 2-hour defeat recovery cooldowns, efficiently spends free revivals (**1-UP**), and strictly guarantees the survival of expensive elite units (**«No Loss»**).

---

## Key Features

- ⚡ **Concurrent Attack Waves**: Destroy the maximum number of camps in a single round, minimizing overall adventure completion time.
- 🗺️ **Interactive Adventure Map**: Visual camp selection directly on high-resolution map overlays with camp unit tooltips, touch pan & pinch zoom, and attack order sequencing.
- 🔍 **Real-Time Adventure Search**: Instant filtering across 105+ adventure maps by name or keywords in English, Ukrainian, and Russian.
- 🛡️ **Troop Protection («No Loss» / `noLoss`)**: High-value units (e.g., *Mounted Marksman*, *Besieger*) are strictly excluded from sacrificial opener waves and deployed only for guaranteed 100% victories with 0 losses.
- ✨ **General Life Tracking & 1-UP Mechanics**:
  - Inherent revivals (Ghost General, Narcissistic General, Younger Gemini) and the *«Instant Recovery»* talent (`Skill_InstantRecovery`).
  - Strict compliance with TSO rules: at most 1 free death per adventure (`Math.min(1, base + skill)`).
  - Accurate 2-hour defeat cooldown tracking with automatic exclusion of fallen generals from subsequent waves.
- 🎯 **Two Optimization Modes**:
  - **«Maximum» (`max`)**: Clear the adventure in the fewest waves possible by conquering the maximum number of camps concurrently.
  - **«Conserve» (`min`)**: Minimize general casualties and aggregate troop loss value.
- 🗡️ **Intelligent Boss Handling**: Automatic deployment of flanking units (*Armored Marksman*, *Cavalry*) to neutralize high-HP bosses guarded by heavy-armor retainers.
- 🌐 **Modern Web Interface**:
  - Zero-scroll tactical layout organized into dedicated tabs (*Camps*, *Generals*, *Troops*, *Accuracy*).
  - Interactive camp grid with color-coded camp difficulty markers (small, medium, large, boss).
  - Trilingual localization: **English**, **Українська**, **Русский**.
  - One-click export of tactical battle plans to clipboard.
- 💻 **CLI Mode**: Run headless calculations directly from your terminal for scripting, benchmarking, or automated runs.

---

## System Requirements

- **Node.js**: Version `16.x`, `18.x`, or higher (tested on Node.js v18/v20/v22/v24).
- Any modern operating system: **Windows**, **Linux**, **macOS**.
- Zero external runtime npm dependencies — runs entirely using standard Node.js libraries (`http`, `https`, `fs`, `path`, `vm`, `url`).

---

## Installation

1. Clone the repository or download the project archive:
   ```bash
   git clone <REPOSITORY_URL>
   cd battle-sim
   ```

2. The project requires no third-party `node_modules` packages for the server or planner. Simply verify that Node.js is installed:
   ```bash
   node -v
   ```

---

## Getting Started

### 1. Web Interface (Recommended)

Start the local server using npm:
```bash
npm start
```
or directly via Node.js:
```bash
node planner/server.js
```

Once started, open your browser and navigate to:  
👉 **[http://localhost:8787](http://localhost:8787)**

> [!TIP]
> By default, the server listens on port `8787`. You can customize the port via an environment variable:
> ```bash
> PORT=9000 npm start
> ```
> The server features **Hot Reload** for planner algorithms — modifications to `planner.js` or `multi.js` take effect immediately on the next calculation without restarting the server.

### 2. Command Line Interface (CLI)

For headless command-line calculations, use `planner/plan.js`:
```bash
node planner/plan.js "BonabertiBusiness: 1, 2, 3, 4, 5, 6" \
  --generals planner/generals.sample.json \
  --use Swordsman,MountedSwordsman,Knight,Marksman,ArmoredMarksman,MountedMarksman,Besieger \
  --no-loss MountedMarksman,Besieger \
  --general-usage max \
  --step 20 --reps 30 --verify 150
```

---

## Step-by-Step User Guide

### Step 1. Load Your Generals
1. Open the simulator at **[tsowiki.eu/simulator](https://tsowiki.eu/simulator/)**.
2. Go to the **«Generals»** tab where your generals and their skill trees are configured.
3. Click the **«Export»** button and save the `.json` file (e.g. `tsowiki-generals.json`).
4. In the TSO Planner web interface, navigate to the **«Generals»** tab and drag-and-drop the file into the upload zone (the data is saved locally in your browser's `localStorage`).
5. Optionally uncheck any generals you do not want to deploy in the adventure.

### Step 2. Select Adventure & Target Camps
1. On the **«Camps»** tab, search for your adventure in the filter input (e.g. `tailor`, `nord`, `1001`, or `bonaberti`).
2. Select the adventure from the dropdown list.
3. Click on the camps you want to clear in the camp grid, or click **«Map»** to pick camps directly on the visual map, or use the quick buttons:
   - **«All in order»** — adds all adventure camps to the attack queue in sequence;
   - Manual camp entry (enter camp numbers separated by commas).

### Step 3. Configure Troops & Protection
1. Switch to the **«Troops»** tab.
2. Select an army preset (**Elite** or **All**).
3. In the **«No Loss»** column, check the units you wish to protect (*Mounted Marksman*, *Besieger*, etc.). The planner strictly guarantees zero casualties for these units.

### Step 4. Calculation Settings & Execution
1. On the **«Accuracy»** tab or in the bottom bar, choose your optimization strategy:
   - **Maximum**: prioritize clearing camps in the fewest waves possible;
   - **Conserve**: prioritize saving troops and generals.
2. Click **«Calculate wave plan»**.

### Step 5. Review & Export Tactical Plan
1. The results panel will render a complete wave schedule:
   - **Wave 1, 2, ...**: which camps are tackled concurrently;
   - The general assigned to each camp along with their exact army composition;
   - Battle steps (e.g. opener general sacrificing or softening up the camp, followed by a finishing closer general);
   - General status tracking: survived, used free 1-UP revival (`✨ Free 1-UP revival`), or sent on 2-hour recovery cooldown (`⏳ 2h Cooldown`).
2. Click **«Copy plan»** to copy the formatted text for in-game chat or notes.

---

## Project Structure

```
battle-sim/
├── README.md               # Project documentation (English)
├── README.ru.md            # Project documentation (Russian)
├── AGENTS.md               # Architectural reference & guidelines for AI agents
├── GUIDE.md                # Tactical concept overview
├── package.json            # Project manifest ("type": "commonjs")
├── wasm.js                 # JS glue code for WebAssembly combat engine
├── wasm_bg.wasm            # Compiled WebAssembly binary for TSO battle simulation (tsowiki)
├── adventures/             # Adventure map definitions (105+ JSON files)
│   ├── BonabertiBusiness.json
│   ├── TheBlackKnights.json
│   └── ...
├── maps/                   # Downloaded WebP map overlays
└── planner/                # Planner core and server
    ├── server.js           # Lightweight HTTP API server & static file router
    ├── engine.js           # WASM bridge, adventure loader, battle simulator
    ├── planner.js          # Core optimizer: army candidates, wave allocation, life tracker
    ├── multi.js            # Squad (multi-general) and chain battle simulation
    ├── matching.js         # Bipartite matching for general-to-camp assignment
    ├── plan.js             # CLI entrypoint for headless calculation
    └── ui/                 # Web interface assets (zero-scroll SPA)
        ├── index.html      # Responsive HTML5 & CSS3 layout
        ├── app.js          # Client-side logic, interactive map, state management
        ├── i18n.js         # Trilingual localization engine (EN, UK, RU)
        └── unit-icons.js   # Unit metadata & SVG icon definitions
```

---

## Server API

The built-in HTTP server exposes the following JSON endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/meta` | Adventure list, unit definitions, and default presets |
| `GET` | `/api/adventure?id=<NAME>` | Camp details and enemy compositions for the specified adventure |
| `POST` | `/api/generals` | Parses and validates tsowiki generals export JSON |
| `POST` | `/api/plan` | Executes wave optimization based on supplied parameters |
| `GET` | `/api/map-image?key=<NAME>` | Serves cached WebP map image or fetches it on-demand from tsowiki |

---

## License

This project is created for the players and community of **The Settlers Online**. Combat models and simulation are based on open community data (tsowiki.eu).
