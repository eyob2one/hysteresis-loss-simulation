(() => {
  "use strict";

  const API_BASE = "http://127.0.0.1:8000/api/v1";
  const CUSTOM_KEY = "custom";

  const MATERIAL_PRESETS = [
    {
      key: "silicon_steel_m4",
      name: "Electrical Silicon Steel (M4)",
      description: "Highly permeable soft magnet for transformers and motor stators. Narrow loop, low coercivity, and low core loss.",
      B_sat: 1.8,
      H_c: 40,
      B_r: 1.35,
      H_max: 800,
      coreVolume: 500,
      turns: 200,
      k: 0.015,
      alpha: 1.7,
      beta: 2.0,
      k_e: 1.5e-5,
      k_ex: 8.0e-5
    },
    {
      key: "soft_pure_iron",
      name: "Soft Pure Iron",
      description: "High saturation induction for electromagnets, relays, and shielding. Good DC response, but eddy losses need control.",
      B_sat: 2.15,
      H_c: 80,
      B_r: 1.15,
      H_max: 1200,
      coreVolume: 250,
      turns: 180,
      k: 0.025,
      alpha: 1.65,
      beta: 2.1,
      k_e: 2.5e-5,
      k_ex: 1.1e-4
    },
    {
      key: "permalloy_78",
      name: "Permalloy (78% Ni, 22% Fe)",
      description: "Very high permeability and very low coercivity. Best for sensitive sensors, signal transformers, and precision inductors.",
      B_sat: 0.75,
      H_c: 1.6,
      B_r: 0.55,
      H_max: 15,
      coreVolume: 50,
      turns: 500,
      k: 0.003,
      alpha: 1.55,
      beta: 2.05,
      k_e: 5.0e-6,
      k_ex: 1.5e-5
    },
    {
      key: "mnzn_ferrite",
      name: "Soft MnZn Ferrite (High Freq)",
      description: "Ceramic soft magnet with high resistivity. Strong high-frequency option because eddy-current loss stays small.",
      B_sat: 0.4,
      H_c: 12,
      B_r: 0.22,
      H_max: 100,
      coreVolume: 10,
      turns: 80,
      k: 0.0012,
      alpha: 1.6,
      beta: 2.4,
      k_e: 2.0e-7,
      k_ex: 5.0e-6
    },
    {
      key: "metglas_2605sa1",
      name: "Metglas 2605SA1 (Amorphous)",
      description: "Amorphous iron-based ribbon with very low coercivity and low magnetostriction. Efficient transformer core material.",
      B_sat: 1.56,
      H_c: 4,
      B_r: 0.85,
      H_max: 80,
      coreVolume: 400,
      turns: 220,
      k: 0.004,
      alpha: 1.58,
      beta: 1.95,
      k_e: 4.0e-6,
      k_ex: 2.0e-5
    },
    {
      key: "hyperco_50",
      name: "Hyperco 50 (Cobalt-Iron)",
      description: "Very high saturation cobalt-iron alloy used when actuator force density is more important than cost.",
      B_sat: 2.4,
      H_c: 110,
      B_r: 1.65,
      H_max: 2000,
      coreVolume: 150,
      turns: 160,
      k: 0.032,
      alpha: 1.66,
      beta: 2.05,
      k_e: 3.0e-5,
      k_ex: 1.3e-4
    },
    {
      key: "supermalloy",
      name: "Supermalloy Premium",
      description: "Nickel-iron alloy with extremely high initial permeability for instrumentation, shielding, and fluxgate sensing.",
      B_sat: 0.79,
      H_c: 0.35,
      B_r: 0.4,
      H_max: 5,
      coreVolume: 120,
      turns: 600,
      k: 0.0015,
      alpha: 1.52,
      beta: 2.0,
      k_e: 3.0e-6,
      k_ex: 1.0e-5
    },
    {
      key: "alnico_v",
      name: "Alnico V (Hard Magnet)",
      description: "Permanent magnet alloy with high remanence and high coercive force. The loop is wide and energy-storing.",
      B_sat: 1.25,
      H_c: 50000,
      B_r: 1.1,
      H_max: 150000,
      coreVolume: 30,
      turns: 120,
      k: 0.18,
      alpha: 1.5,
      beta: 1.8,
      k_e: 8.0e-5,
      k_ex: 3.0e-4
    },
    {
      key: "ceramic_hard_ferrite",
      name: "Ceramic Hard Ferrite",
      description: "Barium or strontium ferrite permanent magnet. Low saturation but very high coercivity and strong demagnetization resistance.",
      B_sat: 0.38,
      H_c: 170000,
      B_r: 0.35,
      H_max: 400000,
      coreVolume: 80,
      turns: 100,
      k: 0.095,
      alpha: 1.45,
      beta: 1.75,
      k_e: 5.0e-7,
      k_ex: 2.0e-5
    },
    {
      key: "ndfeb",
      name: "Neodymium NdFeB (Hard Supermagnet)",
      description: "Rare-earth permanent magnet with very high coercivity and dense magnetic energy storage.",
      B_sat: 1.28,
      H_c: 840000,
      B_r: 1.2,
      H_max: 2000000,
      coreVolume: 20,
      turns: 80,
      k: 0.24,
      alpha: 1.45,
      beta: 1.7,
      k_e: 1.2e-4,
      k_ex: 4.0e-4
    }
  ];

  const VIEW_META = {
    simulator: {
      title: "Simulation & Parameter Config",
      subtitle: "Friend-style B-H loop model with AC playback and domain vectors."
    },
    data: {
      title: "Machine Dataset Import",
      subtitle: "CSV overlays and telemetry snapshots for side-by-side material comparison."
    },
    ml: {
      title: "Dynamic Steinmetz Regression",
      subtitle: "Material-aware loss fitting with backend Scikit-Learn or offline ridge regression."
    },
    theory: {
      title: "Theory Panel",
      subtitle: "A compact reference for hysteresis-loss physics and magnetic material behavior."
    },
    script: {
      title: "Python Script Bridge",
      subtitle: "Export the current analytical model for NumPy and Matplotlib verification."
    }
  };

  const state = {
    view: "simulator",
    theme: "dark",
    materialKey: "silicon_steel_m4",
    params: null,
    isHardScale: false,
    points: [],
    metrics: null,
    csv: null,
    history: [],
    trainingData: [],
    apiOnline: false,
    chart: null,
    breakdownChart: null,
    playing: false,
    animationId: null,
    playStartedAt: 0,
    lastFrame: 0
  };

  const $ = (id) => document.getElementById(id);
  const presetByKey = (key) => MATERIAL_PRESETS.find((preset) => preset.key === key);
  const activePreset = () => presetByKey(state.materialKey);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const uniqueByTolerance = (values, tolerance) =>
    values.filter((value, index) => values.findIndex((candidate) => Math.abs(candidate - value) < tolerance) === index);

  function paramsFromPreset(preset) {
    return {
      materialName: preset.name,
      B_sat: preset.B_sat,
      H_c: preset.H_c,
      B_r: preset.B_r,
      H_max: preset.H_max,
      frequency: preset.H_c > 1500 ? 0 : 60,
      coreVolume: preset.coreVolume,
      turns: preset.turns
    };
  }

  function init() {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("mag-hyst-theme");
    if (savedTheme) {
      state.theme = savedTheme;
      document.documentElement.classList.toggle("theme-light", state.theme === "light");
    }

    state.params = paramsFromPreset(MATERIAL_PRESETS[0]);
    state.isHardScale = state.params.H_c > 1500;
    buildMaterialSelect();
    bindEvents();
    refreshPhysics();
    seedReferenceHistory();
    seedTrainingRows();
    renderFitTable();
    renderHistory();
    updateAllControls();
    updateTextReadouts();
    redrawMainChart();
    redrawBreakdownChart();
    drawDomains(0);
    updatePythonScript();
    checkHealth();
    window.setInterval(checkHealth, 8000);
    refreshIcons();
    updateThemeIcon();
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function buildMaterialSelect() {
    const select = $("material-select");
    select.innerHTML = MATERIAL_PRESETS.map((preset) => {
      return `<option value="${preset.key}">${preset.name} (Bs ${preset.B_sat}T | Hc ${formatCompact(preset.H_c)} A/m)</option>`;
    }).join("") + `<option value="${CUSTOM_KEY}">Custom Material Configuration</option>`;
    select.value = state.materialKey;
  }

  function bindEvents() {
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.addEventListener("click", toggleTheme);
    });
    $("material-select").addEventListener("change", (event) => applyPreset(event.target.value));
    $("reset-btn").addEventListener("click", () => applyPreset("silicon_steel_m4"));
    $("soft-scale-btn").addEventListener("click", () => setCoercivityScale(false));
    $("hard-scale-btn").addEventListener("click", () => setCoercivityScale(true));
    $("play-cycle-btn").addEventListener("click", togglePlayback);
    $("export-png-btn").addEventListener("click", exportChartImage);
    $("snapshot-btn").addEventListener("click", () => addSnapshot("SIM_MODEL"));
    $("csv-upload").addEventListener("change", handleCsvUpload);
    $("clear-csv-btn").addEventListener("click", clearCsvOverlay);
    $("export-history-btn").addEventListener("click", exportHistoryCsv);
    $("seed-fit-btn").addEventListener("click", () => {
      seedTrainingRows();
      renderFitTable();
      showToast("Training rows reseeded from the active material.");
    });
    $("add-fit-row-btn").addEventListener("click", addFitRow);
    $("run-fit-btn").addEventListener("click", runFit);
    $("copy-script-btn").addEventListener("click", copyPythonScript);
    $("download-script-btn").addEventListener("click", downloadPythonScript);

    const sliderBindings = [
      ["input-b-sat", "B_sat", Number],
      ["input-b-r", "B_r", Number],
      ["input-h-c", "H_c", Number],
      ["input-h-max", "H_max", Number],
      ["input-frequency", "frequency", Number],
      ["input-volume", "coreVolume", Number],
      ["input-turns", "turns", Number]
    ];

    sliderBindings.forEach(([id, field, parse]) => {
      $(id).addEventListener("input", (event) => {
        updateParam(field, parse(event.target.value));
      });
    });

    window.addEventListener("resize", () => {
      drawDomains(state.lastFrame || 0);
    });
  }

  function switchView(view) {
    if (!VIEW_META[view]) return;
    state.view = view;
    document.querySelectorAll(".view").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `view-${view}`);
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === view);
    });
    $("view-title").textContent = VIEW_META[view].title;
    $("view-subtitle").textContent = VIEW_META[view].subtitle;
    if (view === "script") updatePythonScript();

    // Redraw and resize elements when switching view to handle display toggle bounds
    if (view === "simulator") {
      requestAnimationFrame(() => {
        if (state.chart) state.chart.resize();
        else redrawMainChart();
        if (state.breakdownChart) state.breakdownChart.resize();
        else redrawBreakdownChart();
        drawDomains(state.lastFrame || 0);
      });
    }
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("theme-light", state.theme === "light");
    localStorage.setItem("mag-hyst-theme", state.theme);
    updateThemeIcon();
    if (state.chart) redrawMainChart();
    if (state.breakdownChart) redrawBreakdownChart();
    drawDomains(state.lastFrame || 0);
  }

  function updateThemeIcon() {
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      const existingIcon = btn.querySelector("[data-lucide]") || btn.querySelector("svg");
      if (existingIcon) {
        const newIcon = document.createElement("i");
        newIcon.setAttribute("data-lucide", state.theme === "dark" ? "sun" : "moon");
        existingIcon.replaceWith(newIcon);
      }
    });
    refreshIcons();
  }

  function applyPreset(key) {
    if (key === CUSTOM_KEY) {
      state.materialKey = CUSTOM_KEY;
      state.params.materialName = "Custom Material Configuration";
    } else {
      const preset = presetByKey(key);
      if (!preset) return;
      state.materialKey = key;
      state.params = paramsFromPreset(preset);
      state.isHardScale = state.params.H_c > 1500;
    }
    state.csv = null;
    updateEverything();
  }

  function setCoercivityScale(isHard) {
    state.isHardScale = isHard;
    if (isHard && state.params.H_c < 1000) {
      state.params.H_c = 12000;
      state.params.H_max = Math.max(state.params.H_max, 18000);
    }
    if (!isHard && state.params.H_c > 2000) {
      state.params.H_c = 100;
      state.params.H_max = Math.max(150, Math.min(state.params.H_max, 6000));
    }
    markCustom();
    updateEverything();
  }

  function updateParam(field, value) {
    markCustom();
    if (field === "B_sat") {
      state.params.B_sat = value;
      if (state.params.B_r >= value) {
        state.params.B_r = Math.max(0.01, value * 0.82);
      }
    } else if (field === "B_r") {
      state.params.B_r = Math.min(value, state.params.B_sat * 0.98);
    } else if (field === "H_c") {
      state.params.H_c = value;
      if (state.params.H_max <= value) {
        state.params.H_max = Math.ceil(value * 1.5);
      }
      state.isHardScale = value > 1500 ? true : state.isHardScale;
    } else if (field === "H_max") {
      state.params.H_max = Math.max(value, state.params.H_c * 1.05);
    } else {
      state.params[field] = value;
    }
    updateEverything();
  }

  function markCustom() {
    state.materialKey = CUSTOM_KEY;
    state.params.materialName = "Custom Material Configuration";
  }

  function updateEverything() {
    refreshPhysics();
    updateAllControls();
    updateTextReadouts();
    redrawMainChart();
    redrawBreakdownChart();
    drawDomains(state.lastFrame || 0);
    updatePythonScript();
    refreshIcons();
  }

  function refreshPhysics() {
    state.points = generateSimulationCurve(state.params);
    state.metrics = calculateMetrics(state.params, state.points);
  }

  function updateAllControls() {
    const preset = activePreset();
    const p = state.params;
    $("material-select").value = state.materialKey;
    $("material-description").textContent = preset
      ? preset.description
      : "Custom hysteresis definition. The slider values now define the active material response.";

    $("soft-scale-btn").classList.toggle("active", !state.isHardScale);
    $("hard-scale-btn").classList.toggle("active", state.isHardScale);

    const hMin = Math.max(0.5, Math.ceil(p.H_c * 1.05));
    const hMaxInput = $("input-h-max");
    hMaxInput.min = String(hMin);
    hMaxInput.max = state.isHardScale ? "2500000" : "6000";
    hMaxInput.step = state.isHardScale ? "1000" : "10";
    if (p.H_max < hMin) p.H_max = hMin;

    const hcInput = $("input-h-c");
    hcInput.min = state.isHardScale ? "1000" : "0.5";
    hcInput.max = state.isHardScale ? "1000000" : "2000";
    hcInput.step = state.isHardScale ? "1000" : "0.5";

    const brInput = $("input-b-r");
    brInput.max = (p.B_sat * 0.98).toFixed(2);
    if (p.B_r > p.B_sat * 0.98) p.B_r = p.B_sat * 0.95;

    setInputValue("input-b-sat", p.B_sat);
    setInputValue("input-b-r", p.B_r);
    setInputValue("input-h-c", p.H_c);
    setInputValue("input-h-max", p.H_max);
    setInputValue("input-frequency", p.frequency);
    setInputValue("input-volume", p.coreVolume);
    setInputValue("input-turns", p.turns);

    $("val-b-sat").textContent = `${p.B_sat.toFixed(2)} T`;
    $("val-b-r").textContent = `${p.B_r.toFixed(2)} T`;
    $("val-h-c").textContent = `${formatCompact(p.H_c)} A/m`;
    $("val-h-max").textContent = `${formatCompact(p.H_max)} A/m`;
    $("val-frequency").textContent = p.frequency === 0 ? "0 Hz (DC)" : `${formatCompact(p.frequency)} Hz`;
    $("val-volume").textContent = `${formatCompact(p.coreVolume)} cm3`;
    $("val-turns").textContent = `${formatCompact(p.turns)} turns`;
  }

  function setInputValue(id, value) {
    const el = $(id);
    if (document.activeElement !== el) el.value = String(value);
  }

  function updateTextReadouts() {
    const p = state.params;
    const m = state.metrics;
    const sidebarMat = $("sidebar-material");
    if (sidebarMat) sidebarMat.textContent = p.materialName;
    const headerMat = $("header-material");
    if (headerMat) headerMat.textContent = p.materialName;
    const sidebarLoss = $("sidebar-loss");
    if (sidebarLoss) sidebarLoss.textContent = `${m.totalPowerLoss.toFixed(4)} W`;
    const headerArea = $("header-area");
    if (headerArea) headerArea.textContent = `${m.loopArea.toFixed(1)} J/m3`;
    $("metric-bs").textContent = m.B_sat.toFixed(2);
    $("metric-br").textContent = m.B_r.toFixed(2);
    $("metric-hc").textContent = formatCompact(m.H_c);
    $("metric-area").textContent = m.loopArea.toFixed(1);
  }

  function artanh(value) {
    const capped = clamp(value, -0.9999, 0.9999);
    return 0.5 * Math.log((1 + capped) / (1 - capped));
  }

  function generateSimulationCurve(params) {
    const points = [];
    const n = 360;
    const safeBr = Math.min(params.B_r, params.B_sat * 0.98);
    const baseRatio = safeBr / Math.max(params.B_sat, 1e-9);
    const aDc = Math.max(params.H_c / Math.max(artanh(baseRatio), 1e-6), 1e-6);
    const frequency = Math.max(0, params.frequency);
    const dynamicGain = 1 + 0.045 * Math.sqrt(frequency);
    const hCoerciveEff = params.H_c * dynamicGain;
    const aEff = aDc * dynamicGain;
    const muRev = (params.B_sat * 0.05) / Math.max(params.H_max, 1e-9);
    const bSatFerro = params.B_sat * 0.95;

    for (let i = 0; i <= n; i += 1) {
      const theta = (i * 2 * Math.PI) / n;
      const H = params.H_max * Math.sin(theta);
      const delay = hCoerciveEff * Math.cos(theta);
      const B = bSatFerro * Math.tanh((H - delay) / aEff) + muRev * H;
      points.push({
        H,
        B,
        theta,
        branch: Math.cos(theta) >= 0 ? "up" : "down"
      });
    }
    return points;
  }

  function calculateMetrics(params, points) {
    let loopArea = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p1 = points[i];
      const p2 = points[i + 1];
      loopArea += 0.5 * (p1.B + p2.B) * (p2.H - p1.H);
    }
    loopArea = Math.abs(loopArea);
    const powerLoss = loopArea * Math.max(0, params.frequency);
    const totalPowerLoss = powerLoss * Math.max(1, params.coreVolume) * 1e-6;
    return {
      B_sat: params.B_sat,
      B_r: Math.min(params.B_r, params.B_sat * 0.98),
      H_c: params.H_c,
      loopArea,
      powerLoss,
      totalPowerLoss
    };
  }

  function getChartColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      bg: style.getPropertyValue("--bg-inset").trim(),
      card: style.getPropertyValue("--bg-card").trim(),
      grid: style.getPropertyValue("--border-secondary").trim(),
      axis: style.getPropertyValue("--border-primary").trim(),
      text: style.getPropertyValue("--text-secondary").trim(),
      primary: style.getPropertyValue("--text-primary").trim(),
      cyan: style.getPropertyValue("--accent-cyan").trim(),
      magenta: style.getPropertyValue("--accent-magenta").trim(),
      amber: style.getPropertyValue("--accent-amber").trim()
    };
  }

  function redrawMainChart() {
    if (!window.Chart) {
      drawFallbackChart();
      return;
    }

    const canvas = $("main-chart");
    const ctx = canvas.getContext("2d");
    const colors = getChartColors();
    if (state.chart) state.chart.destroy();

    const simData = state.points.map((point) => ({ x: point.H, y: point.B }));
    const csvData = state.csv ? state.csv.points.map((point) => ({ x: point.H, y: point.B })) : [];
    const bounds = getBounds();
    const intercepts = getInterceptMarkers(state.points);

    const backgroundPlugin = {
      id: "chartBackground",
      beforeDraw(chart) {
        const { ctx: chartCtx, width, height } = chart;
        chartCtx.save();
        chartCtx.fillStyle = colors.bg;
        chartCtx.fillRect(0, 0, width, height);
        chartCtx.restore();
      }
    };

    const loopFillPlugin = {
      id: "hysteresisLoopFill",
      beforeDatasetsDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        if (!meta || meta.hidden || meta.data.length < 3) return;
        const { ctx: chartCtx } = chart;
        chartCtx.save();
        chartCtx.beginPath();
        meta.data.forEach((element, index) => {
          const props = element.getProps(["x", "y"], true);
          if (index === 0) chartCtx.moveTo(props.x, props.y);
          else chartCtx.lineTo(props.x, props.y);
        });
        chartCtx.closePath();
        chartCtx.fillStyle = withAlpha(colors.cyan, 0.08);
        chartCtx.fill();
        chartCtx.restore();
      }
    };

    state.chart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Simulated loop",
            data: simData,
            showLine: true,
            borderColor: colors.cyan,
            backgroundColor: colors.cyan,
            borderWidth: 2.6,
            pointRadius: 0,
            tension: 0.25,
            order: 2
          },
          {
            label: state.csv ? `CSV overlay: ${state.csv.name}` : "CSV overlay",
            data: csvData,
            showLine: true,
            borderColor: colors.magenta,
            backgroundColor: colors.magenta,
            borderWidth: 2,
            borderDash: [7, 4],
            pointRadius: state.csv ? 1.8 : 0,
            tension: 0.15,
            order: 1
          },
          {
            label: "Br and Hc markers",
            data: intercepts,
            showLine: false,
            pointRadius: 5,
            pointStyle: "rectRot",
            borderColor: colors.amber,
            backgroundColor: colors.amber,
            order: 0
          },
          {
            label: "Operating point",
            data: [],
            showLine: false,
            pointRadius: 7,
            borderColor: colors.magenta,
            backgroundColor: colors.magenta,
            order: 0
          }
        ]
      },
      plugins: [backgroundPlugin, loopFillPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { intersect: false, mode: "nearest" },
        plugins: {
          legend: {
            labels: {
              color: colors.text,
              boxWidth: 10,
              font: { family: "Inter", size: 11, weight: "700" },
              filter: (item) => state.csv || item.datasetIndex !== 1
            }
          },
          tooltip: {
            backgroundColor: colors.card,
            borderColor: colors.axis,
            borderWidth: 1,
            titleColor: colors.primary,
            bodyColor: colors.text,
            callbacks: {
              label: (context) => `H ${context.parsed.x.toFixed(1)} A/m, B ${context.parsed.y.toFixed(4)} T`
            }
          }
        },
        scales: {
          x: {
            type: "linear",
            min: -bounds.h,
            max: bounds.h,
            title: { display: true, text: "Magnetic field strength H (A/m)", color: colors.text },
            ticks: { color: colors.text, callback: (value) => formatAxis(value) },
            grid: {
              color: (ctx) => Number(ctx.tick.value) === 0 ? colors.axis : colors.grid,
              lineWidth: (ctx) => Number(ctx.tick.value) === 0 ? 1.8 : 1
            }
          },
          y: {
            min: -bounds.b,
            max: bounds.b,
            title: { display: true, text: "Magnetic flux density B (T)", color: colors.text },
            ticks: { color: colors.text },
            grid: {
              color: (ctx) => Number(ctx.tick.value) === 0 ? colors.axis : colors.grid,
              lineWidth: (ctx) => Number(ctx.tick.value) === 0 ? 1.8 : 1
            }
          }
        }
      }
    });
  }

  function redrawBreakdownChart() {
    const values = getLossBreakdown();
    if (!window.Chart) {
      drawFallbackBreakdown(values);
      return;
    }
    const colors = getChartColors();
    const ctx = $("breakdown-chart").getContext("2d");
    if (state.breakdownChart) state.breakdownChart.destroy();

    const backgroundPlugin = {
      id: "breakdownBackground",
      beforeDraw(chart) {
        const { ctx: chartCtx, width, height } = chart;
        chartCtx.save();
        chartCtx.fillStyle = colors.bg;
        chartCtx.fillRect(0, 0, width, height);
        chartCtx.restore();
      }
    };

    state.breakdownChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Hysteresis", "Eddy", "Excess"],
        datasets: [{
          data: [values.hysteresis, values.eddy, values.excess].map((value) => Math.max(value, 1e-9)),
          backgroundColor: [colors.cyan, colors.magenta, colors.amber],
          borderWidth: 0
        }]
      },
      plugins: [backgroundPlugin],
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.raw.toExponential(3)} W/m3`
            }
          }
        },
        scales: {
          x: {
            type: "logarithmic",
            ticks: { color: colors.text, callback: (value) => Number(value).toExponential(0) },
            grid: { color: colors.grid },
            title: { display: true, text: "Loss density W/m3", color: colors.text }
          },
          y: {
            ticks: { color: colors.text },
            grid: { display: false }
          }
        }
      }
    });
  }

  function getLossBreakdown() {
    const preset = activePreset() || MATERIAL_PRESETS[0];
    const p = state.params;
    const b = Math.max(0.001, p.B_sat);
    const f = Math.max(0, p.frequency);
    return {
      hysteresis: state.metrics.loopArea * f,
      eddy: preset.k_e * (f ** 2) * (b ** 2),
      excess: preset.k_ex * (f ** 1.5) * (b ** 1.5)
    };
  }

  function getBounds() {
    const allPoints = [...state.points];
    if (state.csv) allPoints.push(...state.csv.points);
    const maxH = Math.max(1, ...allPoints.map((point) => Math.abs(point.H)));
    const maxB = Math.max(0.05, ...allPoints.map((point) => Math.abs(point.B)));
    return { h: maxH * 1.12, b: maxB * 1.12 };
  }

  function getInterceptMarkers(points) {
    const hCrossings = [];
    const bCrossings = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      if (a.B === 0 || a.B * b.B < 0) {
        const t = Math.abs(a.B) / (Math.abs(a.B) + Math.abs(b.B) || 1);
        hCrossings.push(a.H + t * (b.H - a.H));
      }
      if (a.H === 0 || a.H * b.H < 0) {
        const t = Math.abs(a.H) / (Math.abs(a.H) + Math.abs(b.H) || 1);
        bCrossings.push(a.B + t * (b.B - a.B));
      }
    }

    const hUnique = uniqueByTolerance(hCrossings, Math.max(0.1, state.params.H_max * 0.001)).slice(0, 4);
    const bUnique = uniqueByTolerance(bCrossings, 0.002).slice(0, 4);
    return [
      ...hUnique.map((h) => ({ x: h, y: 0 })),
      ...bUnique.map((b) => ({ x: 0, y: b }))
    ];
  }

  function drawDomains(hFraction) {
    state.lastFrame = clamp(hFraction, -1, 1);
    const canvas = $("core-domains-canvas");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const colors = getChartColors();
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const cols = Math.max(8, Math.floor(rect.width / 42));
    const rows = Math.max(4, Math.floor(rect.height / 36));
    const cellW = rect.width / cols;
    const cellH = rect.height / rows;
    const alignment = Math.abs(state.lastFrame);
    const targetAngle = state.lastFrame >= 0 ? 0 : Math.PI;
    const length = clamp(Math.min(cellW, cellH) * (0.27 + alignment * 0.22), 8, 22);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const seed = Math.sin((row + 1) * 13.37 + (col + 3) * 9.71);
        const x = col * cellW + cellW * (0.5 + 0.1 * Math.sin(seed * 3));
        const y = row * cellH + cellH * (0.5 + 0.1 * Math.cos(seed * 2));
        const baseAngle = seed * Math.PI;
        const jitter = (1 - alignment) * 0.45 * Math.sin(seed * 7);
        const angle = baseAngle * (1 - alignment) + targetAngle * alignment + jitter;
        const x2 = x + Math.cos(angle) * length;
        const y2 = y + Math.sin(angle) * length;

        ctx.strokeStyle = alignment > 0.6 ? colors.cyan : colors.text;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(angle) * length * 0.45, y - Math.sin(angle) * length * 0.45);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - Math.cos(angle - 0.45) * 5, y2 - Math.sin(angle - 0.45) * 5);
        ctx.lineTo(x2 - Math.cos(angle + 0.45) * 5, y2 - Math.sin(angle + 0.45) * 5);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.fillStyle = colors.text;
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(`alignment ${(alignment * 100).toFixed(0)}%`, 12, rect.height - 12);
    ctx.restore();
    $("domain-h-label").textContent = `H = ${state.lastFrame.toFixed(2)} Hmax`;
  }

  function togglePlayback() {
    state.playing = !state.playing;
    const button = $("play-cycle-btn");
    button.classList.toggle("active", state.playing);
    button.querySelector("span").textContent = state.playing ? "Pause Cycle" : "Play AC Cycle";
    if (state.playing) {
      state.playStartedAt = performance.now();
      animateCycle(state.playStartedAt);
    } else if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
  }

  function animateCycle(now) {
    if (!state.playing) return;
    const cycleMs = 2600;
    const phase = ((now - state.playStartedAt) % cycleMs) / cycleMs;
    const index = Math.round(phase * (state.points.length - 1));
    const point = state.points[index] || state.points[0];
    updateOperatingPoint(point);
    drawDomains(point.H / Math.max(1, state.params.H_max));
    state.animationId = requestAnimationFrame(animateCycle);
  }

  function updateOperatingPoint(point) {
    if (!state.chart) return;
    state.chart.data.datasets[3].data = [{ x: point.H, y: point.B }];
    state.chart.update("none");
  }

  function exportChartImage() {
    const canvas = $("main-chart");
    const link = document.createElement("a");
    link.download = `mag-hyst-${slugify(state.params.materialName)}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Chart image exported.");
  }

  function addSnapshot(sourceType, csvName) {
    const snapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: csvName || state.params.materialName,
      source: sourceType,
      timestamp: new Date().toLocaleTimeString(),
      params: { ...state.params },
      points: sourceType === "CSV" && state.csv ? [...state.csv.points] : [...state.points],
      metrics: sourceType === "CSV" && state.csv ? { ...state.csv.metrics } : { ...state.metrics }
    };
    state.history = [snapshot, ...state.history].slice(0, 30);
    renderHistory();
    showToast("Snapshot captured.");
  }

  function seedReferenceHistory() {
    const references = [MATERIAL_PRESETS[0], presetByKey("alnico_v")].filter(Boolean);
    state.history = references.map((preset) => {
      const params = paramsFromPreset(preset);
      const points = generateSimulationCurve(params);
      return {
        id: `ref-${preset.key}`,
        name: preset.name,
        source: "SIM_MODEL",
        timestamp: "reference",
        params,
        points,
        metrics: calculateMetrics(params, points)
      };
    });
  }

  function renderHistory() {
    const body = $("history-body");
    const badge = $("dataset-badge");
    if (badge) badge.textContent = `${state.history.length} RUNS`;
    if (!state.history.length) {
      body.innerHTML = `<tr><td colspan="6">No snapshots logged.</td></tr>`;
      return;
    }
    body.innerHTML = "";
    state.history.forEach((item) => {
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      tr.innerHTML = `
        <td>${escapeHtml(item.name)}</td>
        <td>${item.source}</td>
        <td>${item.metrics.B_sat.toFixed(2)}</td>
        <td>${item.metrics.B_r.toFixed(2)}</td>
        <td>${formatCompact(item.metrics.H_c)}</td>
        <td>${item.metrics.loopArea.toFixed(1)}</td>
      `;
      tr.addEventListener("click", () => mountSnapshot(item));
      tr.addEventListener("keydown", (event) => {
        if (event.key === "Enter") mountSnapshot(item);
      });
      body.appendChild(tr);
    });
  }

  function mountSnapshot(item) {
    state.params = { ...item.params };
    state.materialKey = CUSTOM_KEY;
    state.csv = item.source === "CSV"
      ? { name: item.name, points: [...item.points], metrics: { ...item.metrics } }
      : null;
    state.isHardScale = state.params.H_c > 1500;
    updateEverything();
    switchView("simulator");
  }

  function exportHistoryCsv() {
    if (!state.history.length) {
      showToast("No snapshots to export.");
      return;
    }
    const header = "Dataset,Source,B_sat_T,B_r_T,H_c_A_per_m,H_max_A_per_m,Frequency_Hz,CoreVolume_cm3,LoopArea_J_m3,TotalLoss_W,Timestamp\n";
    const rows = state.history.map((item) => [
      item.name,
      item.source,
      item.metrics.B_sat,
      item.metrics.B_r,
      item.metrics.H_c,
      item.params.H_max,
      item.params.frequency,
      item.params.coreVolume,
      item.metrics.loopArea,
      item.metrics.totalPowerLoss,
      item.timestamp
    ].map(csvEscape).join(","));
    downloadText("mag_hyst_snapshots.csv", header + rows.join("\n"), "text/csv");
  }

  function handleCsvUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    $("upload-title").textContent = file.name;
    $("csv-status").textContent = "Parsing CSV dataset...";
    reader.onload = () => {
      try {
        const rawPoints = parseCsvText(String(reader.result || ""));
        const analysed = analyzeCsvPoints(rawPoints);
        state.csv = {
          name: file.name,
          points: analysed.points,
          metrics: analysed.metrics
        };
        $("csv-status").textContent = `Mounted ${analysed.points.length} points from ${file.name}.`;
        addSnapshot("CSV", file.name);
        updateEverything();
        switchView("simulator");
      } catch (error) {
        $("csv-status").textContent = error.message || "CSV parsing failed.";
        showToast(error.message || "CSV parsing failed.");
      }
    };
    reader.onerror = () => showToast("Could not read the selected file.");
    reader.readAsText(file);
  }

  function clearCsvOverlay() {
    state.csv = null;
    $("csv-upload").value = "";
    $("upload-title").textContent = "Choose H-B CSV file";
    $("csv-status").textContent = "No uploaded dataset mounted.";
    updateEverything();
  }

  function parseCsvText(text) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error("CSV must contain at least two rows.");
    const delimiter = detectDelimiter(lines[0]);
    const first = splitCsvLine(lines[0], delimiter);
    const hasHeader = first.some((cell) => /[a-zA-Z]/.test(cell));
    let hIndex = 0;
    let bIndex = 1;
    let start = 0;

    if (hasHeader) {
      const headers = first.map((cell) => cell.toLowerCase().replace(/[^a-z0-9]/g, ""));
      hIndex = headers.findIndex((cell) => ["h", "field", "magneticfield", "haper", "haperm", "hamperepermeter", "haperme"].includes(cell) || cell.includes("field"));
      bIndex = headers.findIndex((cell) => ["b", "flux", "fluxdensity", "btesla", "induction"].includes(cell) || cell.includes("flux"));
      if (hIndex < 0) hIndex = 0;
      if (bIndex < 0) bIndex = hIndex === 0 ? 1 : 0;
      start = 1;
    }

    const points = [];
    for (let i = start; i < lines.length; i += 1) {
      const cols = splitCsvLine(lines[i], delimiter);
      const H = Number(cols[hIndex]);
      const B = Number(cols[bIndex]);
      if (Number.isFinite(H) && Number.isFinite(B)) points.push({ H, B });
    }
    if (points.length < 3) throw new Error("CSV needs at least three numeric H-B points.");
    return points;
  }

  function detectDelimiter(line) {
    const candidates = [",", ";", "\t"];
    return candidates.sort((a, b) => line.split(b).length - line.split(a).length)[0];
  }

  function splitCsvLine(line, delimiter) {
    return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
  }

  function analyzeCsvPoints(rawPoints) {
    const points = rawPoints.map((point, index) => ({
      H: point.H,
      B: point.B,
      branch: "custom",
      theta: index
    }));
    const first = points[0];
    const last = points[points.length - 1];
    const distance = Math.hypot(last.H - first.H, last.B - first.B);
    if (distance > 1e-5) points.push({ ...first, theta: points.length });

    for (let i = 0; i < points.length - 1; i += 1) {
      points[i].branch = points[i + 1].H - points[i].H >= 0 ? "up" : "down";
    }

    let loopArea = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      loopArea += 0.5 * (points[i].B + points[i + 1].B) * (points[i + 1].H - points[i].H);
    }
    loopArea = Math.abs(loopArea);

    const maxB = Math.max(...points.map((point) => Math.abs(point.B)));
    const maxH = Math.max(...points.map((point) => Math.abs(point.H)));
    const hCrossings = [];
    const bCrossings = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      if (a.B === 0 || a.B * b.B < 0) {
        const t = Math.abs(a.B) / (Math.abs(a.B) + Math.abs(b.B) || 1);
        hCrossings.push(Math.abs(a.H + t * (b.H - a.H)));
      }
      if (a.H === 0 || a.H * b.H < 0) {
        const t = Math.abs(a.H) / (Math.abs(a.H) + Math.abs(b.H) || 1);
        bCrossings.push(Math.abs(a.B + t * (b.B - a.B)));
      }
    }
    const H_c = hCrossings.length ? average(hCrossings) : maxH * 0.1;
    const B_r = bCrossings.length ? average(bCrossings) : maxB * 0.7;
    const powerLoss = loopArea * Math.max(0, state.params.frequency || 50);
    const totalPowerLoss = powerLoss * Math.max(1, state.params.coreVolume || 100) * 1e-6;
    return {
      points,
      metrics: {
        B_sat: maxB,
        B_r,
        H_c,
        loopArea,
        powerLoss,
        totalPowerLoss
      }
    };
  }

  function seedTrainingRows() {
    const preset = activePreset() || MATERIAL_PRESETS[0];
    const seeds = [
      [50, 0.55],
      [200, 0.75],
      [1000, 0.9],
      [5000, 0.6],
      [10000, 0.45]
    ];
    state.trainingData = seeds.map(([frequency, bFraction], index) => {
      const bPeak = Math.max(0.02, preset.B_sat * bFraction);
      const steinmetz = preset.k * (frequency ** preset.alpha) * (bPeak ** preset.beta);
      const separated = preset.k_e * (frequency ** 2) * (bPeak ** 2) + preset.k_ex * (frequency ** 1.5) * (bPeak ** 1.5);
      return {
        f: frequency,
        b: Number(bPeak.toFixed(3)),
        p: Number(((steinmetz + separated) * (1 + index * 0.015)).toFixed(2))
      };
    });
  }

  function renderFitTable() {
    const body = $("fit-table-body");
    body.innerHTML = "";
    state.trainingData.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${formatCompact(row.f)} Hz</td>
        <td>${row.b.toFixed(3)} T</td>
        <td>${row.p.toFixed(2)} W/m3</td>
        <td><button class="text-button" data-fit-index="${index}" type="button">Delete</button></td>
      `;
      body.appendChild(tr);
    });
    body.querySelectorAll("[data-fit-index]").forEach((button) => {
      button.addEventListener("click", () => {
        state.trainingData.splice(Number(button.dataset.fitIndex), 1);
        renderFitTable();
      });
    });
  }

  function addFitRow() {
    const row = {
      f: Number($("fit-f").value),
      b: Number($("fit-b").value),
      p: Number($("fit-p").value)
    };
    if (!row.f || !row.b || !row.p || row.f <= 0 || row.b <= 0 || row.p <= 0) {
      showToast("Fit rows require positive frequency, B_peak, and loss values.");
      return;
    }
    state.trainingData.push(row);
    renderFitTable();
  }

  async function runFit() {
    if (state.trainingData.length < 3) {
      showToast("At least three rows are required for Steinmetz fitting.");
      return;
    }

    $("fit-status").textContent = "Running regression...";
    let coeffs = null;
    if (state.apiOnline) {
      try {
        const res = await fetch(`${API_BASE}/fit/steinmetz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data_points: state.trainingData.map((row) => ({
              frequency: row.f,
              b_peak: row.b,
              p_loss: row.p
            }))
          })
        });
        if (!res.ok) throw new Error("Backend fit failed.");
        const data = await res.json();
        coeffs = { k: data.k, alpha: data.alpha, beta: data.beta, source: "Scikit-Learn backend" };
      } catch (error) {
        coeffs = { ...fitOffline(state.trainingData), source: "offline ridge fallback" };
      }
    } else {
      coeffs = { ...fitOffline(state.trainingData), source: "offline ridge regression" };
    }

    $("fit-k").textContent = coeffs.k.toExponential(4);
    $("fit-alpha").textContent = coeffs.alpha.toFixed(4);
    $("fit-beta").textContent = coeffs.beta.toFixed(4);
    $("fit-status").textContent = `Fit complete using ${coeffs.source}.`;
  }

  function fitOffline(rows) {
    const lambda = 1e-3;
    const A = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    const y = [0, 0, 0];
    rows.forEach((row) => {
      const x = [1, Math.log(row.f), Math.log(row.b)];
      const target = Math.log(row.p);
      for (let i = 0; i < 3; i += 1) {
        y[i] += x[i] * target;
        for (let j = 0; j < 3; j += 1) A[i][j] += x[i] * x[j];
      }
    });
    A[1][1] += lambda;
    A[2][2] += lambda;
    const coeff = solveLinear3(A, y);
    return { k: Math.exp(coeff[0]), alpha: coeff[1], beta: coeff[2] };
  }

  function solveLinear3(A, b) {
    const m = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < 3; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < 3; row += 1) {
        if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
      }
      if (Math.abs(m[pivot][col]) < 1e-12) throw new Error("Regression matrix is singular.");
      [m[col], m[pivot]] = [m[pivot], m[col]];
      const divisor = m[col][col];
      for (let c = col; c < 4; c += 1) m[col][c] /= divisor;
      for (let row = 0; row < 3; row += 1) {
        if (row === col) continue;
        const factor = m[row][col];
        for (let c = col; c < 4; c += 1) m[row][c] -= factor * m[col][c];
      }
    }
    return [m[0][3], m[1][3], m[2][3]];
  }

  async function checkHealth() {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 1200);
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      state.apiOnline = res.ok;
    } catch (error) {
      state.apiOnline = false;
    } finally {
      window.clearTimeout(timeoutId);
      updateApiStatus();
    }
  }

  function updateApiStatus() {
    const text = state.apiOnline ? "ACTIVE_8000" : "LOCAL";
    const apiSidebar = $("api-status-sidebar");
    if (apiSidebar) apiSidebar.textContent = text;
    const mobile = $("api-status-mobile");
    mobile.querySelector("span:last-child").textContent = state.apiOnline ? "ONLINE" : "LOCAL";
    const dot = mobile.querySelector(".status-dot");
    dot.classList.toggle("online", state.apiOnline);
    dot.classList.toggle("offline", !state.apiOnline);
  }

  function generatePythonScript() {
    const p = state.params;
    const safeBr = Math.min(p.B_r, p.B_sat * 0.98);
    return `import numpy as np
import matplotlib.pyplot as plt

# MAG-HYST Labs exported hysteresis model
B_sat = ${p.B_sat}
H_c = ${p.H_c}
B_r = ${safeBr}
H_max = ${p.H_max}
frequency = ${p.frequency}
core_volume_cm3 = ${p.coreVolume}

def artanh(x):
    x = np.clip(x, -0.9999, 0.9999)
    return 0.5 * np.log((1 + x) / (1 - x))

a_dc = H_c / max(artanh(B_r / B_sat), 1e-9)
dynamic_gain = 1 + 0.045 * np.sqrt(max(frequency, 0))
H_c_eff = H_c * dynamic_gain
a_eff = a_dc * dynamic_gain
mu_rev = (B_sat * 0.05) / max(H_max, 1e-9)
B_sat_ferro = B_sat * 0.95

theta = np.linspace(0, 2 * np.pi, 361)
H = H_max * np.sin(theta)
delay = H_c_eff * np.cos(theta)
B = B_sat_ferro * np.tanh((H - delay) / a_eff) + mu_rev * H

loop_area = abs(np.sum(0.5 * (B[:-1] + B[1:]) * (H[1:] - H[:-1])))
power_loss_density = loop_area * frequency
total_power_loss = power_loss_density * core_volume_cm3 * 1e-6

print(f"Loop area: {loop_area:.3f} J/m3")
print(f"Power loss density: {power_loss_density:.3f} W/m3")
print(f"Total core loss: {total_power_loss:.6f} W")

plt.figure(figsize=(8, 6))
plt.plot(H, B, color="#00a6b4", linewidth=2.5, label="${p.materialName.replace(/"/g, "'")}")
plt.axhline(0, color="#777", linewidth=0.8)
plt.axvline(0, color="#777", linewidth=0.8)
plt.scatter([0, 0], [B_r, -B_r], color="#d03592", label="Remanence Br")
plt.scatter([H_c_eff, -H_c_eff], [0, 0], color="#eab308", label="Dynamic coercivity")
plt.xlabel("Magnetic field H (A/m)")
plt.ylabel("Flux density B (T)")
plt.title("MAG-HYST B-H Hysteresis Loop")
plt.grid(True, linestyle=":", alpha=0.45)
plt.legend()
plt.tight_layout()
plt.show()
`;
  }

  function updatePythonScript() {
    $("python-code").textContent = generatePythonScript();
  }

  async function copyPythonScript() {
    const code = generatePythonScript();
    try {
      await navigator.clipboard.writeText(code);
      showToast("Python script copied.");
    } catch (error) {
      showToast("Clipboard access was blocked.");
    }
  }

  function downloadPythonScript() {
    downloadText(`mag_hyst_${slugify(state.params.materialName)}.py`, generatePythonScript(), "text/plain");
  }

  function drawFallbackChart() {
    const canvas = $("main-chart");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, rect.height * dpr);
    const ctx = canvas.getContext("2d");
    const colors = getChartColors();
    const bounds = getBounds();
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, rect.width, rect.height);
    const pad = 46;
    const mapX = (H) => pad + ((H + bounds.h) / (2 * bounds.h)) * (rect.width - pad * 1.5);
    const mapY = (B) => rect.height - pad - ((B + bounds.b) / (2 * bounds.b)) * (rect.height - pad * 1.5);
    ctx.strokeStyle = colors.axis;
    ctx.beginPath();
    ctx.moveTo(pad, mapY(0));
    ctx.lineTo(rect.width - pad * 0.5, mapY(0));
    ctx.moveTo(mapX(0), pad * 0.5);
    ctx.lineTo(mapX(0), rect.height - pad);
    ctx.stroke();
    ctx.strokeStyle = colors.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(mapX(point.H), mapY(point.B));
      else ctx.lineTo(mapX(point.H), mapY(point.B));
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawFallbackBreakdown(values) {
    const canvas = $("breakdown-chart");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, rect.height * dpr);
    const ctx = canvas.getContext("2d");
    const colors = getChartColors();
    const entries = [
      ["Hysteresis", values.hysteresis, colors.cyan],
      ["Eddy", values.eddy, colors.magenta],
      ["Excess", values.excess, colors.amber]
    ];
    const max = Math.max(...entries.map((entry) => entry[1]), 1e-9);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, rect.width, rect.height);
    entries.forEach(([label, value, color], index) => {
      const y = 28 + index * 54;
      const width = (rect.width - 120) * (value / max);
      ctx.fillStyle = color;
      ctx.fillRect(96, y, Math.max(2, width), 22);
      ctx.fillStyle = colors.text;
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(label, 8, y + 15);
    });
    ctx.restore();
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => toast.classList.remove("visible"), 2600);
  }

  function downloadText(filename, text, mimeType) {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function csvEscape(value) {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function slugify(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "material";
  }

  function formatCompact(value) {
    const abs = Math.abs(Number(value));
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 1000) return `${(value / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    if (abs > 0 && abs < 1) return Number(value).toFixed(2);
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  function formatAxis(value) {
    const numeric = Number(value);
    if (Math.abs(numeric) >= 1000) return `${numeric / 1000}k`;
    return numeric;
  }

  function withAlpha(color, alpha) {
    const trimmed = color.trim();
    if (trimmed.startsWith("#")) {
      const hex = trimmed.slice(1);
      const full = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return trimmed;
  }

  async function loadViewsAndInit() {
    const views = document.querySelectorAll(".view[data-src]");
    const promises = Array.from(views).map(async (view) => {
      const src = view.getAttribute("data-src");
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Failed to load ${src}`);
        view.innerHTML = await response.text();
      } catch (err) {
        console.error(err);
        view.innerHTML = `<div class="error-panel" style="padding: 20px; color: var(--danger);">Error loading view content.</div>`;
      }
    });
    await Promise.all(promises);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        init();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", loadViewsAndInit);
})();
