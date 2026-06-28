# ResuEdge

<p align="center"><strong>AI-powered resume scorer with section-level improvement suggestions</strong></p>

<p align="center">
  Upload your resume PDF, get a detailed score breakdown across Open Source, Projects, Production Experience, and Technical Skills — plus actionable suggestions on exactly what to improve.
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/python-3.11%2B-blue.svg">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg">
  <img alt="React" src="https://img.shields.io/badge/React-18-61dafb.svg">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ed.svg">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-yellow.svg">
</p>

---

## What it does

1. Upload a resume PDF
2. Provide your Gemini API key (never stored — session only)
3. ResuEdge scores your resume across 4 categories (max 120 points)
4. For any section below 70% of its maximum, you get specific, actionable improvement suggestions
5. Download a clean PDF report of your full evaluation

---

## Scoring Breakdown

| Category | Max Points |
|---|---|
| Open Source Contributions | 35 |
| Self Projects | 30 |
| Production Experience | 25 |
| Technical Skills | 10 |
| Bonus Points | +20 |
| **Total** | **120** |

Suggestions are generated for any section that scores below **70% of its maximum**.

---

## Supported Models

- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.0-flash` _(default)_
- `gemini-2.0-flash-lite`

---

## Tech Stack

- **Backend** — FastAPI (Python 3.11+)
- **Frontend** — React 18 (TypeScript)
- **AI** — Google Gemini (user-provided API key)
- **PDF Parsing** — PyMuPDF
- **Containerization** — Docker + docker-compose

---

## Getting Started

### Docker (recommended)

```bash
git clone https://github.com/KothurDineshReddy/ResuEdge.git
cd ResuEdge
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Local development

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm start          # http://localhost:3000
```

---

## Privacy

Your Gemini API key is entered in the browser, sent to the backend only for the duration of your request, and never logged or stored. No resume data is persisted after the response is returned.

---

## Attribution

ResuEdge is built on top of [hiring-agent](https://github.com/interviewstreet/hiring-agent) by [HackerRank / InterviewStreet](https://github.com/interviewstreet), licensed under the MIT License.

Significant additions by [Dinesh Reddy Kothur](https://github.com/KothurDineshReddy):
- Full-stack React + FastAPI architecture
- Gemini-only, per-request API key model (no server-side key storage)
- Section-level improvement suggestions engine
- Downloadable PDF evaluation report
- Bug fixes contributed back upstream via [PR](https://github.com/interviewstreet/hiring-agent/pulls)

---

## License

[MIT](./LICENSE) © 2025 Dinesh Reddy Kothur
