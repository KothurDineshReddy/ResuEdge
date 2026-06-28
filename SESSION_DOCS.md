# Session Documentation — ResuEdge & hiring-agent Bug Fixes

**Date:** 2026-06-27  
**Author:** Dinesh Reddy (KothurDineshReddy)  
**Session scope:** Two major workstreams — upstream open source bug fixes + new portfolio project

---

## Part 1 — Open Source Contribution: hiring-agent Bug Fixes

### Project background
`interviewstreet/hiring-agent` is a HackerRank open source tool that evaluates resumes using LLMs and produces a structured score across four categories. The user cloned it locally and the task was to find bugs, fix them, and raise a pull request back to the upstream repository.

### Branch and PR
- Local branch: `fix/scoring-bugs`
- Fork: `https://github.com/KothurDineshReddy/hiring-agent`
- PR raised to upstream: `interviewstreet/hiring-agent`

---

### Bug 1 — `CategoryScore.score` not clamped at `max` (High severity)
**File:** `models.py`  
**Problem:** The Pydantic model `CategoryScore` had a `score` field but no constraint preventing the LLM from returning a value higher than `max`. If Gemini hallucinated a score of, say, 45 for a category with max 40, it passed validation silently and inflated the total.  
**Decision:** Add a `@field_validator` on `score` that clamps it to `max` at parse time.  
**Fix:**
```python
@field_validator("score")
@classmethod
def score_must_not_exceed_max(cls, v: float, info) -> float:
    max_val = (info.data or {}).get("max")
    if max_val is not None and v > max_val:
        return float(max_val)
    return v
```
**Why a validator, not a `le` constraint:** `le` requires a static value; `max` is dynamic per instance, so a cross-field validator was needed.

---

### Bug 2 — Pydantic v2 `min_length`/`max_length` used wrong on list fields (Medium severity)
**File:** `models.py`  
**Problem:** `key_strengths` and `areas_for_improvement` were declared as:
```python
key_strengths: List[str] = Field(min_items=1, max_items=5)
areas_for_improvement: List[str] = Field(min_items=1, max_items=3)
```
`min_items`/`max_items` are Pydantic v1 syntax. In Pydantic v2 they are silently ignored — no validation happened.  
**Fix:**
```python
key_strengths: List[str] = Field(min_length=1, max_length=5)
areas_for_improvement: List[str] = Field(min_length=1, max_length=3)
```

---

### Bug 3 — `score.py` final score denominator showed `/100` instead of `/120` (Medium severity)
**File:** `score.py`  
**Problem:** The system displays the final score as `X / Y`. The maximum achievable score is 100 base + 20 bonus = 120, but the denominator was hardcoded as `/100`, misleading evaluators.  
**Fix:** Use `MAX_FINAL_SCORE` constant (120) in the display string.  
Also fixed: the final score had no lower bound clamp. A candidate with heavy deductions could theoretically go below zero with no floor. Added:
```python
total_score = max(MIN_FINAL_SCORE, min(total_score, MAX_FINAL_SCORE))
```

---

### Bug 4 — `transform.py` CSV export ignored bonus/deductions in `total_score` (Medium severity)
**File:** `transform.py` — `convert_evaluation_to_csv()`  
**Problem:** The CSV export summed only raw category scores. Bonus points and deductions (which can swing the score by up to +20/−20) were never included in the `total_score` column, making the CSV inconsistent with the displayed final score.  
**Fix:** After summing category scores, add bonus and subtract deductions:
```python
total_score += evaluation.bonus_points.total
total_score -= evaluation.deductions.total
total_score = max(MIN_FINAL_SCORE, min(total_score, MAX_FINAL_SCORE))
```
Also fixed: individual category scores in the CSV were not capped at their `max`, meaning a pre-clamp score could appear in the CSV even though the validator already clamped it for scoring purposes.

---

