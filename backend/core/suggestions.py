import json
import logging
from .models import EvaluationData, GeminiProvider
from .llm_utils import initialize_llm_provider, extract_json_from_response
from .prompt import DEFAULT_MODEL, MODEL_PARAMETERS
from prompts.template_manager import TemplateManager

logger = logging.getLogger(__name__)

SUGGESTION_THRESHOLD = 0.70  # sections below 70% of max get suggestions
HIGH_PRIORITY_THRESHOLD = 0.40  # below 40% = High, 40-70% = Medium


def _compute_priority(score: float, max_score: int) -> str:
    ratio = score / max_score if max_score else 0
    if ratio < HIGH_PRIORITY_THRESHOLD:
        return "High"
    return "Medium"


def _build_weak_sections(evaluation: EvaluationData) -> dict:
    """
    Return sections that scored below SUGGESTION_THRESHOLD with priority
    pre-computed so the LLM doesn't have to decide it.
    """
    weak = {}
    deduction_reason = evaluation.deductions.reasons if evaluation.deductions.total > 0 else ""

    for section_name, category in evaluation.scores.model_dump().items():
        score = category["score"]
        max_score = category["max"]
        if score < SUGGESTION_THRESHOLD * max_score:
            weak[section_name] = {
                "score": score,
                "max": max_score,
                "evidence": category["evidence"],
                "priority": _compute_priority(score, max_score),
                "deduction_reason": deduction_reason,
            }
    return weak


class SuggestionsEngine:
    def __init__(self, api_key: str, model_name: str = DEFAULT_MODEL):
        if not api_key:
            raise ValueError("Gemini API key is required")
        self.model_name = model_name
        self.model_params = MODEL_PARAMETERS.get(model_name, {"temperature": 0.1, "top_p": 0.9})
        self.provider: GeminiProvider = initialize_llm_provider(api_key)
        self.template_manager = TemplateManager()

    def generate(
        self,
        evaluation: EvaluationData,
        candidate_name: str = "Candidate",
        total_score: float = 0,
        max_score: int = 120,
    ) -> dict:
        """
        Generate personalized suggestions for all weak sections.
        Returns an empty dict if no sections are weak.
        """
        weak_sections = _build_weak_sections(evaluation)
        if not weak_sections:
            logger.info("No weak sections found — skipping suggestions call")
            return {}

        prompt = self.template_manager.render_template(
            "resume_suggestions",
            candidate_name=candidate_name,
            total_score=total_score,
            max_score=max_score,
            weak_sections=weak_sections,
        )
        if not prompt:
            raise ValueError("Failed to render resume_suggestions template")

        chat_params = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a senior technical career coach. "
                        "Return ONLY valid JSON matching the exact structure requested. "
                        "No markdown, no explanation, no text outside the JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "options": {
                "stream": False,
                "temperature": self.model_params.get("temperature", 0.1),
                "top_p": self.model_params.get("top_p", 0.9),
            },
        }

        # Attempt with one retry on JSON parse failure
        for attempt in range(2):
            try:
                response = self.provider.chat(**chat_params)
                raw = extract_json_from_response(response["message"]["content"])
                result = json.loads(raw)
                self._validate(result, weak_sections)
                return result
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                if attempt == 0:
                    logger.warning(f"Suggestions parse failed on attempt 1: {e} — retrying")
                    continue
                logger.error(f"Suggestions failed after 2 attempts: {e}")
                return self._fallback(weak_sections)

        return {}

    def _validate(self, result: dict, weak_sections: dict) -> None:
        """Ensure every weak section is present and has the required keys."""
        for section in weak_sections:
            if section not in result:
                raise ValueError(f"Missing section '{section}' in suggestions response")
            section_data = result[section]
            for key in ("reason", "priority", "suggestions"):
                if key not in section_data:
                    raise ValueError(f"Missing key '{key}' in section '{section}'")
            if not isinstance(section_data["suggestions"], list) or len(section_data["suggestions"]) == 0:
                raise ValueError(f"'suggestions' must be a non-empty list in section '{section}'")
            for suggestion in section_data["suggestions"]:
                for key in ("title", "action", "why"):
                    if key not in suggestion:
                        raise ValueError(f"Missing key '{key}' in suggestion under '{section}'")

    def _fallback(self, weak_sections: dict) -> dict:
        """
        Return a minimal valid structure when both LLM attempts fail,
        so the frontend never receives a broken response.
        """
        fallback = {}
        for section, data in weak_sections.items():
            fallback[section] = {
                "reason": data["evidence"],
                "priority": data["priority"],
                "suggestions": [
                    {
                        "title": "Review this section",
                        "action": "Refer to the evidence above to identify what is missing in this section.",
                        "why": "This section scored below 70% of its maximum and needs improvement.",
                    }
                ],
            }
        return fallback
