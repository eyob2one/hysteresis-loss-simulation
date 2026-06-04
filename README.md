# MagSim Pro — Hysteresis Loss Simulator

An interactive web simulation of magnetic hysteresis loss in ferromagnetic cores. Pick a material, move the sliders, and watch the B-H loop come alive.

![Hysteresis Loop](https://img.shields.io/badge/Physics-Electromagnetics-blue) ![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green) ![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS-yellow)

---

## What it does

- Draws a **real 4-quadrant AC hysteresis loop** for different core materials (Silicon Steel, Soft Ferrite, Alnico V)
- Shows how the loop **grows or shrinks** as you change the magnetizing force (Hmax) — small fields give minor loops, large fields give a fully saturated major loop
- Calculates **hysteresis loss** (the area inside the loop), eddy current loss, and excess loss — all live as you tweak sliders
- Lets you tune the material's intrinsic properties: saturation induction **Bsat**, coercive force **Hc**, and remanence **Br**
- Animates the **operating point** tracing the loop in real time using the "Play AC Cycle" button
- Includes a Steinmetz regression tab where you can fit **k, α, β** coefficients from measured loss data
- Works fully **offline** (browser fallback engine) if you don't want to run the Python backend

---

## How to run it locally

### Prerequisites

Before starting, ensure you have installed:

- **Node.js** (v16+): [Download here](https://nodejs.org/)
- **Python** (v3.10+): [Download here](https://www.python.org/)

Verify installation:

```bash
node --version
python --version
```

### Quick start (⚡ 3 steps, ~2 minutes)

**1. Clone and enter the repo**

```bash
git clone https://github.com/eyob2one/hysteresis-loss-simulation.git
cd hysteresis-loss-simulation
```

**2. Set up the Python backend**

```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Go back to root
cd ..
```

**3. Start both frontend + backend**

```bash
npm run dev
```

This will automatically start:

- **Backend API** at `http://127.0.0.1:8000` (Python/FastAPI)
- **Frontend UI** at `http://localhost:3000` (Vanilla JS + Chart.js)

Open your browser to **`http://localhost:3000`** — you're ready to simulate!

### 📝 What if I only want to run the frontend?

The frontend works **fully offline** with a built-in JavaScript physics engine. Just open `frontend/index.html` directly in your browser or serve it:

```bash
npx serve frontend -p 3000
```

The backend is only needed for advanced features like Steinmetz ML regression. You'll see "Sync: Offline Fallback" in the top bar if the API isn't available.

### Troubleshooting

| Issue                       | Solution                                                      |
| --------------------------- | ------------------------------------------------------------- |
| `command not found: npm`    | Install Node.js from https://nodejs.org/                      |
| `command not found: python` | Install Python 3.10+ from https://www.python.org/             |
| Port 3000 already in use    | Kill the process or use `npx serve frontend -p 3001`          |
| Backend connection refused  | Check if `npm run dev` started both servers (wait 5 seconds)  |
| Module not found errors     | Run `pip install -r requirements.txt` inside `backend/` again |

---

## 👨‍💻 Getting started for developers

### Clone and set up your local environment

```bash
# Clone the repository
git clone https://github.com/eyob2one/hysteresis-loss-simulation.git
cd hysteresis-loss-simulation

# Install Python dependencies (from inside backend/)
cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && cd ..

# Run both servers
npm run dev
```

### Available npm scripts

```bash
npm run dev              # Start both frontend (port 3000) + backend (port 8000) concurrently
npm run start:frontend  # Start frontend only (no backend needed)
npm run start:backend   # Start backend API only (for testing ML features)
```

### Testing your changes

1. **Frontend changes**: Open `http://localhost:3000` — changes reload automatically
2. **Backend changes**: Restart the backend server (Ctrl+C, then `npm run dev`)
3. **Physics formulas**: Test with different materials using the dropdown menu
4. **ML regression**: Upload a CSV file in the "Steinmetz Regression" tab

---

## 🎮 How to use the simulator

## How to simulate

1. **Pick a material** from the dropdown at the top-left (Silicon Steel, Soft Ferrite, Hard Magnetic)
2. The **AC Loop** tab opens by default — you see the B-H loop across all 4 quadrants
3. **Drag the Hmax slider** up and down to watch the loop expand from a tiny ellipse (minor loop) to a full saturated loop with flat tails
4. **Adjust Bsat, Hc, Br sliders** to create a custom material and see how the loop shape changes
5. Hit **"Play AC Cycle"** to animate the operating point circling the loop in real time
6. Switch to **DC Saturation** tab to see the initial magnetisation curve and the knee point
7. Use the **Steinmetz Regression** tab to fit power loss coefficients from your own measurement data

---

## 📁 Project structure

```
hysteresis-loss-simulation/
├── frontend/                   # Standalone web application
│   ├── index.html              # Main UI (no build step needed!)
│   ├── js/
│   │   ├── app.js              # App state & orchestration
│   │   ├── api.js              # Backend API communication
│   │   ├── charts.js           # Chart.js rendering
│   │   └── mag-hyst.js         # Physics engine (offline fallback)
│   └── css/
│   |   ├── mag-hyst.css       # Main styles + dark/light theme
│   |   └── styles.css         # Additional component styles
│   |___views/
│   │   ├── data.html       #html navs
│   │   ├── ml.html                              
│   │   ├── script.html
│   │   └── theory.html
|   │   └── simulator.html
|   
├── backend/                    # Python API (optional for advanced features)
│   ├── app/
│   │   ├── main.py           # FastAPI application entry point
│   │   ├── api/
│   │   │   └── routes.py      # REST API endpoints (/simulate, /fit-steinmetz)
│   │   ├── models/
│   │   │   └── hysteresis_model.py  # Scikit-learn ML model
│   │   └── utils/
│   │       ├── formulas.py    # Core physics: Bertotti loss, tanh loops
│   │       └── data_parser.py # CSV parsing for Steinmetz fitting
│   ├── data/                  # Material datasheets (CSV)
│   │   ├── bh_materials.csv
│   │   └── core_loss_training.csv
│   └── requirements.txt        # Python dependencies
│
├── docs/                       # Developer & architecture guides
│   ├── DEVELOPER_GUIDE.md
│   └── CPM_ROADMAP.md
│
├── package.json               # npm scripts: run both servers together
├── .gitignore                 # Git exclusions (venv, node_modules, etc.)
└── README.md                  # This file
```

### Key entry points for developers

| File                            | Purpose                  | Edit when                            |
| ------------------------------- | ------------------------ | ------------------------------------ |
| `frontend/index.html`           | UI structure & layout    | Adding new tabs or controls          |
| `frontend/js/mag-hyst.js`       | Physics simulation       | Changing loop model or loss formulas |
| `frontend/css/mag-hyst.css`     | Styling & responsiveness | Fixing UI layout or adding features  |
| `backend/app/utils/formulas.py` | Physics calculations     | Implementing new material models     |
| `backend/app/api/routes.py`     | REST API                 | Adding new endpoints for analysis    |

---

## The physics, briefly

The hysteresis loop is drawn using a **hyperbolic tangent (tanh) model**:

- **Upper branch** (H decreasing): `B = Bpk × tanh((H + Hc_eff) / s)`
- **Lower branch** (H increasing): `B = Bpk × tanh((H − Hc_eff) / s)`

Where `s = Hc / arctanh(Br / Bsat)` — this guarantees the curves pass exactly through the remanence and coercivity points.

At low Hmax the peak induction `Bpk` is scaled down proportionally, giving a physically realistic minor loop. At high Hmax it saturates and sprouts the characteristic flat ears.

Losses are computed using the **Bertotti model**:

```
P_total = P_hysteresis + P_eddy + P_excess
        = kh·f·Bpk^2 + ke·f²·Bpk^2 + kex·f^1.5·Bpk^1.5
```

---

## Why is there an ML model?

The backend includes a **scikit-learn** regression model for fitting the Steinmetz equation coefficients (k, α, β) from measured data points:

```
P = k × f^α × Bpk^β
```

You can't analytically solve for k, α, β from raw measurements — there's no clean closed-form solution when you have lots of noisy data points at different frequencies and flux densities. The ML model does a **log-linear regression** (fitting `log P = log k + α·log f + β·log B`) to find the best-fitting power law from your data.

### What it adds beyond basic simulation

| What the ML model does                        | Why it matters                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| Fits k, α, β from your lab measurements       | Lets you use real datasheet data instead of guessing                     |
| Validates against known material datasheets   | Ensures the Steinmetz model is accurate for your specific core           |
| Can predict loss at untested operating points | Interpolate/extrapolate to frequencies or flux levels you didn't measure |
| Ridge regularisation prevents overfitting     | Stays stable even with sparse or slightly noisy datasets                 |

In general, ML regression here replaces the tedious manual curve-fitting that engineers used to do graphically on log-log paper. It gives you a compact mathematical model (just 3 numbers) that accurately describes how your core loses energy across a wide range of operating conditions.

---

## Tech stack

| Layer    | Tech                                               |
| -------- | -------------------------------------------------- |
| Frontend | HTML + Vanilla JS, Chart.js, Tailwind CSS (CDN)    |
| Backend  | Python, FastAPI, uvicorn                           |
| ML       | scikit-learn (LinearRegression with log transform) |
| Runner   | Node.js + concurrently                             |
## Tools used
| TOOLS    |
|----------|
|Github for version control and CI/CD |
|Gemini 3 Pro for coding assistant| 
|Google ai studio for coding assistant|
|Railway for deployment|

## How to contribute
Github: https://github.com/eyob2one/hysteresis-loss-simulation.git
## Purpose of This project
- For Machine project
- For learning purposes to bridge the gap between ML and Electrical Machines Course
## Group Members
-Abel Tamirat
-Abraham Tesfaye
-Eyob Mengistu
-Henok Gizaw