### Bug 5 — `resume_evaluation_system_message.jinja` had wrong Hacktoberfest point range (Low severity)
**File:** `prompts/templates/resume_evaluation_system_message.jinja`  
**Problem:** The prompt told the LLM that Hacktoberfest participation was worth 5–8 bonus points. The actual scoring spec defined it as 3–5 points. This caused the LLM to over-award bonus points for Hacktoberfest.  
**Fix:** Corrected range to `3-5pts`.  
Also removed a stale `candidate_name` reference in the required fields section — the field was removed from the schema but not from the prompt.

---

## Part 2 — New Portfolio Project: ResuEdge

### What is ResuEdge?
A standalone full-stack web application that evaluates resumes using Google Gemini and provides:
- Section-level scores across 4 categories
- Personalized improvement suggestions for weak sections
- Downloadable PDF evaluation report
- Per-request API key — no storage, no server-side persistence

Built on top of hiring-agent's core evaluation logic with significant new architecture.  
Repo: `https://github.com/KothurDineshReddy/ResuEdge`  
License: MIT (dual attribution — HackerRank original + Dinesh Reddy ResuEdge)

---

## Architecture Decisions

### Decision 1 — Gemini-only, no multi-provider support
**Options considered:** Keep Ollama + Gemini support from hiring-agent, or simplify to Gemini only.  
**Decision:** Gemini only.  
**Why:** Portfolio project needs simplicity, not enterprise flexibility. Removing Ollama eliminates `OllamaProvider`, `ModelProvider.OLLAMA` enum value, and all conditional provider-switching logic. Fewer code paths = fewer failure modes.

---

### Decision 2 — Per-request API key, never stored
**Requirement stated by user:** "Gemini stays live only during session, doesn't store any value — once hosted, if someone wants to use it they give API key and then run it."  
**Implementation:**
- React state holds the key in memory only (never localStorage, never cookie)
- Key is sent as a `Form` field in the multipart POST request
- Backend uses the key to instantiate `GeminiProvider`, makes the LLM calls, then the key goes out of scope — Python GC reclaims it
- Key is never logged, never written to disk, never cached
- `GeminiProvider` is instantiated fresh per request with the caller-supplied key

---

### Decision 3 — FastAPI backend + React frontend (full-stack split)
**Options considered:**
- A: Keep as a CLI/script only
- B: Single-page React with FastAPI backend (chosen)
- C: Next.js or Vue instead of React

**Decision:** FastAPI + React 18 + TypeScript.  
**Why:** FastAPI is fast to build, auto-generates OpenAPI docs, handles async natively, and multipart file upload is first-class. React with TypeScript gives type safety across component interfaces. Vue was considered but React was chosen for portfolio visibility.

---

### Decision 4 — Suggestions only for weak sections (score < 70% of max)
**Options considered:**
- Always show suggestions for every section
- Only show when section < 60% of max
- Only show when section < 70% of max (chosen)

**Decision:** 70% threshold.  
**Why:** 70% is a meaningful signal — it means the candidate has a gap in that area, not just minor polish needed. Sections at 80%+ are already strong; suggestions there would be noise. The threshold is defined as a constant (`SUGGESTION_THRESHOLD = 0.70`) in both backend (`suggestions.py`) and frontend (`Results.tsx`).

---

### Decision 5 — Priority computed by code, not by LLM
**Options considered:**
- Let the LLM decide priority (High/Medium/Low)
- Compute priority deterministically from the score ratio (chosen)

**Decision:** Code computes priority.  
**Why:** LLM-computed priority adds a failure mode — if the LLM returns an unexpected string ("high priority", "CRITICAL", etc.) the frontend breaks. Computing it deterministically from the score ratio removes that risk entirely.  
**Rules:**
- `score / max < 0.40` → **High** priority
- `0.40 ≤ score / max < 0.70` → **Medium** priority

---

### Decision 6 — Second Gemini call for suggestions (not bundled with scoring)
**Options considered:**
- A: Bundle suggestions into the same scoring prompt (one call)
- B: Separate second LLM call (chosen)
- C: Rule-based suggestions without LLM

