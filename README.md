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

### Quick start (both frontend + backend at once)

You need **Node.js** and **Python 3.10+** installed.

**1. Clone the repo**
```bash
git clone https://github.com/eyob2one/hysteresis-loss-simulation.git
cd hysteresis-loss-simulation
```

**2. Set up the Python backend virtual environment**
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

**3. Run everything with one command**
```bash
npm run dev
```

This starts:
- Backend API at `http://127.0.0.1:8000`
- Frontend simulator at `http://localhost:3000`

Open `http://localhost:3000` in your browser.

> If you see "Sync: Offline Fallback" in the top bar, the frontend still works — it uses its built-in JS physics engine. You only need the backend for Steinmetz ML regression.

---

## How to simulate

1. **Pick a material** from the dropdown at the top-left (Silicon Steel, Soft Ferrite, Hard Magnetic)
2. The **AC Loop** tab opens by default — you see the B-H loop across all 4 quadrants
3. **Drag the Hmax slider** up and down to watch the loop expand from a tiny ellipse (minor loop) to a full saturated loop with flat tails
4. **Adjust Bsat, Hc, Br sliders** to create a custom material and see how the loop shape changes
5. Hit **"Play AC Cycle"** to animate the operating point circling the loop in real time
6. Switch to **DC Saturation** tab to see the initial magnetisation curve and the knee point
7. Use the **Steinmetz Regression** tab to fit power loss coefficients from your own measurement data

---

## Project structure

```
hysteresis-loss-simulation/
├── frontend/
│   └── index.html          # Everything — UI, chart, JS physics engine
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app entry point
│   │   ├── api/routes.py   # API endpoints
│   │   ├── utils/formulas.py  # Core physics math (Langevin, tanh loop, Bertotti loss)
│   │   └── models/         # Steinmetz ML model (scikit-learn)
│   └── requirements.txt
├── package.json            # npm scripts to run both servers together
└── generate_test_data.py   # Helper to generate sample Steinmetz training data
```

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

| What the ML model does | Why it matters |
|---|---|
| Fits k, α, β from your lab measurements | Lets you use real datasheet data instead of guessing |
| Validates against known material datasheets | Ensures the Steinmetz model is accurate for your specific core |
| Can predict loss at untested operating points | Interpolate/extrapolate to frequencies or flux levels you didn't measure |
| Ridge regularisation prevents overfitting | Stays stable even with sparse or slightly noisy datasets |

In general, ML regression here replaces the tedious manual curve-fitting that engineers used to do graphically on log-log paper. It gives you a compact mathematical model (just 3 numbers) that accurately describes how your core loses energy across a wide range of operating conditions.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | HTML + Vanilla JS, Chart.js, Tailwind CSS (CDN) |
| Backend | Python, FastAPI, uvicorn |
| ML | scikit-learn (LinearRegression with log transform) |
| Runner | Node.js + concurrently |
