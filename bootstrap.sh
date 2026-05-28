#!/usr/bin/env bash
# ==============================================================================
# bootstrap.sh — Hysteresis Loss & Magnetic Core Saturation Simulation App
# Unified local-development environment bootstrapper
#
# Usage:  bash bootstrap.sh [--reset]
#   --reset   Wipe all generated artefacts and re-run from scratch
#
# Tested on: macOS 13+, Ubuntu 22.04 LTS, Debian 12
# Requires : bash ≥ 4.x, python3 ≥ 3.10, git ≥ 2.39
# ==============================================================================
set -euo pipefail
IFS=$'\n\t'

# ── Colour palette ─────────────────────────────────────────────────────────────
RESET="\033[0m"; BOLD="\033[1m"
RED="\033[31m"; GREEN="\033[32m"; YELLOW="\033[33m"; CYAN="\033[36m"

log_info()    { echo -e "${CYAN}${BOLD}[INFO]${RESET}  $*"; }
log_ok()      { echo -e "${GREEN}${BOLD}[ OK ]${RESET}  $*"; }
log_warn()    { echo -e "${YELLOW}${BOLD}[WARN]${RESET}  $*"; }
log_error()   { echo -e "${RED}${BOLD}[ERR ]${RESET}  $*"; exit 1; }
log_section() { echo -e "\n${BOLD}━━━  $*  ━━━${RESET}"; }

# ── Parse flags ────────────────────────────────────────────────────────────────
RESET_MODE=false
for arg in "$@"; do [[ "$arg" == "--reset" ]] && RESET_MODE=true; done

# ── Guard: must be run from repo root ──────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if $RESET_MODE; then
    log_warn "Reset mode active — removing generated artefacts."
    rm -rf backend/venv backend/app backend/__pycache__ frontend .feature_locks.json
    log_ok "Artefacts removed. Re-running bootstrap…"
fi

# ── Prerequisite checks ────────────────────────────────────────────────────────
log_section "Step 1 — Prerequisite Checks"

check_command() {
    local cmd=$1 hint=$2
    if ! command -v "$cmd" &>/dev/null; then
        log_error "'$cmd' not found. $hint"
    fi
    log_ok "$cmd → $(command -v "$cmd")"
}

check_command git   "Install git via your package manager."
check_command python3 "Install Python ≥ 3.10 from https://python.org"

PY_MAJOR=$(python3 -c "import sys; print(sys.version_info.major)")
PY_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")
[[ "$PY_MAJOR" -lt 3 || ( "$PY_MAJOR" -eq 3 && "$PY_MINOR" -lt 10 ) ]] \
    && log_error "Python ≥ 3.10 required (found ${PY_MAJOR}.${PY_MINOR})"
log_ok "Python ${PY_MAJOR}.${PY_MINOR} — version requirement satisfied."

# ── Git initialisation ─────────────────────────────────────────────────────────
log_section "Step 2 — Git Repository Initialisation"

if [[ ! -d ".git" ]]; then
    git init -b main
    log_ok "Initialised new git repository on branch 'main'."
else
    log_warn "Existing .git directory detected — skipping git init."
fi

# Write .gitignore
cat > .gitignore << 'GITIGNORE'
# Python
backend/venv/
__pycache__/
*.py[cod]
*.pyo
.pytest_cache/
.mypy_cache/
*.egg-info/
dist/
build/
.env
*.env

# OS artefacts
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Logs
*.log
logs/
GITIGNORE
log_ok ".gitignore written."

# ── Directory tree creation ────────────────────────────────────────────────────
log_section "Step 3 — Directory Tree Creation"

DIRS=(
    "backend/app/models"
    "backend/app/api"
    "backend/app/utils"
    "frontend/css"
    "frontend/js"
)

for d in "${DIRS[@]}"; do
    mkdir -p "$d"
    log_ok "Created: $d/"
done

# ── Python virtual environment ─────────────────────────────────────────────────
log_section "Step 4 — Python Virtual Environment"

VENV_DIR="backend/venv"
if [[ ! -d "$VENV_DIR" ]]; then
    python3 -m venv "$VENV_DIR"
    log_ok "venv created at $VENV_DIR"
else
    log_warn "venv already exists at $VENV_DIR — skipping creation."
fi

# Activate venv (subshell-safe)
# shellcheck source=/dev/null
# Change "bin/activate" to "Scripts/activate" for Windows Git Bash compatibility
if [ -f "backend/venv/Scripts/activate" ]; then
    source backend/venv/Scripts/activate
else
    source backend/venv/bin/activate
