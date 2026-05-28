/**
 * charts.js
 * ─────────
 * Chart.js wrapper functions.  All chart instances are created and updated
 * here; app.js drives them by calling these exports with fresh data.
 *
 * Chart lifecycle:
 *   1. First call → create a new Chart instance and register it.
 *   2. Subsequent calls → update data & labels in-place (smooth animation).
 */

/** @type {Chart|null} */
let mainChart = null;

/** @type {Chart|null} */
let breakdownChart = null;

const CHART_COLOURS = {
  upper:     "rgba(14, 165, 233, 0.9)",   // sky-500
  lower:     "rgba(249, 115, 22, 0.9)",   // orange-500
  bh:        "rgba(52, 211, 153, 0.85)",  // emerald-400
  grid:      "rgba(55, 65, 81, 0.8)",
  tick:      "#9ca3af",
  hys:       "rgba(14, 165, 233, 0.85)",
  eddy:      "rgba(249, 115, 22, 0.85)",
  excess:    "rgba(167, 139, 250, 0.85)",
};

function makeAxisDefaults(label) {
  return {
    title:  { display: true, text: label, color: CHART_COLOURS.tick, font: { size: 11 } },
    ticks:  { color: CHART_COLOURS.tick, maxTicksLimit: 8 },
    grid:   { color: CHART_COLOURS.grid },
  };
}

/** Destroy a chart instance safely. */
function destroyIfExists(chartRef) {
  if (chartRef) { chartRef.destroy(); return null; }
  return null;
}

// ── Hysteresis B-H Loop ────────────────────────────────────────────────────────

/**
 * Render or update the hysteresis loop scatter chart.
 * @param {{ h: number[], b_upper: number[], b_lower: number[] }} loopData
 */
export function renderHysteresisLoop(loopData) {
  const ctx = document.getElementById("main-chart").getContext("2d");
  const { h, b_upper, b_lower } = loopData;

  const upperPoints = h.map((hv, i) => ({ x: hv, y: b_upper[i] }));
  const lowerPoints = h.map((hv, i) => ({ x: hv, y: b_lower[i] }));

  const config = {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Upper Branch",
          data: upperPoints,
          borderColor: CHART_COLOURS.upper,
          backgroundColor: "transparent",
          showLine: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2.5,
        },
        {
          label: "Lower Branch",
          data: lowerPoints,
          borderColor: CHART_COLOURS.lower,
          backgroundColor: "transparent",
          showLine: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { labels: { color: CHART_COLOURS.tick } },
        tooltip: { callbacks: { label: (ctx) => `B = ${ctx.parsed.y.toFixed(4)} T` } },
      },
      scales: {
        x: makeAxisDefaults("H  (A/m)"),
        y: makeAxisDefaults("B  (T)"),
      },
    },
  };

  if (mainChart) { mainChart.destroy(); }
  mainChart = new Chart(ctx, config);
  document.getElementById("chart-placeholder").style.display = "none";
  document.getElementById("chart-title").textContent = "Hysteresis B-H Loop";
}

// ── BH Curve scatter ──────────────────────────────────────────────────────────

/**
 * Render a measured BH curve with knee-point annotation.
 * @param {number[]} hArr
 * @param {number[]} bArr
 * @param {{ knee_H_A_per_m: number, knee_B_Tesla: number }} kneePoint
 */
export function renderBHCurve(hArr, bArr, kneePoint) {
  const ctx = document.getElementById("main-chart").getContext("2d");

  const bhPoints  = hArr.map((h, i) => ({ x: h, y: bArr[i] }));
  const kneePoint_ = [{ x: kneePoint.knee_H_A_per_m, y: kneePoint.knee_B_Tesla }];

  if (mainChart) { mainChart.destroy(); }
  mainChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "BH Curve",
          data: bhPoints,
          borderColor: CHART_COLOURS.bh,
          backgroundColor: "rgba(52,211,153,0.12)",
          showLine: true,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: "Knee Point",
          data: kneePoint_,
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          pointRadius: 8,
          pointStyle: "triangle",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: { legend: { labels: { color: CHART_COLOURS.tick } } },
      scales: {
        x: makeAxisDefaults("H  (A/m)"),
        y: makeAxisDefaults("B  (T)"),
      },
    },
  });

  document.getElementById("chart-placeholder").style.display = "none";
  document.getElementById("chart-title").textContent = "B-H Magnetisation Curve";
}

// ── Bertotti breakdown bar ────────────────────────────────────────────────────

/**
 * Render Bertotti loss component breakdown as a horizontal bar chart.
 * @param {{ hysteresis_loss_W_m3: number, eddy_current_loss_W_m3: number, excess_loss_W_m3: number }} components
 */
export function renderLossBreakdown(components) {
  document.getElementById("breakdown-panel").classList.remove("hidden");
  const ctx = document.getElementById("breakdown-chart").getContext("2d");

  const labels = ["Hysteresis", "Eddy Current", "Excess"];
  const values = [
    components.hysteresis_loss_W_m3,
    components.eddy_current_loss_W_m3,
    components.excess_loss_W_m3,
  ];
  const colours = [CHART_COLOURS.hys, CHART_COLOURS.eddy, CHART_COLOURS.excess];

  if (breakdownChart) { breakdownChart.destroy(); }
  breakdownChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Loss (W/m³)",
          data: values,
          backgroundColor: colours,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.x.toExponential(3)} W/m³`,
          },
        },
      },
      scales: {
        x: { ...makeAxisDefaults("Loss Density  (W/m³)"), type: "logarithmic" },
        y: { ticks: { color: CHART_COLOURS.tick }, grid: { display: false } },
      },
    },
  });
}

/** Hide the breakdown panel (call when switching away from Bertotti mode). */
export function hideBreakdown() {
  document.getElementById("breakdown-panel").classList.add("hidden");
  if (breakdownChart) { breakdownChart.destroy(); breakdownChart = null; }
}
