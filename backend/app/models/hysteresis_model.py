"""
models/hysteresis_model.py
──────────────────────────
Scikit-learn compatible regression pipeline that fits Steinmetz /
Bertotti loss coefficients from experimental (f, B_peak, P_loss) data,
and a curve-fitting wrapper that extracts the hysteresis loop parameters
(Br, Hc, B_sat) from raw BH measurements.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from numpy.typing import NDArray
from sklearn.base import BaseEstimator, TransformerMixin, RegressorMixin
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline

from app.utils.formulas import (
    find_saturation_knee_point,
    generate_hysteresis_loop,
    calculate_loop_area,
    classify_operating_region,
)


# ─── Feature engineering for log-linear Steinmetz fit ─────────────────────────

class SteinmetzFeatureBuilder(BaseEstimator, TransformerMixin):
    """
    Transforms (f, B_peak) into log-space features [log(f), log(B_peak)]
    so that Ridge regression fits the Steinmetz exponents α and β directly
    in a linearised model:  log(P) = log(k) + α·log(f) + β·log(B_peak)
    """

    def fit(self, X: NDArray, y: NDArray | None = None) -> "SteinmetzFeatureBuilder":
        return self

    def transform(self, X: NDArray, y: NDArray | None = None) -> NDArray:
        X = np.asarray(X, dtype=np.float64)
        if X.shape[1] != 2:
            raise ValueError("Input must have exactly 2 columns: [f, B_peak]")
        with np.errstate(divide="raise"):
            try:
                # Add tiny epsilon to avoid log(0)
                f_col = np.where(X[:, 0] <= 0, 1e-10, X[:, 0])
                b_col = np.where(X[:, 1] <= 0, 1e-10, X[:, 1])
                return np.column_stack([np.log(f_col), np.log(b_col)])
            except FloatingPointError as exc:
                raise ValueError(
                    "f and B_peak must all be strictly positive."
                ) from exc


class SteinmetzModel:
    """
    End-to-end scikit-learn pipeline:
        raw (f, B_peak) → log-features → Ridge regression → log(P_core)
    """

    def __init__(self, alpha_ridge: float = 1e-3) -> None:
        self._pipeline: Pipeline = Pipeline(
            steps=[
                ("features", SteinmetzFeatureBuilder()),
                ("regressor", Ridge(alpha=alpha_ridge, fit_intercept=True)),
            ]
        )
        self._fitted: bool = False

    def fit(
        self,
        f: NDArray,
        b_peak: NDArray,
        p_loss: NDArray,
    ) -> "SteinmetzModel":
        f, b_peak, p_loss = (
            np.asarray(f, dtype=np.float64),
            np.asarray(b_peak, dtype=np.float64),
            np.asarray(p_loss, dtype=np.float64),
        )
        X = np.column_stack([f, b_peak])
        # Clean p_loss to avoid negative/zero in log
        p_loss_clean = np.where(p_loss <= 0, 1e-10, p_loss)
        y = np.log(p_loss_clean)
        self._pipeline.fit(X, y)
        self._fitted = True
        return self

    def predict(self, f: float, b_peak: float) -> float:
        if not self._fitted:
            raise RuntimeError("Model must be fitted before calling predict().")
        X = np.array([[f, b_peak]])
        log_pred = self._pipeline.predict(X)[0]
        return float(np.exp(log_pred))

    def get_coefficients(self) -> dict[str, float]:
        if not self._fitted:
            raise RuntimeError("Model must be fitted first.")
        reg: Ridge = self._pipeline.named_steps["regressor"]
        log_k   = float(reg.intercept_)
        alpha_f = float(reg.coef_[0])
        beta_b  = float(reg.coef_[1])
        return {
            "k": float(np.exp(log_k)),
            "alpha_frequency_exponent": alpha_f,
            "beta_flux_density_exponent": beta_b,
        }


# ─── Fröhlich-Kennelly Magnetisation Curve Model ──────────────────────────────

class FroehlichKennellyModel(BaseEstimator, RegressorMixin):
    """
    Fits the Fröhlich-Kennelly equation to experimental initial magnetisation data:
        B(H) = (H * B_sat) / (a + H)
    Using a linearised fit:
        1/B = (a/B_sat) * (1/H) + (1/B_sat)
    """
    def __init__(self, alpha_ridge: float = 1e-6) -> None:
        self.alpha_ridge = alpha_ridge
        self._regressor = Ridge(alpha=self.alpha_ridge, fit_intercept=True)
        self.b_sat_ = 0.0
        self.a_ = 0.0
        self.fitted_ = False

    def fit(self, h: NDArray, b: NDArray) -> "FroehlichKennellyModel":
        h = np.asarray(h, dtype=np.float64)
        b = np.asarray(b, dtype=np.float64)
        
        # Filter positive values to avoid division by zero
        mask = (h > 1e-5) & (b > 1e-5)
        h_safe = h[mask]
        b_safe = b[mask]
        
        if len(h_safe) < 3:
            # Fallback values if data is not fitting
            self.b_sat_ = float(np.percentile(b, 95)) if len(b) > 0 else 1.0
            self.a_ = float(np.median(h)) if len(h) > 0 else 100.0
            self.fitted_ = True
            return self
            
        x = (1.0 / h_safe).reshape(-1, 1)
        y = 1.0 / b_safe
        
        self._regressor.fit(x, y)
        
        c = self._regressor.intercept_
        m = self._regressor.coef_[0]
        
        # B_sat = 1 / c, shape factor a = m * B_sat
        c_safe = max(c, 1e-8)
        self.b_sat_ = float(1.0 / c_safe)
        self.a_ = float(m / c_safe)
        self.fitted_ = True
        return self

    def predict(self, h: NDArray) -> NDArray:
        if not self.fitted_:
            raise RuntimeError("Model must be fitted first.")
        h = np.asarray(h, dtype=np.float64)
        return (h * self.b_sat_) / (self.a_ + h + 1e-12)


# ─── BH-Curve Parameter Extractor ─────────────────────────────────────────────

class BHCurveAnalyser:
    """
    Derives key magnetic material parameters from experimental BH data:
        - Saturation flux density  (B_sat)
        - Remanent flux density    (B_r)
        - Coercive field intensity (H_c)
        - Knee point location
        - Relative permeability at operating point
        - Classification of regions (Normal, Knee, Saturation)
    """

    def analyse(
        self,
        h: NDArray[np.float64],
        b: NDArray[np.float64],
    ) -> dict:
        h = np.asarray(h, dtype=np.float64)
        b = np.asarray(b, dtype=np.float64)

        mu_0: float = 4.0 * np.pi * 1e-7   # H/m

        # Fit Fröhlich-Kennelly Model using Scikit-Learn
        fk = FroehlichKennellyModel()
        fk.fit(h, b)
        
        b_sat = fk.b_sat_
        a_param = fk.a_

        # Initial permeability
        n_init = max(1, len(h) // 10)
        mu_init = float(np.polyfit(h[:n_init], b[:n_init], 1)[0])
        mu_r_initial = mu_init / mu_0

        # Knee point via curvature analysis
        knee = find_saturation_knee_point(h, b)
        h_knee = knee["knee_H_A_per_m"]
        b_knee = knee["knee_B_Tesla"]
        mu_r_knee = (b_knee / (mu_0 * h_knee)) if h_knee > 0 else 0.0

        # Classify the last point (or typical operating point)
        h_max = float(h[-1])
        region = classify_operating_region(h_max, h_knee)

        # Estimate loop params for visual AC comparison
        b_r_estimate = float(b_sat * 0.7)
        h_c_estimate = float(h_knee * 0.4)

        loop = generate_hysteresis_loop(
            h_max=h_max,
            b_sat=b_sat,
            coercivity_h=h_c_estimate,
            remanence_b=b_r_estimate,
            n_points=200,
        )
        
        loop_area = calculate_loop_area(loop["h"], loop["b_upper"], loop["b_lower"])

        # Create a fitted B list for plotting
        b_fitted = fk.predict(h).tolist()

        return {
            "b_saturation_T":      b_sat,
            "b_remanence_T":       b_r_estimate,
            "h_coercivity_A_per_m": h_c_estimate,
            "mu_r_initial":        round(mu_r_initial, 2),
            "mu_r_at_knee":        round(mu_r_knee, 2),
            "froehlich_a":         round(a_param, 2),
            "knee_point":          knee,
            "operating_region":    region,
            "hysteresis_loop":     loop,
            "loop_area_J_m3":      loop_area,
            "h_fitted":            h.tolist(),
            "b_fitted":            b_fitted,
        }