fi
log_ok "venv activated: $(python --version)"

log_info "Upgrading pip…"
python -m pip install --upgrade pip --quiet
log_ok "pip upgraded to $(pip --version | awk '{print $2}')"

# ── requirements.txt ──────────────────────────────────────────────────────────
log_section "Step 5 — requirements.txt"

cat > backend/requirements.txt << 'REQUIREMENTS'
# ── Web framework ─────────────────────────────────────────────
fastapi==0.111.1
uvicorn[standard]==0.30.1

# ── Data science / ML ─────────────────────────────────────────
numpy==1.26.4
pandas==2.2.2
scikit-learn==1.5.0

# ── Validation & serialisation ────────────────────────────────
pydantic==2.7.4
pydantic-settings==2.3.4

# ── HTTP utilities ────────────────────────────────────────────
httpx==0.27.0
python-multipart==0.0.9

# ── Dev / test ────────────────────────────────────────────────
pytest==8.2.2
pytest-asyncio==0.23.7
REQUIREMENTS
log_ok "requirements.txt written."

log_info "Installing Python dependencies (this may take ~60 s)…"
pip install -r backend/requirements.txt --quiet
log_ok "All Python dependencies installed."

# ── Python package __init__ files ─────────────────────────────────────────────
log_section "Step 6 — Python Package Stubs"

touch backend/app/__init__.py
touch backend/app/models/__init__.py
touch backend/app/api/__init__.py
touch backend/app/utils/__init__.py
log_ok "Package __init__.py files created."

# ── backend/app/utils/formulas.py ─────────────────────────────────────────────
cat > backend/app/utils/formulas.py << 'PYEOF'
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
PYEOF
log_ok "utils/formulas.py written."

# ── backend/app/utils/data_parser.py ──────────────────────────────────────────
cat > backend/app/utils/data_parser.py << 'PYEOF'
"""
utils/data_parser.py
────────────────────
Validates, sanitises, and normalises incoming BH-curve data from the API
layer before it reaches the ML models.  Uses Pandas for vectorised
cleaning and Pydantic for schema enforcement.
"""
from __future__ import annotations

import io
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field, model_validator


class BHDataPoint(BaseModel):
    """Single (H, B) measurement."""
    H_A_per_m: float = Field(..., description="Applied field intensity (A/m)", gt=0)
    B_Tesla: float   = Field(..., description="Flux density (T)", gt=0)


class BHDataset(BaseModel):
    """Validated list of BH data points."""
    material_name: str = Field(..., min_length=1, max_length=80)
    frequency_Hz: float = Field(..., gt=0, description="Test frequency in Hz")
    temperature_C: float = Field(25.0, description="Test temperature in °C")
    data_points: list[BHDataPoint] = Field(..., min_length=3)

    @model_validator(mode="after")
    def check_monotonic_h(self) -> "BHDataset":
        h_vals = [p.H_A_per_m for p in self.data_points]
        if h_vals != sorted(h_vals):
            raise ValueError("H_A_per_m values must be strictly monotonically increasing.")
        return self


def parse_csv_to_bh_dataset(
    csv_bytes: bytes,
    material_name: str,
    frequency_hz: float,
    temperature_c: float = 25.0,
) -> BHDataset:
    """
    Parse a CSV file (columns: H_A_per_m, B_Tesla) into a validated BHDataset.

    The parser:
    1. Drops rows with NaN in either column.
    2. Removes duplicate H values (keeps last occurrence).
    3. Sorts ascending by H.
    4. Clips B to physically plausible range [0, 3.0] T.
    5. Validates the result via Pydantic.
    """
    df = pd.read_csv(io.BytesIO(csv_bytes), usecols=["H_A_per_m", "B_Tesla"])
    df = (
        df.dropna(subset=["H_A_per_m", "B_Tesla"])
          .drop_duplicates(subset="H_A_per_m", keep="last")
          .sort_values("H_A_per_m")
          .copy()
    )
    df["B_Tesla"] = df["B_Tesla"].clip(lower=0.0, upper=3.0)
    df = df[df["H_A_per_m"] > 0]   # physically, H must be positive

    if len(df) < 3:
        raise ValueError(
            "CSV must contain at least 3 valid (H, B) rows after cleaning."
        )

    data_points = [
        BHDataPoint(H_A_per_m=row["H_A_per_m"], B_Tesla=row["B_Tesla"])
        for _, row in df.iterrows()
    ]
    return BHDataset(
        material_name=material_name,
        frequency_Hz=frequency_hz,
        temperature_C=temperature_c,
        data_points=data_points,
    )


