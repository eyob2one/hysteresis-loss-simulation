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
