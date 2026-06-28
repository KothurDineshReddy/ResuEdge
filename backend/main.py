import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "core"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from core.config import CORS_ORIGINS

app = FastAPI(
    title="ResuEdge API",
    description="AI-powered resume scorer with section-level improvement suggestions",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
