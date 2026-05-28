"""
main.py
───────
FastAPI application entry point for the Hysteresis Loss &
Magnetic Core Saturation Simulation API.
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
    """Startup / shutdown lifecycle hook."""
    print("[startup] Hysteresis Simulation API is ready.")
    yield
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
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS — fully open for standalone local classrooms ─────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
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
