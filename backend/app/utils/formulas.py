"""
utils/formulas.py
─────────────────
Pure-function mathematical library for hysteresis and core saturation
calculations.  All functions are side-effect free and NumPy-vectorised
so they can be called from ML pipelines, API endpoints, or unit tests
without modification.
"""
from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


# ─── Steinmetz Core-Loss Equation ─────────────────────────────────────────────

def steinmetz_core_loss(
    k: float,
    f: float,
    b_peak: float,
    alpha: float = 1.7,
    beta: float = 2.0,
) -> float:
    """
    Generalised Steinmetz equation:  P_core = k · f^α · B_peak^β

    Parameters
    ----------
    k       : Steinmetz coefficient (material-specific, W/m³)
    f       : Excitation frequency (Hz)
    b_peak  : Peak flux density (T)
    alpha   : Frequency exponent  (default 1.7 for silicon steel)
    beta    : Flux-density exponent (default 2.0 for silicon steel)

    Returns
    -------
    Core loss in W/m³.
    """
    if f <= 0:
        raise ValueError(f"Frequency must be positive; received f={f}")
    if b_peak <= 0:
        raise ValueError(f"Peak flux density must be positive; received b_peak={b_peak}")
    return k * (f ** alpha) * (b_peak ** beta)


# ─── Hysteresis Loss (Bertotti Separation) ────────────────────────────────────

def hysteresis_loss(
    k_h: float,
    f: float,
    b_peak: float,
    n: float = 2.0,
) -> float:
    """
    Hysteresis component of Bertotti's loss-separation model:
        W_hys = k_h · f · B_peak^n

    Parameters
    ----------
    k_h   : Hysteresis loss coefficient
    f     : Frequency (Hz)
    b_peak: Peak flux density (T)
    n     : Steinmetz exponent (default 2.0)

    Returns
    -------
    Hysteresis loss density in W/m³.
    """
    return k_h * f * (b_peak ** n)


def eddy_current_loss(k_e: float, f: float, b_peak: float) -> float:
    """
    Classical eddy-current loss:  W_eddy = k_e · f² · B_peak²

    Parameters
    ----------
    k_e   : Eddy-current loss coefficient
    f     : Frequency (Hz)
    b_peak: Peak flux density (T)
    """
    return k_e * (f ** 2) * (b_peak ** 2)


def excess_loss(k_ex: float, f: float, b_peak: float) -> float:
    """
    Excess (anomalous) loss term:  W_ex = k_ex · f^1.5 · B_peak^1.5
    """
    return k_ex * (f ** 1.5) * (b_peak ** 1.5)


def total_bertotti_loss(
    k_h: float,
    k_e: float,
    k_ex: float,
    f: float,
    b_peak: float,
    n: float = 2.0,
) -> dict[str, float]:
    """
    Full Bertotti loss-separation model.

    Returns a dictionary with individual components and the total.
    """
    w_hys  = hysteresis_loss(k_h, f, b_peak, n)
    w_eddy = eddy_current_loss(k_e, f, b_peak)
    w_ex   = excess_loss(k_ex, f, b_peak)
    return {
        "hysteresis_loss_W_m3": w_hys,
        "eddy_current_loss_W_m3": w_eddy,
        "excess_loss_W_m3": w_ex,
        "total_loss_W_m3": w_hys + w_eddy + w_ex,
    }


# ─── B-H Curve & Saturation ───────────────────────────────────────────────────

def langevin_magnetisation(
    h: NDArray[np.float64],
    m_sat: float,
    a: float,
) -> NDArray[np.float64]:
    """
    Modified Langevin function for B-H curve modelling:
        M(H) = M_sat · [ coth(H/a) - a/H ]

    Parameters
    ----------
    h     : Applied field intensity array (A/m)
    m_sat : Saturation magnetisation (A/m)
    a     : Shape parameter (A/m)

    Returns
    -------
    Magnetisation array (A/m).
    """
    h = np.asarray(h, dtype=np.float64)
    # Avoid division-by-zero at H=0
    safe_h = np.where(np.abs(h) < 1e-10, 1e-10, h)
    x = safe_h / a
    return m_sat * (1.0 / np.tanh(x) - 1.0 / x)