def bh_dataset_to_arrays(
    dataset: BHDataset,
) -> tuple[np.ndarray, np.ndarray]:
    """Convert a BHDataset to paired NumPy arrays (H, B)."""
    h = np.array([p.H_A_per_m for p in dataset.data_points], dtype=np.float64)
    b = np.array([p.B_Tesla    for p in dataset.data_points], dtype=np.float64)
    return h, b
PYEOF
log_ok "utils/data_parser.py written."

# ── backend/app/models/hysteresis_model.py ────────────────────────────────────
cat > backend/app/models/hysteresis_model.py << 'PYEOF'
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
PYEOF
log_ok "models/hysteresis_model.py written."

# ── backend/app/api/routes.py ─────────────────────────────────────────────────
cat > backend/app/api/routes.py << 'PYEOF'
"""
api/routes.py
─────────────
All FastAPI route definitions for the Hysteresis Loss Simulation API.
Endpoints are versioned under /api/v1/.

Routes
------
GET  /api/v1/health                     — Liveness check
POST /api/v1/simulate/steinmetz         — Predict core loss (Steinmetz)
POST /api/v1/simulate/bertotti          — Predict loss (Bertotti separation)
POST /api/v1/analyse/bh-curve          — Analyse BH dataset, detect knee
POST /api/v1/analyse/hysteresis-loop   — Generate hysteresis loop points
POST /api/v1/upload/bh-csv             — Parse uploaded CSV → BH analysis
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field

from app.utils.formulas import (
    steinmetz_core_loss,
    total_bertotti_loss,
    generate_hysteresis_loop,
    find_saturation_knee_point,
)
from app.utils.data_parser import parse_csv_to_bh_dataset, bh_dataset_to_arrays
from app.models.hysteresis_model import BHCurveAnalyser, SteinmetzModel

router = APIRouter(prefix="/api/v1", tags=["simulation"])


# ─── Pydantic request / response schemas ──────────────────────────────────────

class SteinmetzRequest(BaseModel):
    k:      float = Field(..., gt=0, description="Steinmetz coefficient k")
    f:      float = Field(..., gt=0, description="Frequency (Hz)")
    b_peak: float = Field(..., gt=0, description="Peak flux density (T)")
    alpha:  float = Field(1.7,       description="Frequency exponent α")
    beta:   float = Field(2.0,       description="Flux density exponent β")


class BertottiRequest(BaseModel):
    k_h:    float = Field(..., gt=0)
    k_e:    float = Field(..., gt=0)
    k_ex:   float = Field(..., gt=0)
    f:      float = Field(..., gt=0)
    b_peak: float = Field(..., gt=0)
    n:      float = Field(2.0)


class BHCurveRequest(BaseModel):
    h_values: list[float] = Field(..., min_length=3)
    b_values: list[float] = Field(..., min_length=3)
    material_name: str = Field("Unknown", max_length=80)


class HysteresisLoopRequest(BaseModel):
    h_max:        float = Field(..., gt=0)
    b_sat:        float = Field(..., gt=0)
    coercivity_h: float = Field(..., gt=0)
    remanence_b:  float = Field(..., gt=0)
    n_points:     int   = Field(200, ge=20, le=2000)


# ─── Health check ─────────────────────────────────────────────────────────────

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict:
    """Liveness probe.  Returns 200 OK with service metadata."""
    return {
        "status": "ok",
        "service": "Hysteresis Loss Simulation API",
        "version": "0.1.0",
    }


# ─── Steinmetz core loss ──────────────────────────────────────────────────────

@router.post("/simulate/steinmetz")
async def simulate_steinmetz(req: SteinmetzRequest) -> dict:
    """
    Calculate core loss using the generalised Steinmetz equation.
    Returns loss in W/m³.
    """
    try:
        loss = steinmetz_core_loss(req.k, req.f, req.b_peak, req.alpha, req.beta)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "core_loss_W_m3": loss,
        "inputs": req.model_dump(),
        "equation": "P = k · f^α · B^β",
    }


# ─── Bertotti loss separation ─────────────────────────────────────────────────

@router.post("/simulate/bertotti")
async def simulate_bertotti(req: BertottiRequest) -> dict:
    """
    Full Bertotti loss-separation model.
    Returns hysteresis, eddy-current, excess, and total loss components.
    """
    try:
        result = total_bertotti_loss(
            req.k_h, req.k_e, req.k_ex, req.f, req.b_peak, req.n
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"loss_components_W_m3": result, "inputs": req.model_dump()}


# ─── BH curve analysis ────────────────────────────────────────────────────────

@router.post("/analyse/bh-curve")
async def analyse_bh_curve(req: BHCurveRequest) -> dict:
    """
    Accept arrays of H and B values, return material parameters
    including knee point, permeability estimates, and hysteresis loop data.
    """
    import numpy as np

    h = np.array(req.h_values, dtype=np.float64)
    b = np.array(req.b_values, dtype=np.float64)

    if len(h) != len(b):
        raise HTTPException(
            status_code=422,
            detail="h_values and b_values must have the same length.",
        )
    if not (h > 0).all():
        raise HTTPException(status_code=422, detail="All H values must be positive.")

    analyser = BHCurveAnalyser()
    try:
        result = analyser.analyse(h, b)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {"material": req.material_name, "analysis": result}


# ─── Hysteresis loop generation ───────────────────────────────────────────────

@router.post("/analyse/hysteresis-loop")
async def get_hysteresis_loop(req: HysteresisLoopRequest) -> dict:
    """
    Generate a parameterised symmetric hysteresis B-H loop.
    Returns upper and lower branch arrays for charting.
    """
    loop = generate_hysteresis_loop(
        h_max=req.h_max,
        b_sat=req.b_sat,
        coercivity_h=req.coercivity_h,
        remanence_b=req.remanence_b,
        n_points=req.n_points,
    )
    return {"hysteresis_loop": loop}


# ─── CSV upload ───────────────────────────────────────────────────────────────

@router.post("/upload/bh-csv")
async def upload_bh_csv(
    file: UploadFile = File(...),
    material_name: str = "Uploaded Material",
    frequency_hz: float = 50.0,
    temperature_c: float = 25.0,
) -> dict:
    """
    Upload a CSV file with columns [H_A_per_m, B_Tesla].
    Parses, validates, and runs full BH curve analysis.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=415,
            detail="Only .csv files are accepted.",
        )

    csv_bytes = await file.read()
    if len(csv_bytes) > 5 * 1024 * 1024:   # 5 MB limit
        raise HTTPException(status_code=413, detail="File must be < 5 MB.")

    try:
        dataset = parse_csv_to_bh_dataset(
            csv_bytes, material_name, frequency_hz, temperature_c
        )
    except (ValueError, Exception) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    h_arr, b_arr = bh_dataset_to_arrays(dataset)
    analyser = BHCurveAnalyser()
    analysis = analyser.analyse(h_arr, b_arr)

    return {
        "filename": file.filename,
        "rows_parsed": len(dataset.data_points),
        "material": dataset.material_name,
        "frequency_Hz": dataset.frequency_Hz,
        "temperature_C": dataset.temperature_C,
        "analysis": analysis,
    }
