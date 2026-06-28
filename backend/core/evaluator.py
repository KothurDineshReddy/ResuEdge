from typing import Any
from .models import EvaluationData
from .llm_utils import initialize_llm_provider, extract_json_from_response
import logging
import json

MAX_BONUS_POINTS = 20
MIN_FINAL_SCORE = -20
MAX_FINAL_SCORE = 120

from .prompt import MODEL_PARAMETERS, DEFAULT_MODEL
from prompts.template_manager import TemplateManager

logger = logging.getLogger(__name__)


class ResumeEvaluator:
    def __init__(self, api_key: str, model_name: str = DEFAULT_MODEL):
        if not api_key:
            raise ValueError("Gemini API key is required")
        if not model_name:
            raise ValueError("Model name cannot be empty")

        self.api_key = api_key
        self.model_name = model_name
        self.model_params = MODEL_PARAMETERS.get(model_name, {"temperature": 0.1, "top_p": 0.9})
        self.template_manager = TemplateManager()
        self.provider = initialize_llm_provider(api_key)

    def _chat(self, system_message: str, user_prompt: str) -> str:
        """Send a chat request and return raw response text."""
        chat_params = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt},
            ],
            "options": {
                "stream": False,
                "temperature": self.model_params.get("temperature", 0.1),
                "top_p": self.model_params.get("top_p", 0.9),
            },
        }
        response = self.provider.chat(**chat_params, format=EvaluationData.model_json_schema())
        return extract_json_from_response(response["message"]["content"])

    def evaluate_resume(self, resume_text: str) -> EvaluationData:
        """Score the resume across all four categories."""
        user_prompt = self.template_manager.render_template(
            "resume_evaluation_criteria", text_content=resume_text
        )
        if user_prompt is None:
            raise ValueError("Failed to load resume_evaluation_criteria template")

        system_message = self.template_manager.render_template(
            "resume_evaluation_system_message"
        )
        if system_message is None:
            raise ValueError("Failed to load resume_evaluation_system_message template")

        try:
            response_text = self._chat(system_message, user_prompt)
            logger.debug(f"Evaluation response: {response_text}")
            evaluation_data = EvaluationData(**json.loads(response_text))
            return evaluation_data
        except Exception as e:
            logger.error(f"Error evaluating resume: {e}")
            raise