def find_saturation_knee_point(
    h_array: NDArray[np.float64],
    b_array: NDArray[np.float64],
) -> dict[str, float]:
    """
    Detect the magnetic saturation knee point using the maximum-curvature
    method (Menger curvature on successive triplets).

    Parameters
    ----------
    h_array : Monotonically increasing H field values (A/m)
    b_array : Corresponding B flux densities (T)

    Returns
    -------
    Dictionary with knee H (A/m), knee B (T), and its array index.
    """
    h = np.asarray(h_array, dtype=np.float64)
    b = np.asarray(b_array, dtype=np.float64)

    if len(h) != len(b):
        raise ValueError("h_array and b_array must have the same length.")
    if len(h) < 3:
        raise ValueError("At least 3 data points required for knee detection.")

    # Normalise to [0,1] for numerically stable curvature
    h_n = (h - h.min()) / (h.max() - h.min() + 1e-12)
    b_n = (b - b.min()) / (b.max() - b.min() + 1e-12)

    curvatures = np.zeros(len(h_n) - 2)
    for i in range(1, len(h_n) - 1):
        x1, y1 = h_n[i - 1], b_n[i - 1]
        x2, y2 = h_n[i],     b_n[i]
        x3, y3 = h_n[i + 1], b_n[i + 1]
        # Menger curvature
        num = abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1))
        den = np.sqrt(
            ((x2 - x1) ** 2 + (y2 - y1) ** 2)
            * ((x3 - x1) ** 2 + (y3 - y1) ** 2)
            * ((x3 - x2) ** 2 + (y3 - y2) ** 2)
            + 1e-12
        )
        curvatures[i - 1] = num / den

    knee_idx = int(np.argmax(curvatures)) + 1   # offset for the triplet window
    return {
        "knee_index": knee_idx,
        "knee_H_A_per_m": float(h[knee_idx]),
        "knee_B_Tesla": float(b[knee_idx]),
        "max_curvature": float(curvatures[knee_idx - 1]),
    }


# ─── Hysteresis Loop Generation ───────────────────────────────────────────────

def generate_hysteresis_loop(
    h_max: float,
    b_sat: float,
    coercivity_h: float,
    remanence_b: float,
    n_points: int = 200,
) -> dict[str, list[float]]:
    """
    Generate a symmetric hysteresis loop (B-H loop) using a parameterised
    sigmoid model.  Returns upper and lower branches for Chart.js rendering.

    Parameters
    ----------
    h_max        : Maximum applied field (A/m)
    b_sat        : Saturation flux density (T)
    coercivity_h : Coercive field Hc (A/m)
    remanence_b  : Remanent flux density Br (T)
    n_points     : Points per branch (default 200)

    Returns
    -------
    {"h": [...], "b_upper": [...], "b_lower": [...]}
    """
    h = np.linspace(-h_max, h_max, n_points)

    def _sigmoid_branch(h_vals: NDArray, shift: float, scale: float) -> NDArray:
        return b_sat * np.tanh((h_vals - shift) / scale)

    # Calibrate scale from coercivity so B(Hc)=0 on upper branch
    scale = coercivity_h / np.arctanh(remanence_b / b_sat + 1e-12)
    scale = abs(scale) if abs(scale) > 0.01 else 1.0

    b_upper = _sigmoid_branch(h, shift=-coercivity_h, scale=scale)
    b_lower = _sigmoid_branch(h, shift=+coercivity_h, scale=scale)

    return {
        "h": h.tolist(),
        "b_upper": b_upper.tolist(),
        "b_lower": b_lower.tolist(),
    }