PYEOF
log_ok "api/routes.py written."

# ── backend/app/main.py ────────────────────────────────────────────────────────
cat > backend/app/main.py << 'PYEOF'
"""
main.py
───────
FastAPI application entry point for the Hysteresis Loss &
Magnetic Core Saturation Simulation API.

Start with:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router


# ─── Lifespan context ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """
    Startup / shutdown lifecycle hook.
    Use this block to pre-load ML models, open DB connections, etc.
    """
    # Startup: nothing heavy to load at v0.1.0 — models are instantiated
    # per-request.  A future iteration will cache fitted SteinmetzModel here.
    print("[startup] Hysteresis Simulation API is ready.")
    yield
    # Shutdown
    print("[shutdown] Cleaning up resources.")


# ─── Application factory ──────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """Construct and configure the FastAPI application."""
    application = FastAPI(
        title="Hysteresis Loss & Magnetic Core Saturation Simulation API",
        description=(
            "REST API for computing hysteresis losses, eddy-current losses, "
            "Bertotti loss separation, and B-H curve saturation analysis."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS — allow the local frontend dev server ─────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5500",     # VS Code Live Server
            "http://127.0.0.1:5500",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Register API router ────────────────────────────────────────────────
    application.include_router(router)

    # ── Root redirect ─────────────────────────────────────────────────────
    @application.get("/", include_in_schema=False)
    async def root() -> JSONResponse:
        return JSONResponse(
            content={
                "message": "Hysteresis Simulation API — visit /docs for interactive documentation.",
                "health": "/api/v1/health",
            }
        )

    return application


app: FastAPI = create_app()
PYEOF
log_ok "main.py written."

# ── frontend/index.html ────────────────────────────────────────────────────────
log_section "Step 7 — Frontend Scaffold"

cat > frontend/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hysteresis Loss & Core Saturation Simulator</title>

  <!-- Tailwind CSS (CDN – switch to local build for production) -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>

  <!-- App styles -->
  <link rel="stylesheet" href="css/styles.css" />

  <script>
    /* Tailwind custom theme tokens */
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { DEFAULT: '#0ea5e9', dark: '#0369a1' },
            accent: '#f59e0b',
          },
          fontFamily: {
            mono: ['"JetBrains Mono"', 'monospace'],
          },
        },
      },
    };
  </script>
</head>

<body class="min-h-full bg-gray-950 text-gray-100 font-sans antialiased">

  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <header class="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Electromagnet icon (inline SVG) -->
        <svg class="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M3.75 13.5A8.25 8.25 0 0112 5.25a8.25 8.25 0 018.25 8.25M3.75 13.5h16.5M3.75 13.5
               C3.75 17.642 7.358 21 12 21s8.25-3.358 8.25-7.5"/>
        </svg>
        <span class="text-xl font-semibold tracking-tight">MagSim <span class="text-brand">Pro</span></span>
      </div>

      <!-- API status badge -->
      <div class="flex items-center gap-2">
        <span id="api-status-dot" class="inline-block w-2.5 h-2.5 rounded-full bg-gray-600 transition-colors"></span>
        <span id="api-status-label" class="text-sm text-gray-400">Checking API…</span>
      </div>
    </div>
  </header>

  <!-- ── Main layout ────────────────────────────────────────────────────── -->
  <main class="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- ── Left panel: Controls ──────────────────────────────────────────── -->
    <aside class="lg:col-span-1 space-y-5">

      <!-- Simulation mode selector -->
      <section class="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Simulation Mode
        </h2>
        <div class="flex flex-col gap-2" id="mode-selector">
          <label class="mode-btn active" data-mode="steinmetz">
            <input type="radio" name="sim-mode" value="steinmetz" class="sr-only" checked />
            <span class="mode-label">Steinmetz Core Loss</span>
          </label>
          <label class="mode-btn" data-mode="bertotti">
            <input type="radio" name="sim-mode" value="bertotti" class="sr-only" />
            <span class="mode-label">Bertotti Loss Separation</span>
          </label>
          <label class="mode-btn" data-mode="bh-curve">
            <input type="radio" name="sim-mode" value="bh-curve" class="sr-only" />
            <span class="mode-label">BH Curve Analyser</span>
          </label>
          <label class="mode-btn" data-mode="hysteresis">
            <input type="radio" name="sim-mode" value="hysteresis" class="sr-only" />
            <span class="mode-label">Hysteresis Loop</span>
          </label>
        </div>
      </section>

      <!-- Dynamic parameter form (rendered by app.js) -->
      <section class="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Parameters
        </h2>
        <div id="param-form" class="space-y-4"></div>

        <button
          id="run-btn"
          class="mt-5 w-full bg-brand hover:bg-brand-dark active:scale-95 transition
                 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-sky-900/40">
          Run Simulation
        </button>
      </section>

      <!-- CSV Upload (BH Data) -->
      <section class="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Upload BH Data (CSV)
        </h2>
        <p class="text-xs text-gray-500 mb-3">Columns required: <code class="text-accent">H_A_per_m</code>, <code class="text-accent">B_Tesla</code></p>
        <input
          type="file"
          id="csv-upload"
          accept=".csv"
          class="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg
                 file:border-0 file:text-sm file:font-medium file:bg-sky-900/60 file:text-sky-300
                 hover:file:bg-sky-800/60 cursor-pointer" />
        <button
          id="upload-btn"
          class="mt-3 w-full border border-sky-700 text-sky-300 hover:bg-sky-900/40
                 text-sm font-medium py-2 px-4 rounded-lg transition">
          Upload &amp; Analyse
        </button>
      </section>
    </aside>

    <!-- ── Right panel: Charts & results ──────────────────────────────────── -->
    <section class="lg:col-span-2 space-y-5">

      <!-- Primary chart -->
      <div class="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold" id="chart-title">Simulation Chart</h2>
          <button
            id="export-btn"
            class="text-xs text-gray-500 hover:text-gray-300 border border-gray-700
                   hover:border-gray-500 rounded px-3 py-1 transition">
            Export PNG
          </button>
        </div>
        <div class="relative h-80">
          <canvas id="main-chart"></canvas>
          <div id="chart-placeholder"
               class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
            Run a simulation to see results.
          </div>
        </div>
      </div>

      <!-- Results table -->
      <div class="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Computed Results
        </h2>
        <div id="results-output"
             class="font-mono text-sm text-gray-300 space-y-1 min-h-[60px]
                    flex items-center justify-center text-gray-600">
          Results will appear here.
        </div>
      </div>

      <!-- Loss breakdown bar chart (Bertotti only) -->
      <div id="breakdown-panel" class="bg-gray-900 rounded-xl border border-gray-800 p-5 hidden">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Loss Breakdown
        </h2>
        <div class="relative h-48">
          <canvas id="breakdown-chart"></canvas>
        </div>
      </div>
    </section>
  </main>

  <!-- ── Toast notification ────────────────────────────────────────────── -->
  <div id="toast"
       class="fixed bottom-6 right-6 z-50 max-w-xs bg-red-900 border border-red-700
              text-red-100 text-sm px-4 py-3 rounded-xl shadow-xl
              opacity-0 translate-y-2 transition-all duration-300 pointer-events-none">
    <span id="toast-msg"></span>
  </div>

  <!-- ── JS modules ────────────────────────────────────────────────────── -->
  <script type="module" src="js/api.js"></script>
  <script type="module" src="js/charts.js"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
HTMLEOF
log_ok "frontend/index.html written."

# ── frontend/css/styles.css ────────────────────────────────────────────────────
cat > frontend/css/styles.css << 'CSSEOF'
/* ── Mode selector buttons ─────────────────────────────────────────────────── */
.mode-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid #374151;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  color: #9ca3af;
  font-size: 0.875rem;
  font-weight: 500;
}
.mode-btn:hover  { background-color: #1f2937; color: #e5e7eb; }
.mode-btn.active { background-color: #0c4a6e; border-color: #0ea5e9; color: #bae6fd; }

/* ── Form inputs ──────────────────────────────────────────────────────────── */
.param-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.375rem;
}
.param-input {
  width: 100%;
  background-color: #111827;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: #f3f4f6;
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
  transition: border-color 0.15s;
}
.param-input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
}

/* ── Results KV rows ─────────────────────────────────────────────────────── */
.result-row {
  display: flex;
  justify-content: space-between;
  padding: 0.375rem 0;
  border-bottom: 1px solid #1f2937;
}
.result-key   { color: #6b7280; }
.result-value { color: #34d399; font-weight: 600; }
CSSEOF
log_ok "frontend/css/styles.css written."

# ── frontend/js/api.js ─────────────────────────────────────────────────────────
cat > frontend/js/api.js << 'JSEOF'
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
JSEOF
log_ok "frontend/js/api.js written."

# ── frontend/js/charts.js ──────────────────────────────────────────────────────
cat > frontend/js/charts.js << 'JSEOF'
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
JSEOF
log_ok "frontend/js/charts.js written."

# ── frontend/js/app.js ─────────────────────────────────────────────────────────
cat > frontend/js/app.js << 'JSEOF'
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
JSEOF
log_ok "frontend/js/app.js written."

# ── .feature_locks.json ────────────────────────────────────────────────────────
log_section "Step 8 — Feature Lock Configuration"

cat > .feature_locks.json << 'JSONEOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "_comment": "Feature-lock registry — do NOT modify manually. Use check_locks.py.",
  "project": "hysteresis-simulation",
  "version": "1.0.0",
  "policy": "strict",
  "roles": {
    "data-engineer":   { "branch": "feature/data-pipeline",  "email": "" },
    "ml-engineer":     { "branch": "feature/ml-engine",      "email": "" },
    "backend-engineer":{ "branch": "feature/api-endpoints",  "email": "" },
    "frontend-engineer":{ "branch": "feature/ui-charts",     "email": "" }
  },
  "locks": {
    "data-engineer": {
      "description": "Data ingestion, parsing, schema validation",
      "owns": [
        "backend/app/utils/data_parser.py",
        "backend/app/utils/__init__.py"
      ],
      "read_only_access": [
        "backend/app/models/",
        "backend/requirements.txt"
      ]
    },
    "ml-engineer": {
      "description": "Mathematical formulas, ML models, curve fitting",
      "owns": [
        "backend/app/models/hysteresis_model.py",
        "backend/app/models/__init__.py",
        "backend/app/utils/formulas.py"
      ],
      "read_only_access": [
        "backend/app/utils/data_parser.py",
        "backend/requirements.txt"
      ]
    },
    "backend-engineer": {
      "description": "FastAPI routing, middleware, request/response schemas",
      "owns": [
        "backend/app/main.py",
        "backend/app/__init__.py",
        "backend/app/api/routes.py",
        "backend/app/api/__init__.py",
        "backend/requirements.txt"
      ],
      "read_only_access": [
        "backend/app/models/",
        "backend/app/utils/"
      ]
    },
    "frontend-engineer": {
      "description": "UI, charting, API client, HTML/CSS/JS",
      "owns": [
        "frontend/index.html",
        "frontend/css/styles.css",
        "frontend/js/app.js",
        "frontend/js/charts.js",
        "frontend/js/api.js"
      ],
      "read_only_access": [
        "backend/app/api/routes.py"
      ]
    }
  }
}
JSONEOF
log_ok ".feature_locks.json written."

# ── Validation script ──────────────────────────────────────────────────────────
log_section "Step 9 — Lock Validation Script"

cat > check_locks.py << 'PYEOF'
#!/usr/bin/env python3
"""
check_locks.py
──────────────
Feature-lock validation guard.

