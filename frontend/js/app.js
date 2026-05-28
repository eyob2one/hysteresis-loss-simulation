/**
 * app.js
 * ──────
 * Main application controller.  Manages:
 *   - Mode switching & dynamic form rendering
 *   - API call orchestration
 *   - Results display
 *   - Toast notifications
 *   - CSV upload flow
 *   - Chart export
 */

import {
  checkHealth,
  simulateSteinmetz,
  simulateBertotti,
  analyseBHCurve,
  generateHysteresisLoop,
  uploadBHCsv,
} from "./api.js";

import {
  renderHysteresisLoop,
  renderBHCurve,
  renderLossBreakdown,
  hideBreakdown,
} from "./charts.js";

// ── State ─────────────────────────────────────────────────────────────────────

let currentMode = "steinmetz";

// Parameter definitions per simulation mode
const PARAM_SCHEMAS = {
  steinmetz: [
    { id: "k",      label: "k — Steinmetz Coefficient",  default: "0.05",  step: "0.001" },
    { id: "f",      label: "f — Frequency (Hz)",          default: "50",    step: "1"     },
    { id: "b_peak", label: "B_peak — Peak Flux Density (T)", default: "1.2", step: "0.01" },
    { id: "alpha",  label: "α — Frequency Exponent",      default: "1.7",   step: "0.01"  },
    { id: "beta",   label: "β — Flux Density Exponent",   default: "2.0",   step: "0.01"  },
  ],
  bertotti: [
    { id: "k_h",    label: "k_h — Hysteresis Coeff",      default: "0.02",  step: "0.001" },
    { id: "k_e",    label: "k_e — Eddy Current Coeff",     default: "1e-5",  step: "1e-6"  },
    { id: "k_ex",   label: "k_ex — Excess Loss Coeff",     default: "5e-4",  step: "1e-5"  },
    { id: "f",      label: "f — Frequency (Hz)",           default: "50",    step: "1"     },
    { id: "b_peak", label: "B_peak — Peak Flux Density (T)", default: "1.2", step: "0.01"  },
    { id: "n",      label: "n — Steinmetz Exponent",       default: "2.0",   step: "0.01"  },
  ],
  "bh-curve": [
    { id: "material_name", label: "Material Name", default: "Silicon Steel M19", type: "text" },
    { id: "h_values", label: "H values (A/m, comma-separated)", default: "100,200,500,1000,2000,5000,10000", type: "text" },
    { id: "b_values", label: "B values (T, comma-separated)",   default: "0.3,0.6,1.0,1.3,1.5,1.65,1.72",  type: "text" },
  ],
  hysteresis: [
    { id: "h_max",        label: "H_max — Max Field (A/m)",          default: "5000",  step: "100"  },
    { id: "b_sat",        label: "B_sat — Saturation Flux (T)",      default: "1.8",   step: "0.01" },
    { id: "coercivity_h", label: "H_c — Coercive Field (A/m)",       default: "300",   step: "10"   },
    { id: "remanence_b",  label: "B_r — Remanent Flux Density (T)",  default: "1.2",   step: "0.01" },
    { id: "n_points",     label: "Points per branch",                 default: "200",   step: "10"   },
  ],
};

// ── DOM helpers ───────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showToast(message, isError = true) {
  const toast = $("toast");
  $("toast-msg").textContent = message;
  toast.className = toast.className
    .replace(/bg-\w+-900/, isError ? "bg-red-900"   : "bg-emerald-900")
    .replace(/border-\w+-700/, isError ? "border-red-700" : "border-emerald-700")
    .replace(/text-\w+-100/, isError ? "text-red-100" : "text-emerald-100");
  toast.classList.remove("opacity-0", "translate-y-2");
  setTimeout(() => toast.classList.add("opacity-0", "translate-y-2"), 3500);
}

function setResults(kvPairs) {
  const container = $("results-output");
  container.className = "font-mono text-sm text-gray-300 space-y-0";
  container.innerHTML = kvPairs
    .map(
      ([k, v]) =>
        `<div class="result-row">
           <span class="result-key">${k}</span>
           <span class="result-value">${v}</span>
         </div>`
    )
    .join("");
}

