"""
Model configuration for ResuEdge.
Only Gemini models are supported. API key is supplied per-request by the caller.
"""

SUPPORTED_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
]

DEFAULT_MODEL = "gemini-2.0-flash"

MODEL_PARAMETERS = {
    "gemini-2.0-flash":      {"temperature": 0.1, "top_p": 0.9},
    "gemini-2.0-flash-lite": {"temperature": 0.1, "top_p": 0.9},
    "gemini-2.5-pro":        {"temperature": 0.1, "top_p": 0.9},
    "gemini-2.5-flash":      {"temperature": 0.1, "top_p": 0.9},
    "gemini-2.5-flash-lite": {"temperature": 0.1, "top_p": 0.9},
}