Usage
-----
    python check_locks.py [--role ROLE] [--files FILE [FILE ...]]
    python check_locks.py --detect          # auto-detect role from git branch
    python check_locks.py --staged          # validate all git staged files

Exit codes
----------
    0 — All checks passed
    1 — One or more lock violations found
    2 — Configuration / usage error
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

LOCK_FILE = Path(__file__).parent / ".feature_locks.json"
BRANCH_ROLE_MAP = {
    "feature/data-pipeline": "data-engineer",
    "feature/ml-engine":     "ml-engineer",
    "feature/api-endpoints": "backend-engineer",
    "feature/ui-charts":     "frontend-engineer",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_locks() -> dict:
    if not LOCK_FILE.exists():
        print(f"[ERROR] Lock file not found: {LOCK_FILE}", file=sys.stderr)
        sys.exit(2)
    with LOCK_FILE.open() as fh:
        return json.load(fh)


def current_git_branch() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, check=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None


def staged_files() -> list[str]:
    """Return list of files currently staged in git."""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True, text=True, check=True,
        )
        return [f.strip() for f in result.stdout.splitlines() if f.strip()]
    except subprocess.CalledProcessError:
        return []


def detect_role_from_branch(branch: str | None) -> str | None:
    if branch is None:
        return None
    return BRANCH_ROLE_MAP.get(branch)