function setLoading(isLoading) {
  const btn = $("run-btn");
  btn.textContent = isLoading ? "Running…" : "Run Simulation";
  btn.disabled = isLoading;
}

// ── Form rendering ────────────────────────────────────────────────────────────

function renderParamForm(mode) {
  const form   = $("param-form");
  const schema = PARAM_SCHEMAS[mode] ?? [];
  form.innerHTML = schema
    .map(
      ({ id, label, default: def, step, type }) => `
      <div>
        <label class="param-label" for="${id}">${label}</label>
        <input
          class="param-input"
          id="${id}"
          name="${id}"
          type="${type ?? "number"}"
          value="${def}"
          ${step ? `step="${step}"` : ""}
        />
      </div>`
    )
    .join("");
}

function getFormValues(mode) {
  const schema = PARAM_SCHEMAS[mode] ?? [];
  const values = {};
  schema.forEach(({ id, type }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (type === "text") {
      values[id] = el.value.trim();
    } else {
      const parsed = parseFloat(el.value);
      if (isNaN(parsed)) throw new Error(`Invalid value for "${id}".`);
      values[id] = parsed;
    }
  });
  return values;
}

// ── Mode switching ────────────────────────────────────────────────────────────

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
    btn.querySelector("input").checked = btn.dataset.mode === mode;
  });
  renderParamForm(mode);
  $("results-output").innerHTML = '<span class="text-gray-600">Results will appear here.</span>';
  $("chart-placeholder").style.display = "";
  hideBreakdown();
}

// ── Simulation dispatch ───────────────────────────────────────────────────────

async function runSimulation() {
  setLoading(true);
  try {
    const vals = getFormValues(currentMode);

    switch (currentMode) {
      case "steinmetz": {
        const res = await simulateSteinmetz(vals);
        setResults([
          ["Core Loss",         `${res.core_loss_W_m3.toExponential(4)} W/m³`],
          ["k coefficient",     vals.k],
          ["Frequency",         `${vals.f} Hz`],
          ["B_peak",            `${vals.b_peak} T`],
          ["α exponent",        vals.alpha],
          ["β exponent",        vals.beta],
        ]);
        // Render a simple bar chart for single value result
        renderSingleValueChart("Core Loss (W/m³)", res.core_loss_W_m3);
        break;
      }

      case "bertotti": {
        const res = await simulateBertotti(vals);
        const c   = res.loss_components_W_m3;
        setResults([
          ["Total Loss",        `${c.total_loss_W_m3.toExponential(4)} W/m³`],
          ["Hysteresis Loss",   `${c.hysteresis_loss_W_m3.toExponential(4)} W/m³`],
          ["Eddy-Current Loss", `${c.eddy_current_loss_W_m3.toExponential(4)} W/m³`],
          ["Excess Loss",       `${c.excess_loss_W_m3.toExponential(4)} W/m³`],
        ]);
        renderLossBreakdown(c);
        break;
      }

      case "bh-curve": {
        const hVals = vals.h_values.split(",").map(Number).filter(isFinite);
        const bVals = vals.b_values.split(",").map(Number).filter(isFinite);
        const res   = await analyseBHCurve({
          h_values: hVals,
          b_values: bVals,
          material_name: vals.material_name,
        });
        const a = res.analysis;
        setResults([
          ["Material",          res.material],
          ["B_sat",             `${a.b_saturation_T.toFixed(4)} T`],
          ["B_r (estimated)",   `${a.b_remanence_T.toFixed(4)} T`],
          ["H_c (estimated)",   `${a.h_coercivity_A_per_m.toFixed(2)} A/m`],
          ["μ_r initial",       a.mu_r_initial],
          ["μ_r at knee",       a.mu_r_at_knee],
          ["Knee H",            `${a.knee_point.knee_H_A_per_m.toFixed(2)} A/m`],
          ["Knee B",            `${a.knee_point.knee_B_Tesla.toFixed(4)} T`],
        ]);
        renderBHCurve(hVals, bVals, a.knee_point);
        break;
      }

      case "hysteresis": {
        const res  = await generateHysteresisLoop(vals);
        const loop = res.hysteresis_loop;
        setResults([
          ["B_sat",        `${vals.b_sat} T`],
          ["H_max",        `${vals.h_max} A/m`],
          ["H_c",          `${vals.coercivity_h} A/m`],
          ["B_r",          `${vals.remanence_b} T`],
          ["Points/branch", vals.n_points],
        ]);
        renderHysteresisLoop(loop);
        break;
      }

      default:
        showToast("Unknown simulation mode.");
    }
  } catch (err) {
    showToast(err.message ?? "Unexpected error.");
  } finally {
    setLoading(false);
  }
}

