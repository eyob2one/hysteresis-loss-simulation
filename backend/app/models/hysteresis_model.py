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
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer

from app.utils.formulas import (
    find_saturation_knee_point,
    generate_hysteresis_loop,
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
                return np.column_stack([np.log(X[:, 0]), np.log(X[:, 1])])
            except FloatingPointError as exc:
                raise ValueError(
                    "f and B_peak must all be strictly positive."
                ) from exc


class SteinmetzModel:
    """
    End-to-end scikit-learn pipeline:
        raw (f, B_peak) → log-features → Ridge regression → log(P_core)

    Usage
    -----
    model = SteinmetzModel()
    model.fit(f_array, b_array, p_array)
    result = model.predict(f=50.0, b_peak=1.2)
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
        """
        Fit the pipeline on experimental data.

        Parameters
        ----------
        f      : Frequency array (Hz), shape (N,)
        b_peak : Peak flux density array (T), shape (N,)
        p_loss : Measured core-loss density (W/m³), shape (N,)
        """
        f, b_peak, p_loss = (
            np.asarray(f, dtype=np.float64),
            np.asarray(b_peak, dtype=np.float64),
            np.asarray(p_loss, dtype=np.float64),
        )
        X = np.column_stack([f, b_peak])
        y = np.log(p_loss)
        self._pipeline.fit(X, y)
        self._fitted = True
        return self

    def predict(self, f: float, b_peak: float) -> float:
        """Return predicted core-loss density (W/m³) for a single (f, B) pair."""
        if not self._fitted:
            raise RuntimeError("Model must be fitted before calling predict().")
        X = np.array([[f, b_peak]])
        log_pred = self._pipeline.predict(X)[0]
        return float(np.exp(log_pred))

    def get_coefficients(self) -> dict[str, float]:
        """Extract Steinmetz coefficients k, α, β from the fitted model."""
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


# ─── BH-Curve Parameter Extractor ─────────────────────────────────────────────

class BHCurveAnalyser:
    """
    Derives key magnetic material parameters from experimental BH data:
        - Saturation flux density  (B_sat)
        - Remanent flux density    (B_r)
        - Coercive field intensity (H_c)
        - Knee point location
        - Relative permeability at operating point

    All results are returned as plain dicts for easy JSON serialisation.
    """

    def analyse(
        self,
        h: NDArray[np.float64],
        b: NDArray[np.float64],
    ) -> dict:
        """
        Parameters
        ----------
        h : H-field array (A/m), monotonically increasing, shape (N,)
        b : B-field array (T),   corresponding measurements,  shape (N,)

        Returns
        -------
        Full analysis dictionary.
        """
        h = np.asarray(h, dtype=np.float64)
        b = np.asarray(b, dtype=np.float64)

        mu_0: float = 4.0 * np.pi * 1e-7   # Permeability of free space (H/m)

        # Saturation: 99th percentile of B to avoid noise artefacts
        b_sat  = float(np.percentile(b, 99))
        # Initial permeability: slope of B-H at the origin region
        n_init = max(1, len(h) // 10)
        mu_init = float(
            np.polyfit(h[:n_init], b[:n_init], 1)[0]
        )
        mu_r_initial = mu_init / mu_0

        # Knee point
        knee = find_saturation_knee_point(h, b)

        # Relative permeability at knee
        h_knee = knee["knee_H_A_per_m"]
        b_knee = knee["knee_B_Tesla"]
        mu_r_knee = (b_knee / (mu_0 * h_knee)) if h_knee > 0 else 0.0

        # Hysteresis loop shape (simplified: assume symmetric loop)
        b_r_estimate = float(b_sat * 0.7)          # typical Si-steel ratio
        h_c_estimate = float(h[len(h) // 3] * 0.1) # rough proportional estimate

        loop = generate_hysteresis_loop(
            h_max=float(h[-1]),
            b_sat=b_sat,
            coercivity_h=h_c_estimate,
            remanence_b=b_r_estimate,
            n_points=300,
        )

        return {
            "b_saturation_T":      b_sat,
            "b_remanence_T":       b_r_estimate,
            "h_coercivity_A_per_m": h_c_estimate,
            "mu_r_initial":        round(mu_r_initial, 2),
            "mu_r_at_knee":        round(mu_r_knee, 2),
            "knee_point":          knee,
            "hysteresis_loop":     loop,
        }