def all_owned_files(locks: dict, exclude_role: str) -> dict[str, str]:
    """Return {normalised_path: owner_role} for every file not owned by exclude_role."""
    owned: dict[str, str] = {}
    for role, config in locks["locks"].items():
        if role == exclude_role:
            continue
        for path in config.get("owns", []):
            owned[Path(path).as_posix()] = role
    return owned


def normalise(path: str) -> str:
    return Path(path).as_posix()


# ── Core validation ───────────────────────────────────────────────────────────

def validate(role: str, files: list[str], locks: dict) -> bool:
    """
    Return True if all files are permitted for role, False if violations found.
    """
    if role not in locks["locks"]:
        print(f"[ERROR] Unknown role '{role}'. Valid roles: {list(locks['locks'])}", file=sys.stderr)
        sys.exit(2)

    owned_by_others = all_owned_files(locks, role)
    my_owned        = {normalise(p) for p in locks["locks"][role].get("owns", [])}
    my_read_only    = {normalise(p) for p in locks["locks"][role].get("read_only_access", [])}

    violations: list[tuple[str, str, str]] = []

    for file in files:
        norm = normalise(file)

        # Check if this file is owned by another role
        if norm in owned_by_others:
            violations.append((file, owned_by_others[norm], "OWNS_VIOLATION"))
            continue

        # Check if modifying a read-only entry (prefix match for directories)
        for ro_path in my_read_only:
            if norm == ro_path or norm.startswith(ro_path.rstrip("/") + "/"):
                violations.append((file, "read-only for your role", "READ_ONLY_VIOLATION"))
                break

    if not violations:
        print(f"[OK] All {len(files)} file(s) are permitted for role '{role}'.")
        return True

    print(f"\n[LOCK VIOLATION] Role '{role}' attempted to modify locked files:\n")
    print(f"  {'File':<55} {'Owner / Reason':<30} {'Type'}")
    print(f"  {'-'*55} {'-'*30} {'-'*20}")
    for file, owner, vtype in violations:
        print(f"  {file:<55} {owner:<30} {vtype}")
    print(
        f"\n  ✗ {len(violations)} violation(s) found.  "
        "Switch to the correct branch or coordinate with the file owner.\n"
    )
    return False


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Feature-lock validation for the Hysteresis Simulation project."
    )
    parser.add_argument("--role",    help="Your team role (e.g. ml-engineer)")
    parser.add_argument("--files",   nargs="+", help="Files to validate")
    parser.add_argument("--detect",  action="store_true",
                        help="Auto-detect role from current git branch")
    parser.add_argument("--staged",  action="store_true",
                        help="Validate all currently staged git files")
    args = parser.parse_args()

    locks = load_locks()
    role: str | None = args.role

    if args.detect or args.staged:
        branch = current_git_branch()
        role = detect_role_from_branch(branch)
        if role is None:
            print(
                f"[WARN] Could not map branch '{branch}' to a role. "
                "Specify --role explicitly.",
                file=sys.stderr,
            )
            sys.exit(2)
        print(f"[INFO] Detected branch '{branch}' → role '{role}'")

    if role is None:
        parser.print_help()
        sys.exit(2)

    files = args.files or []
    if args.staged:
        staged = staged_files()
        if not staged:
            print("[INFO] No staged files found.")
            sys.exit(0)
        files = staged
        print(f"[INFO] Validating {len(files)} staged file(s)…")

    if not files:
        print("[INFO] No files specified — nothing to validate.")
        sys.exit(0)

    passed = validate(role, files, locks)
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
PYEOF
chmod +x check_locks.py
log_ok "check_locks.py written and made executable."

