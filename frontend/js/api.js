/**
 * api.js
 * ──────
 * Centralised HTTP client for the Hysteresis Simulation FastAPI backend.
 * All fetch calls are funnelled through this module to ensure consistent
 * error handling, base-URL management, and request/response logging.
 */

const API_BASE = "http://127.0.0.1:8000/api/v1";

/**
 * Generic fetch wrapper.
 * @param {string} path       - Endpoint path relative to API_BASE.
 * @param {RequestInit} init  - Optional fetch init options.
 * @returns {Promise<any>}    - Parsed JSON response body.
 */
async function apiFetch(path, init = {}) {
  const url = `${API_BASE}${path}`;
  const defaults = {
    headers: { "Content-Type": "application/json" },
  };
  const config = { ...defaults, ...init };
  if (init.headers) {
    config.headers = { ...defaults.headers, ...init.headers };
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail ?? `HTTP ${response.status}`);
  }
  return response.json();
}

// ── Public API functions ───────────────────────────────────────────────────────

/**
 * Liveness check — returns true if the API is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    const data = await apiFetch("/health");
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Run Steinmetz core loss simulation.
 * @param {{ k: number, f: number, b_peak: number, alpha: number, beta: number }} params
 * @returns {Promise<object>}
 */
export async function simulateSteinmetz(params) {
  return apiFetch("/simulate/steinmetz", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Run Bertotti loss-separation simulation.
 * @param {{ k_h: number, k_e: number, k_ex: number, f: number, b_peak: number, n: number }} params
 * @returns {Promise<object>}
 */
export async function simulateBertotti(params) {
  return apiFetch("/simulate/bertotti", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Analyse a BH curve.
 * @param {{ h_values: number[], b_values: number[], material_name: string }} params
 * @returns {Promise<object>}
 */
export async function analyseBHCurve(params) {
  return apiFetch("/analyse/bh-curve", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Generate a hysteresis loop.
 * @param {{ h_max: number, b_sat: number, coercivity_h: number, remanence_b: number, n_points: number }} params
 * @returns {Promise<object>}
 */
export async function generateHysteresisLoop(params) {
  return apiFetch("/analyse/hysteresis-loop", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Upload a BH CSV file for parsing and analysis.
 * @param {File} file
 * @param {string} materialName
 * @param {number} frequencyHz
 * @returns {Promise<object>}
 */
export async function uploadBHCsv(file, materialName = "Uploaded Material", frequencyHz = 50) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch(
    `/upload/bh-csv?material_name=${encodeURIComponent(materialName)}&frequency_hz=${frequencyHz}`,
    {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set multipart boundary
    }
  );
}