// ── Stub: single-value bar chart for Steinmetz result ────────────────────────

function renderSingleValueChart(label, value) {
  const ctx = document.getElementById("main-chart").getContext("2d");
  if (window._singleChart) { window._singleChart.destroy(); }
  window._singleChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [label],
      datasets: [
        {
          data: [value],
          backgroundColor: "rgba(14,165,233,0.8)",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          type: "logarithmic",
          title: { display: true, text: "W/m³", color: "#9ca3af" },
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.8)" },
        },
        x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
      },
    },
  });
  $("chart-placeholder").style.display = "none";
  $("chart-title").textContent = "Steinmetz Core Loss";
}

// ── CSV upload handler ────────────────────────────────────────────────────────

async function handleCsvUpload() {
  const fileInput = $("csv-upload");
  const file = fileInput.files?.[0];
  if (!file) { showToast("Please select a CSV file first."); return; }

  setLoading(true);
  try {
    const res = await uploadBHCsv(file);
    const a   = res.analysis;
    setResults([
      ["File",           res.filename],
      ["Rows parsed",    res.rows_parsed],
      ["Material",       res.material],
      ["Frequency",      `${res.frequency_Hz} Hz`],
      ["Temperature",    `${res.temperature_C} °C`],
      ["B_sat",          `${a.b_saturation_T.toFixed(4)} T`],
      ["B_r",            `${a.b_remanence_T.toFixed(4)} T`],
      ["H_c",            `${a.h_coercivity_A_per_m.toFixed(2)} A/m`],
      ["Knee H",         `${a.knee_point.knee_H_A_per_m.toFixed(2)} A/m`],
      ["Knee B",         `${a.knee_point.knee_B_Tesla.toFixed(4)} T`],
    ]);
    renderHysteresisLoop(a.hysteresis_loop);
    showToast("CSV analysed successfully.", false);
  } catch (err) {
    showToast(err.message ?? "CSV upload failed.");
  } finally {
    setLoading(false);
  }
}

// ── API health polling ────────────────────────────────────────────────────────

async function pollHealth() {
  const dot   = $("api-status-dot");
  const label = $("api-status-label");
  const alive = await checkHealth();
  if (alive) {
    dot.className   = dot.className.replace("bg-gray-600", "bg-emerald-400");
    dot.style.backgroundColor = "#34d399";
    label.textContent = "API Connected";
    label.className   = "text-sm text-emerald-400";
  } else {
    dot.style.backgroundColor = "#ef4444";
    label.textContent = "API Unreachable";
    label.className   = "text-sm text-red-400";
  }
}

// ── Chart export ─────────────────────────────────────────────────────────────

function exportChart() {
  const canvas = document.getElementById("main-chart");
  const link   = document.createElement("a");
  link.download = `magsim-${currentMode}-${Date.now()}.png`;
  link.href     = canvas.toDataURL("image/png");
  link.click();
}

// ── Initialisation ────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Initial form
  renderParamForm(currentMode);

  // Mode selector
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchMode(btn.dataset.mode));
  });

  // Run button
  $("run-btn").addEventListener("click", runSimulation);

  // Upload button
  $("upload-btn").addEventListener("click", handleCsvUpload);

  // Export button
  $("export-btn").addEventListener("click", exportChart);

  // Health check
  pollHealth();
  setInterval(pollHealth, 15_000);
});
