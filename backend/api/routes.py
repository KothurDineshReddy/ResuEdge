import logging
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.evaluator import ResumeEvaluator, MAX_BONUS_POINTS, MIN_FINAL_SCORE, MAX_FINAL_SCORE
from core.prompt import SUPPORTED_MODELS, DEFAULT_MODEL
from core.config import MAX_UPLOAD_SIZE_MB
from core.pdf import PDFHandler
from core.github import fetch_and_display_github_info
from core.transform import (
    convert_json_resume_to_text,
    convert_github_data_to_text,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class ModelsResponse(BaseModel):
    models: list[str]
    default: str


@router.get("/models", response_model=ModelsResponse)
async def get_models():
    """Return supported Gemini models for the frontend dropdown."""
    return {"models": SUPPORTED_MODELS, "default": DEFAULT_MODEL}


@router.post("/evaluate")
async def evaluate_resume(
    pdf: UploadFile = File(...),
    gemini_api_key: str = Form(...),
    model: str = Form(DEFAULT_MODEL),
):
    """
    Full evaluation pipeline:
      1. Parse PDF → JSON Resume
      2. Enrich with GitHub data (if profile found)
      3. Score with Gemini (call 1)
      4. Generate suggestions for weak sections (call 2)
    The gemini_api_key is used only for this request and never stored.
    """
    # Validate model
    if model not in SUPPORTED_MODELS:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {model}. Choose from {SUPPORTED_MODELS}")

    # Validate file type
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Write uploaded PDF to a temp file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        content = await pdf.read()
        size_mb = len(content) / (1024 * 1024)
        if size_mb > MAX_UPLOAD_SIZE_MB:
            raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_MB}MB.")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Step 1: Parse PDF
        logger.info(f"Parsing PDF: {pdf.filename}")
        pdf_handler = PDFHandler(model_name=model, api_key=gemini_api_key)
        json_resume = pdf_handler.process_pdf(tmp_path)

        # Step 2: GitHub enrichment
        github_data = None
        try:
            github_data = fetch_and_display_github_info(
                json_resume, model_name=model, api_key=gemini_api_key
            )
        except Exception as e:
            logger.warning(f"GitHub enrichment failed (non-fatal): {e}")

        # Step 3: Build resume text for evaluation
        resume_text = convert_json_resume_to_text(json_resume)
        if github_data:
            resume_text += "\n\n" + convert_github_data_to_text(github_data)

        # Step 4: Score
        evaluator = ResumeEvaluator(api_key=gemini_api_key, model_name=model)
        evaluation = evaluator.evaluate_resume(resume_text)

        # Build final score
        scores = evaluation.scores.model_dump()
        total_score = sum(min(s["score"], s["max"]) for s in scores.values())
        total_score += evaluation.bonus_points.total
        total_score -= evaluation.deductions.total
        total_score = max(MIN_FINAL_SCORE, min(total_score, MAX_FINAL_SCORE))

        candidate_name = (
            json_resume.basics.name
            if json_resume and json_resume.basics and json_resume.basics.name
            else "Candidate"
        )

        # Step 5: Suggestions for weak sections (second Gemini call)
        from core.suggestions import SuggestionsEngine
        engine = SuggestionsEngine(api_key=gemini_api_key, model_name=model)
        suggestions = engine.generate(
            evaluation=evaluation,
            candidate_name=candidate_name,
            total_score=round(total_score, 1),
            max_score=100 + MAX_BONUS_POINTS,
        )

        return JSONResponse(content={
            "candidate_name": candidate_name,
            "total_score": round(total_score, 1),
            "max_score": 100 + MAX_BONUS_POINTS,
            "scores": scores,
            "bonus_points": evaluation.bonus_points.model_dump(),
            "deductions": evaluation.deductions.model_dump(),
            "suggestions": suggestions,
            "key_strengths": evaluation.key_strengths,
            "areas_for_improvement": evaluation.areas_for_improvement,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)
