"""
utils/formulas.py
─────────────────
Pure-function mathematical library for hysteresis and core saturation
calculations. All functions are side-effect free and NumPy-vectorised
so they can be called from ML pipelines, API endpoints, or unit tests
without modification.
"""
from __future__ import annotations
import numpy as np
from numpy.typing import NDArray

# --- Steinmetz Core-Loss Equation ---
def steinmetz_core_loss(
    k: float,
    f: float,
    b_peak: float,
    alpha: float = 1.7,
    beta: float = 2.0,
) -> float:
    if f <= 0:
        raise ValueError(f"Frequency must be positive; received f={f}")
    if b_peak <= 0:
        raise ValueError(f"Peak flux density must be positive; received b_peak={b_peak}")
    if k <= 0:
        raise ValueError(f"Steinmetz coefficient k must be positive; received k={k}")
    return k * (f ** alpha) * (b_peak ** beta)

# --- Hysteresis Loss (Bertotti Separation) ---
def hysteresis_loss(k_h: float, f: float, b_peak: float, n: float = 2.0) -> float:
    if f <= 0 or b_peak <= 0 or k_h <= 0:
        return 0.0
    return k_h * f * (b_peak ** n)

def eddy_current_loss(k_e: float, f: float, b_peak: float) -> float:
    if f <= 0 or b_peak <= 0 or k_e <= 0:
        return 0.0
    return k_e * (f ** 2) * (b_peak ** 2)

def excess_loss(k_ex: float, f: float, b_peak: float) -> float:
    if f <= 0 or b_peak <= 0 or k_ex <= 0:
        return 0.0
    return k_ex * (f ** 1.5) * (b_peak ** 1.5)

def total_bertotti_loss(
    k_h: float,
    k_e: float,
    k_ex: float,
    f: float,
    b_peak: float,
    n: float = 2.0,
) -> dict[str, float]:
    w_hys  = hysteresis_loss(k_h, f, b_peak, n)
    w_eddy = eddy_current_loss(k_e, f, b_peak)
    w_ex   = excess_loss(k_ex, f, b_peak)
    return {
        "hysteresis_loss_W_m3": w_hys,
        "eddy_current_loss_W_m3": w_eddy,
        "excess_loss_W_m3": w_ex,
        "total_loss_W_m3": w_hys + w_eddy + w_ex,
    }

# --- B-H Curve & Saturation ---
def langevin_magnetisation(
    h: NDArray[np.float64],
    b_sat: float,
    a: float,
) -> NDArray[np.float64]:
    """
    Modified Langevin function for initial magnetisation curve:
    B(H) = B_sat * (coth(H/a) - a/H)
    """
    h = np.asarray(h, dtype=np.float64)
    # Avoid division-by-zero at H=0
    safe_h = np.where(np.abs(h) < 1e-8, 1e-8, h)
    x = safe_h / a
    # coth(x) = 1/tanh(x)
    x_clipped = np.clip(x, -100, 100)
    coth = 1.0 / np.tanh(x_clipped)
    # for very small x, coth(x) - 1/x is approximately x/3
    langevin = np.where(np.abs(x) < 1e-4, x / 3.0, coth - 1.0 / x)
    return b_sat * langevin

def froehlich_kennelly_magnetisation(
    h: NDArray[np.float64],
    b_sat: float,
    a: float,
) -> NDArray[np.float64]:
    """
    Fröhlich-Kennelly relation for initial magnetisation curve:
    B(H) = (H * B_sat) / (a + H)
    """
    h = np.asarray(h, dtype=np.float64)
    return (h * b_sat) / (a + h + 1e-12)

def find_saturation_knee_point(
    h_array: NDArray[np.float64],
    b_array: NDArray[np.float64],
) -> dict[str, float]:
    h = np.asarray(h_array, dtype=np.float64)
    b = np.asarray(b_array, dtype=np.float64)

    if len(h) != len(b):
        raise ValueError("h_array and b_array must have the same length.")
    if len(h) < 3:
        raise ValueError("At least 3 data points required for knee detection.")

    # Normalise to [0,1] for numerically stable curvature
    h_min, h_max = h.min(), h.max()
    b_min, b_max = b.min(), b.max()
    
    h_range = h_max - h_min if h_max > h_min else 1.0
    b_range = b_max - b_min if b_max > b_min else 1.0

    h_n = (h - h_min) / h_range
    b_n = (b - b_min) / b_range

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

    knee_idx = int(np.argmax(curvatures)) + 1
    return {
        "knee_index": knee_idx,
        "knee_H_A_per_m": float(h[knee_idx]),
        "knee_B_Tesla": float(b[knee_idx]),
        "max_curvature": float(curvatures[knee_idx - 1]),
    }

def classify_operating_region(h: float, knee_h: float) -> str:
    if h < 0.7 * knee_h:
        return "Normal (Linear / Elastic)"
    elif h <= 1.3 * knee_h:
        return "Approaching Saturation (Knee Region)"
    else:
        return "Saturated (Coercive Limit)"

# --- Hysteresis Loop Generation ---
def generate_hysteresis_loop(
    h_max: float,
    b_sat: float,
    coercivity_h: float,
    remanence_b: float,
    n_points: int = 200,
) -> dict[str, list[float]]:
    """
    Generates a realistic symmetric hysteresis loop with closed upper/lower branches.
    Uses an arctanh/sigmoid formulation with dynamic minor loop scaling.
    As h_max varies, the loop area and peak values scale dynamically.
    """
    h = np.linspace(-h_max, h_max, n_points)
    
    # Dynamic minor loop scaling
    # 1. Peak induction scales based on peak applied field relative to coercivity
    b_pk = b_sat * np.tanh(h_max / (coercivity_h * 1.5 + 1e-12))
    
    # 2. Scale effective remanence and coercivity based on peak field
    ratio_pk_sat = b_pk / b_sat if b_sat > 0 else 0.0
    remanence_eff = remanence_b * ratio_pk_sat
    coercivity_eff = coercivity_h * np.tanh(h_max / (coercivity_h + 1e-12))
    
    # 3. Handle physical limits
    remanence_eff = min(remanence_eff, b_pk * 0.999)
    if remanence_eff <= 0:
        remanence_eff = b_pk * 0.5
        
    ratio = min(remanence_eff / (b_pk + 1e-12), 0.999)
    s = coercivity_eff / np.arctanh(ratio)
    
    if s <= 0:
        s = coercivity_eff if coercivity_eff > 0 else 1.0

    b_upper = b_pk * np.tanh((h + coercivity_eff) / s)
    b_lower = b_pk * np.tanh((h - coercivity_eff) / s)

    return {
        "h": h.tolist(),
        "b_upper": b_upper.tolist(),
        "b_lower": b_lower.tolist(),
    }

def calculate_loop_area(h: list[float], b_upper: list[float], b_lower: list[float]) -> float:
    h_arr = np.array(h)
    bu = np.array(b_upper)
    bl = np.array(b_lower)
    
    idx = np.argsort(h_arr)
    h_sorted = h_arr[idx]
    bu_sorted = bu[idx]
    bl_sorted = bl[idx]
    
    # Loop Area = \int (B_upper - B_lower) dH
    area = np.trapz(bu_sorted - bl_sorted, h_sorted)
    return float(abs(area))