# ── Git pre-commit hook ────────────────────────────────────────────────────────
log_section "Step 10 — Git Pre-commit Hook"

mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'HOOKEOF'
#!/usr/bin/env bash
# Pre-commit hook: run feature-lock validation on every staged commit.
set -euo pipefail

PYTHON=$(command -v python3 || command -v python)
if [[ -z "$PYTHON" ]]; then
    echo "[HOOK] python3 not found — skipping lock check." >&2
    exit 0
fi

if [[ ! -f "check_locks.py" ]]; then
    echo "[HOOK] check_locks.py not found — skipping lock check." >&2
    exit 0
fi

$PYTHON check_locks.py --staged --detect
HOOKEOF
chmod +x .git/hooks/pre-commit
log_ok "Git pre-commit hook installed."

# ── Initial git commit ─────────────────────────────────────────────────────────
log_section "Step 11 — Initial Git Commit"

git add .
git commit -m "chore: bootstrap project structure via bootstrap.sh

- Directory tree: backend/app/{models,api,utils}, frontend/{css,js}
- Python venv created; all dependencies installed
- FastAPI main.py with CORS middleware and health endpoint
- Mathematical formula library (Steinmetz, Bertotti, Langevin, knee detection)
- BH data parser with Pydantic validation
- Hysteresis model (Scikit-learn pipeline)
- All API routes (steinmetz, bertotti, bh-curve, hysteresis-loop, csv-upload)
- Frontend scaffold (index.html, Tailwind, Chart.js, app.js, charts.js, api.js)
- Feature-lock JSON schema (.feature_locks.json)
- Lock validation script (check_locks.py) with git pre-commit hook"

