# AI Accountant Agent Service

This service generates structured accountant reports using internal business context and optional web research.

## Run

```bash
cd ai-agent-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

## Endpoints

- `GET /health`
- `POST /reports/generate`

The service expects company-scoped context from the NestJS backend and returns a strict JSON report contract.
