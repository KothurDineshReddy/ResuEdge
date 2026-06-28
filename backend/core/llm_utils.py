"""
Utility functions for LLM providers.
"""

import logging
from typing import Any
from models import GeminiProvider

logger = logging.getLogger(__name__)


def extract_json_from_response(response_text: str) -> str:
    """Strip markdown code fences and <think> blocks from LLM response."""
    response_text = response_text.strip()

    if "<think>" in response_text:
        think_start = response_text.find("<think>")
        think_end = response_text.find("</think>")
        if think_start != -1 and think_end != -1:
            response_text = response_text[:think_start] + response_text[think_end + 8:]

    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    return response_text.strip()


def initialize_llm_provider(api_key: str) -> Any:
    """
    Initialize a GeminiProvider for this request.
    The api_key is supplied by the caller and never stored beyond the request.
    """
    if not api_key:
        raise ValueError("Gemini API key is required")
    logger.info("Initializing Gemini provider for request")
    return GeminiProvider(api_key=api_key)
