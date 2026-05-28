# Algorithmic Feature Ranking & Development Roadmap
## Critical Path Method (CPM) Analysis
### Hysteresis Loss & Magnetic Core Saturation Simulation Application

---

## Methodology

The ranking below applies the **Critical Path Method** to the feature
set. Each node in the dependency graph is evaluated on two axes:

- **Blocking Factor (BF):** How many downstream features are unblockable
  until this task completes?  Higher = higher rank priority.
- **Integration Risk (IR):** How many other roles does this feature's
  interface contract affect?

Features with BF ≥ 3 **and** IR ≥ 2 are classified as **Critical Path**
items and must reach a stable, merged state before dependent work begins.

---

## Feature Priority Table

| Rank | Priority Level | Feature Name | Assigned Lead Role | Upstream Dependency | Deliverable Checkpoint | BF | IR |
|:----:|:--------------|:-------------|:-------------------|:--------------------|:-----------------------|:--:|:--:|
| **1** | 🔴 ABSOLUTE CRITICAL | Python Virtual Environment & Dependency Install | Backend Engineer | `python3 ≥ 3.10` on host | `venv/` directory exists; `pip show fastapi numpy scikit-learn` all succeed; `backend/requirements.txt` locked to pinned versions | 6 | 4 |
| **2** | 🔴 ABSOLUTE CRITICAL | Mathematical Formula Library (`utils/formulas.py`) | ML Engineer | Rank 1 | All functions (`steinmetz_core_loss`, `total_bertotti_loss`, `generate_hysteresis_loop`, `find_saturation_knee_point`) callable and unit-tested; no external calls needed | 5 | 3 |
| **3** | 🔴 ABSOLUTE CRITICAL | BH Data Parser & Pydantic Schema (`utils/data_parser.py`) | Data Engineer | Rank 1 | `parse_csv_to_bh_dataset()` and `BHDataset` model importable; rejects malformed CSV with typed errors; `bh_dataset_to_arrays()` returns paired NumPy arrays | 4 | 3 |
| **4** | 🔴 ABSOLUTE CRITICAL | Saturation Knee Detection Algorithm | ML Engineer | Rank 2, Rank 3 | `find_saturation_knee_point()` returns `{knee_index, knee_H_A_per_m, knee_B_Tesla}` for ≥ 3 data points; Menger curvature logic validated against known sigmoid BH datasets | 4 | 2 |
| **5** | 🔴 ABSOLUTE CRITICAL | FastAPI Application Entry Point & CORS (`main.py`) | Backend Engineer | Rank 1 | `uvicorn app.main:app --reload` starts without error; `GET /api/v1/health` returns `{"status":"ok"}`; CORS allows `localhost:5500` and `localhost:3000` | 5 | 4 |
| **6** | 🟠 HIGH | Steinmetz ML Pipeline (`models/hysteresis_model.py` — `SteinmetzModel`) | ML Engineer | Rank 2, Rank 3, Rank 4 | `SteinmetzModel.fit(f, b_peak, p_loss)` converges; `.get_coefficients()` returns `{k, alpha, beta}`; `.predict()` within 5 % of Steinmetz reference values for Si-steel test case | 3 | 2 |
| **7** | 🟠 HIGH | BH Curve Analyser (`models/hysteresis_model.py` — `BHCurveAnalyser`) | ML Engineer | Rank 4, Rank 3 | `.analyse(h, b)` returns `{b_saturation_T, b_remanence_T, h_coercivity_A_per_m, mu_r_initial, mu_r_at_knee, knee_point, hysteresis_loop}`; tested on synthetic Langevin dataset | 3 | 2 |
| **8** | 🟠 HIGH | Steinmetz & Bertotti API Endpoints (`/simulate/*`) | Backend Engineer | Rank 5, Rank 6 | `POST /api/v1/simulate/steinmetz` and `/bertotti` return correct JSON; Pydantic validation rejects negative inputs with HTTP 422; manual `curl` tests pass | 3 | 3 |
| **9** | 🟠 HIGH | BH Curve Analysis API Endpoint (`/analyse/bh-curve`) | Backend Engineer | Rank 5, Rank 7 | `POST /api/v1/analyse/bh-curve` returns full analysis dict matching `BHCurveAnalyser.analyse()` output; endpoint documented in Swagger at `/docs` | 3 | 3 |
| **10** | 🟠 HIGH | CSV Upload Endpoint (`/upload/bh-csv`) | Backend Engineer | Rank 8, Rank 9, Rank 3 | `POST /api/v1/upload/bh-csv` accepts `.csv` multipart upload ≤ 5 MB; rejects non-CSV with HTTP 415; returns full analysis on valid file; integration-tested with 3 real Si-steel CSVs | 2 | 3 |
| **11** | 🟡 MEDIUM | Frontend API Client (`frontend/js/api.js`) | Frontend Engineer | Rank 5 (health endpoint reachable) | All 5 fetch functions (`checkHealth`, `simulateSteinmetz`, `simulateBertotti`, `analyseBHCurve`, `generateHysteresisLoop`, `uploadBHCsv`) resolve correctly; error paths throw typed `Error` | 3 | 2 |
| **12** | 🟡 MEDIUM | Chart.js Hysteresis Loop Renderer (`charts.js — renderHysteresisLoop`) | Frontend Engineer | Rank 11 | `renderHysteresisLoop(loopData)` draws upper and lower sigmoid branches on canvas; axis labels read "H (A/m)" and "B (T)"; chart updates in-place on second call without DOM flicker | 2 | 1 |
| **13** | 🟡 MEDIUM | Chart.js BH Curve + Knee-Point Renderer (`charts.js — renderBHCurve`) | Frontend Engineer | Rank 11, Rank 12 | `renderBHCurve(h, b, kneePoint)` plots scatter + line with triangle marker at knee; knee coordinates displayed in tooltip; chart exported as PNG via `exportChart()` | 2 | 1 |
| **14** | 🟡 MEDIUM | Simulation Mode Selector & Dynamic Parameter Form (`app.js`) | Frontend Engineer | Rank 11 | Switching between 4 modes (steinmetz, bertotti, bh-curve, hysteresis) re-renders the correct input fields; all inputs validated client-side before API call; loading state disables Run button | 2 | 1 |
| **15** | 🟡 MEDIUM | End-to-End Steinmetz & Bertotti UI Flow | Frontend Engineer | Rank 8, Rank 12, Rank 14 | Filling Steinmetz form → clicking Run → core loss value appears in Results panel AND single-bar chart renders; same for Bertotti with 3-component breakdown bar chart | 2 | 2 |
| **16** | 🟡 MEDIUM | End-to-End BH Curve & Hysteresis Loop UI Flow | Frontend Engineer | Rank 9, Rank 13, Rank 14 | Paste H/B arrays → Run → knee annotation visible on chart; Hysteresis mode → sigmoid B-H loop rendered with orange lower branch and sky upper branch | 2 | 2 |
| **17** | 🟡 MEDIUM | CSV Upload UI Flow | Frontend Engineer | Rank 10, Rank 16 | File picker accepts `.csv`; Upload & Analyse button triggers `uploadBHCsv`; results panel populates; hysteresis loop chart renders from uploaded data; non-CSV rejected with toast | 1 | 2 |
| **18** | 🟢 STANDARD | API Health Polling & Status Badge | Frontend Engineer | Rank 11 | Dot indicator turns emerald on API alive, red on unreachable; polls every 15 s; no console errors when API is down | 1 | 1 |
| **19** | 🟢 STANDARD | Hysteresis Loop Generation Endpoint (`/analyse/hysteresis-loop`) | Backend Engineer | Rank 5, Rank 2 | `POST /api/v1/analyse/hysteresis-loop` returns `{h: [], b_upper: [], b_lower: []}` arrays of length equal to `n_points`; tested at 20, 200, and 2000 points | 1 | 2 |
| **20** | 🟢 STANDARD | Bertotti Loss Breakdown Bar Chart | Frontend Engineer | Rank 15 | Three horizontal bars (Hysteresis / Eddy / Excess) render on logarithmic X-axis; breakdown panel hidden when not in Bertotti mode | 1 | 1 |
| **21** | 🟢 STANDARD | `SteinmetzFeatureBuilder` Scikit-learn Transformer Unit Tests | ML Engineer | Rank 6 | `pytest` suite confirms log-space transform, rejects negative inputs, and pipeline serialises/deserialises via `joblib.dump` / `joblib.load` | 1 | 1 |
| **22** | 🟢 STANDARD | Data Parser Edge-Case Tests | Data Engineer | Rank 3 | pytest covers: NaN rows dropped, duplicate H de-duplicated, B clipped at 3.0 T, non-monotonic H raises `ValueError`, CSV with extra columns accepted | 1 | 1 |
| **23** | 🔵 POLISH | PNG Chart Export Button | Frontend Engineer | Rank 12, Rank 13 | Clicking Export PNG triggers browser download with filename `magsim-<mode>-<timestamp>.png`; canvas background renders white on export | 0 | 0 |
| **24** | 🔵 POLISH | API Interactive Documentation Customisation | Backend Engineer | Rank 8, Rank 9 | Swagger UI at `/docs` includes example request bodies for each endpoint; response schemas display field descriptions from Pydantic models | 0 | 0 |
| **25** | 🔵 POLISH | Responsive Mobile Layout (Tailwind breakpoints) | Frontend Engineer | Rank 16, Rank 17 | Control panel stacks above chart area on viewports < 768 px; parameter inputs remain usable on iPhone 14 viewport (390 px wide) | 0 | 0 |
| **26** | 🔵 POLISH | Dark/Light Theme Toggle | Frontend Engineer | Rank 25 | Toggle persists in `localStorage`; Chart.js colour scheme switches accordingly; no flash of wrong theme on page load | 0 | 0 |
| **27** | 🔵 POLISH | Permeability vs. H Curve Overlay | ML Engineer + Frontend Engineer | Rank 7, Rank 13 | Secondary Y-axis on BH chart shows μ_r(H) computed from B/(μ₀·H); colour-coded in amber; toggled by a checkbox in the control panel | 0 | 1 |

