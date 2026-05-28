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