log_ok "Initial commit created."

# ── Create feature branches ────────────────────────────────────────────────────
log_section "Step 12 — Feature Branch Creation"

BRANCHES=(
    "feature/data-pipeline"
    "feature/ml-engine"
    "feature/api-endpoints"
    "feature/ui-charts"
)
for branch in "${BRANCHES[@]}"; do
    git branch "$branch"
    log_ok "Branch created: $branch"
done

# ── Summary ───────────────────────────────────────────────────────────────────
log_section "Bootstrap Complete"

cat << SUMMARY
${GREEN}${BOLD}
  ╔══════════════════════════════════════════════════════════╗
  ║         Hysteresis Simulation App — Ready                ║
  ╚══════════════════════════════════════════════════════════╝${RESET}

${BOLD}Start the API server:${RESET}
  cd backend
  source venv/bin/activate
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

${BOLD}Open the frontend:${RESET}
  Open frontend/index.html in a browser, or serve with:
  python3 -m http.server 5500 --directory frontend

${BOLD}API documentation:${RESET}
  http://localhost:8000/docs       ← Swagger UI
  http://localhost:8000/redoc      ← ReDoc

${BOLD}Check feature locks before committing:${RESET}
  python check_locks.py --detect --staged

${BOLD}Team branches:${RESET}
  git switch feature/data-pipeline   # Data Engineer
  git switch feature/ml-engine       # ML Engineer
  git switch feature/api-endpoints   # Backend Engineer
  git switch feature/ui-charts       # Frontend Engineer

SUMMARY