**Decision:** Separate second LLM call.  
**Why:** Bundling would make the scoring prompt massive and harder to tune. A focused second call with a dedicated Jinja template (`resume_suggestions.jinja`) gives the LLM a clean context: only the weak sections, only the candidate's score, only the task of generating suggestions. This also means if suggestions fail, scoring still succeeds.

---

### Decision 7 — No `estimated_score_gain`, no `estimated_effort`, no `action_plan`
**Originally proposed:** Include per-suggestion metadata like effort estimates and score impact.  
**Decision:** Drop all estimations — keep only `title`, `action`, `why`.  
**Why:** Any numerical estimate from an LLM is invented. Including fake numbers in a career tool is misleading. The three fields are enough: what to do, how to do it, and why it helps. Simpler schema = fewer JSON parse failures from the LLM.

---

### Decision 8 — GitHub enrichment kept as optional, non-fatal
The original hiring-agent fetched GitHub data to enrich scoring. This was kept in ResuEdge but wrapped in a try/except — if GitHub data fetch fails (rate limit, no GitHub URL in resume, network issue), the evaluation continues without it. The user never sees an error for this.

---

### Decision 9 — MIT License with dual attribution
**Why:** hiring-agent is MIT licensed. MIT permits using, modifying, and redistributing the code as long as the original copyright notice is preserved. ResuEdge:
- Preserves HackerRank's original MIT copyright in the LICENSE file
- Adds Dinesh Reddy's copyright below it for the ResuEdge additions
- Credits the original project in README under "Attribution"

---

## Files Created / Modified

### Backend (`/ResuEdge/backend/`)

| File | Status | What changed |
|------|--------|-------------|
| `main.py` | New | FastAPI app, CORS middleware, health endpoint, router mount |
| `core/config.py` | New | `CORS_ORIGINS`, `MAX_UPLOAD_SIZE_MB = 10` |
| `core/prompt.py` | Modified | Stripped to Gemini-only; defined `SUPPORTED_MODELS`, `DEFAULT_MODEL`, `MODEL_PARAMETERS` |
| `core/models.py` | Modified | Removed `OllamaProvider` and `ModelProvider.OLLAMA`; added `GeminiProvider` with exponential backoff; added `@field_validator` on `CategoryScore.score` |
| `core/llm_utils.py` | Modified | Simplified to Gemini-only `initialize_llm_provider(api_key)` |
| `core/evaluator.py` | Modified | Takes `api_key` per-request; defined `MAX_BONUS_POINTS=20`, `MIN_FINAL_SCORE=-20`, `MAX_FINAL_SCORE=120` |
| `core/suggestions.py` | **New** | `SuggestionsEngine` — second Gemini call for weak sections, 1 retry + fallback |
| `core/pdf.py` | Modified | Takes `api_key` per-request instead of from config |
| `core/github.py` | Modified | Removed `from pdf import logger` and `DEVELOPMENT_MODE`; added per-request `api_key`/`model_name` threading |
| `core/transform.py` | Modified | Removed `import pdb`; fixed `from .models import JSONResume`; capped CSV scores at max; added bonus/deductions to CSV total |
| `api/routes.py` | New | Full evaluation pipeline: validate → parse PDF → GitHub enrich → score → suggestions → JSON response; file size check |
| `prompts/template_manager.py` | Modified | Fixed `template_dir` to resolve relative to `__file__`; registered `resume_suggestions` template |
| `prompts/templates/resume_suggestions.jinja` | **New** | Suggestions prompt — candidate context, weak sections block, strict 3-suggestion JSON format |

### Frontend (`/ResuEdge/frontend/src/`)

