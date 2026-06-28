"""
ResuEdge backend configuration.
No secrets or API keys are stored here — all LLM keys are supplied per-request.
"""

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

MAX_UPLOAD_SIZE_MB = 10