---

## Critical Path Visualisation

```
[Rank 1: venv + deps]
       │
       ├──────────────────────────────────┐
       │                                  │
[Rank 2: formulas.py]           [Rank 3: data_parser.py]
       │                                  │
       ├─────────────┐                    │
       │             │                    │
[Rank 4: knee]   [Rank 5: main.py / FastAPI]
       │             │
       │        [Rank 8: /simulate/* endpoints]
       │             │
[Rank 6: SteinmetzModel]          [Rank 11: api.js]
[Rank 7: BHCurveAnalyser]              │
       │             │            [Rank 12–14: charts + form]
       │        [Rank 9: /analyse/bh-curve]    │
       │        [Rank 10: /upload CSV]    [Rank 15–17: E2E flows]
       │                                        │
       └──────────────────────────────[Rank 18–27: polish]
```

**Critical Path (zero float):**
Rank 1 → 2 → 4 → 7 → 9 → 10 → 17 → 27

Any delay on this chain delays the final deliverable by an equal amount.

---

## Sprint Allocation Recommendation

| Sprint | Duration | Ranks Targeted | Goal |
|--------|----------|----------------|------|
| **Sprint 0** (Setup) | 1 day | 1, 5 | All devs can `import fastapi` and hit `/health` |
| **Sprint 1** (Core Math) | 3 days | 2, 3, 4 | Formula library + data parser fully tested |
| **Sprint 2** (ML + API) | 4 days | 6, 7, 8, 9, 19 | All simulation endpoints live and documented |
| **Sprint 3** (Integration) | 3 days | 10, 11, 12, 13, 14 | CSV upload works; frontend can call every endpoint |
| **Sprint 4** (E2E + Tests) | 3 days | 15, 16, 17, 18, 21, 22 | Full user flows work; test suite green |
| **Sprint 5** (Polish) | 2 days | 20, 23–27 | Export, mobile, themes, permeability overlay |

---

*Last updated by: Lead Architect  |  Method: Critical Path Method (CPM)
with Blocking Factor × Integration Risk composite scoring.*