| File | Status | What it does |
|------|--------|-------------|
| `types/index.ts` | New | TypeScript interfaces: `CategoryScore`, `Scores`, `BonusPoints`, `Deductions`, `Suggestion`, `SectionSuggestion`, `EvaluationResult`, `ModelId` |
| `api/evaluate.ts` | New | `evaluateResume()` and `fetchModels()` using axios; base URL from env var |
| `components/ApiKeyForm.tsx` | New | API key input with show/hide toggle + Gemini model dropdown (5 models) |
| `components/UploadPanel.tsx` | New | react-dropzone, PDF-only, shows filename + size on select |
| `components/ScoreCard.tsx` | New | Progress bar color-coded (green ≥70%, amber ≥40%, red <40%); "Needs Improvement" badge for weak sections |
| `components/SuggestionPanel.tsx` | New | Accordion per weak section; priority dot (red=High, amber=Medium); numbered suggestions with title/action/why |
| `components/ReportDownload.tsx` | New | jsPDF report — blue header, scores table, suggestions, strengths, "Generated by ResuEdge" footer |
| `pages/Home.tsx` | New | Two-step flow: Step 1 = ApiKeyForm → Step 2 = UploadPanel |
| `pages/Results.tsx` | New | Score banner circle, 2×2 section grid, SuggestionPanel, strengths, areas, download button |
| `App.tsx` | New | Single state machine: loading/result/error; `handleSubmit`, `handleReset`; navbar |
| `App.css` | New | Full custom CSS — no framework; responsive grid; all component styles |
| `index.css` | New | Base reset (box-sizing, margin, font) |

### Root files

| File | What it is |
|------|------------|
| `.gitignore` | Covers `.DS_Store`, `__pycache__`, `.env`, `node_modules`, `cache/` |
| `LICENSE` | MIT with dual attribution |
| `README.md` | Portfolio-quality with scoring table, tech stack, privacy note, attribution |

---

## Bugs Found and Fixed in ResuEdge (during development)

### Bug R1 — All core files using bare imports (Critical)
**Problem:** Files like `from models import`, `from llm_utils import` only work when the Python CWD is `backend/core/`. Running from `backend/` (as FastAPI does) breaks every import.  
**Fix:** Changed all to relative imports (`from .models import`) or absolute from package root (`from prompts.template_manager import`).

### Bug R2 — `github.py` imported `from pdf import logger` (Critical)
**Problem:** `pdf.py` does not export `logger`. This caused an `ImportError` on startup.  
**Fix:** Changed to `import logging; logger = logging.getLogger(__name__)`.

### Bug R3 — `github.py` imported `DEVELOPMENT_MODE` (Critical)
**Problem:** `DEVELOPMENT_MODE` was removed from `config.py` during cleanup. Import failed on startup.  
**Fix:** Removed the import and all caching logic that depended on it.

### Bug R4 — `transform.py` had `import pdb` (Low)
**Problem:** Debug artifact left in production code.  
**Fix:** Removed.

### Bug R5 — `template_manager.py` resolved template dir from CWD (High)
**Problem:** `template_dir = "prompts/templates"` only works when the process CWD is `backend/`. FastAPI launched from anywhere would fail to find templates.  
**Fix:**
```python
template_dir = os.path.join(os.path.dirname(__file__), "templates")
```

### Bug R6 — `resume_suggestions` template not registered (High)
**Problem:** `TemplateManager._load_templates()` had no entry for the new `resume_suggestions` template, causing `render_template("resume_suggestions", ...)` to return `None` silently.  
**Fix:** Added `"resume_suggestions": "resume_suggestions.jinja"` to the template registry dict.

### Bug R7 — `routes.py` missing `BaseModel` import (Medium)
**Problem:** `from pydantic import BaseModel` was accidentally removed during the sys.path cleanup, breaking the `ModelsResponse` class.  
**Fix:** Re-added the import.

### Bug R8 — `routes.py` used `candidate_name` and `total_score` before they were assigned (Critical)
**Problem:** The suggestions call (`SuggestionsEngine.generate(candidate_name=..., total_score=...)`) appeared in the code before the blocks that computed those two variables. This caused a `NameError` at runtime on every request.  
**Fix:** Reordered the route handler so the score computation and `candidate_name` extraction come before the suggestions call.

