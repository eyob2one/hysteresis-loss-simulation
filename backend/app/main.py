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