### Bug R9 — File size validated by import only, never enforced (Medium)
**Problem:** `MAX_UPLOAD_SIZE_MB` was imported in `routes.py` but the actual size check was never added to the handler. A 500MB PDF would be accepted and processed.  
**Fix:** Added after `pdf.read()`:
```python
size_mb = len(content) / (1024 * 1024)
if size_mb > MAX_UPLOAD_SIZE_MB:
    raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_MB}MB.")
```

### Bug R10 — `.DS_Store` files committed (Low)
**Problem:** macOS metadata files were tracked in git.  
**Fix:** `git rm -r --cached` to untrack, then added to `.gitignore`.

---

## Data Flow (end to end)

```
User fills API key + selects model (React state — key never leaves browser memory until submit)
        ↓
User drops PDF → UploadPanel reads File object
        ↓
App.handleSubmit() → evaluateResume(file, apiKey, model)
        ↓  [multipart/form-data POST to /api/evaluate]
routes.py: validate model → validate PDF type → read bytes → size check
        ↓
PDFHandler.process_pdf(tmp_path) → LLM call 1 (PDF → JSON Resume)
        ↓
fetch_and_display_github_info() → optional GitHub API fetch → text
        ↓
convert_json_resume_to_text() + convert_github_data_to_text() → resume_text string
        ↓
ResumeEvaluator.evaluate_resume(resume_text) → LLM call 2 (scoring → EvaluationData)
        ↓
Compute total_score: sum(min(score, max)) + bonus - deductions, clamped to [-20, 120]
Extract candidate_name from json_resume.basics.name
        ↓
SuggestionsEngine.generate() → identify weak sections (score < 70% of max)
If any weak: LLM call 3 (suggestions) → 1 retry → fallback if both fail
        ↓
JSONResponse → React Results.tsx renders score banner, ScoreCard grid, SuggestionPanel
        ↓
ReportDownload → jsPDF generates PDF client-side
```

---

## Suggestion JSON Schema

The LLM is asked to return this exact structure for each weak section:

```json
{
  "open_source": {
    "reason": "One sentence why this section scored low.",
    "priority": "High",
    "suggestions": [
      {
        "title": "Short action title",
        "action": "Concrete specific action the candidate should take.",
        "why": "Why this action directly improves this section's score."
      }
    ]
  }
}
```

Priority is **overwritten by code** after LLM returns, so the LLM's priority field is accepted but not trusted — the code recomputes it from the score ratio before storing.

---

## LLM Call Summary

| Call | What it does | Template |
|------|-------------|----------|
| 1 | Parse PDF → JSON Resume structured data | (inline prompt in `pdf.py`) |
| 2 | Score resume across 4 categories | `resume_evaluation_criteria.jinja` + `resume_evaluation_system_message.jinja` |
| 3 | Generate suggestions for weak sections | `resume_suggestions.jinja` |

All three calls use the same per-request `api_key` and the same `model` the user selected. Call 3 is skipped entirely if no sections are below the 70% threshold.

---

## Scoring System

| Category | Max Points |
|----------|-----------|
| Open Source Contributions | 30 |
| Self Projects | 25 |
| Production Experience | 30 |
| Technical Skills | 15 |
| **Base total** | **100** |
| Bonus (Hacktoberfest, patents, etc.) | up to +20 |
| Deductions (gaps, red flags, etc.) | up to −20 |
| **Final range** | **−20 to 120** |

Score color coding (both frontend badge and PDF):
- ≥ 70% of max → Green
- ≥ 40% of max → Amber
- < 40% of max → Red

---

## What's Remaining (not done in this session)

| Phase | Task | Status |
|-------|------|--------|
| Phase 4 | Docker setup — `docker-compose.yml` with backend + frontend services | Pending |
| Phase 5 | README polish — screenshots / demo GIF for portfolio | Pending |

---

## Commits Made This Session

### hiring-agent repo (branch `fix/scoring-bugs`)
- `fix(scoring): fix score clamping, CSV accuracy, and prompt consistency`

### ResuEdge repo (branch `main`)
- Initial backend commit (all core + API files)
- Gemini suggestions engine + template
- `feat: add React frontend and fix backend validation bugs` (final commit — 26 files)
