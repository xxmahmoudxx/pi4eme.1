# AI Accountant Report Assistant - Implementation Notes

## 1) Recommended Architecture

- Angular frontend: accountant workflow UI (generate, edit, approve/send, history).
- NestJS backend: auth, role checks, `companyId` scoping, report persistence, PDF generation, email delivery.
- Existing `ml-service`: unchanged, still used for ML/OCR analytics endpoints.
- New `ai-agent-service`: separate Python service for Gemini report generation and optional web research.
- MongoDB: report document storage and audit/status history.

Flow:

1. Angular calls NestJS.
2. NestJS builds strict company-scoped context using authenticated `companyId`.
3. NestJS calls `ai-agent-service`.
4. AI service returns normalized JSON report.
5. NestJS stores draft.
6. Accountant edits and approves manually.
7. NestJS generates PDF and sends email to same-company owner.
8. NestJS stores status transitions/audit trail.

## 2) Environment Variables

### Backend (`backend/.env`)

- `AI_AGENT_SERVICE_URL` (default `http://localhost:5001`)
- `AI_AGENT_TIMEOUT_MS` (default `120000`)
- `ACCOUNTANT_REPORT_PDF_DIR` (default `storage/accountant-reports`)

Existing required backend keys still apply:

- `MONGODB_URI`
- `JWT_SECRET`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`
- `ML_SERVICE_URL`
- `GEMINI_API_KEY` (existing chatbot usage)

See `backend/.env.example`.

### AI Agent (`ai-agent-service/.env`)

- `AI_AGENT_PORT` (default `5001`)
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default `gemini-1.5-flash`)
- `GEMINI_API_ENDPOINT` (default Google Generative Language endpoint)
- `AI_AGENT_TIMEOUT_SECONDS`
- `AI_AGENT_MAX_OUTPUT_TOKENS`
- `AI_AGENT_USE_WEB_RESEARCH`
- `AI_AGENT_MAX_WEB_CITATIONS`

See `ai-agent-service/.env.example`.

## 3) External Services / Credentials Needed

- Gemini API key (server-side in `ai-agent-service/.env`).
- SMTP provider credentials (server-side in `backend/.env`).
- MongoDB connection string.
- Existing ML service URL.

## 4) Main Schema Change

New Mongo collection:

- `accountant_ai_reports`

Key fields:

- `companyId`, `createdByUserId`, `ownerUserId`, `ownerEmail`
- `status` (`DRAFT_GENERATED`, `EDITED`, `APPROVED`, `SENT`, `FAILED_TO_SEND`)
- `aiDraft`, `editedDraft`, `finalApprovedText`, `shortEmailSummary`
- `sections`, `citations`, `usedWebResearch`
- `generatedAt`, `approvedAt`, `sentAt`
- `emailStatus`, `pdfPath`
- `generationErrors`, `sendErrors`
- `statusHistory`, `auditTrail`

## 5) Role and Company Isolation Rules Implemented

- Generation/edit/regenerate/approve-send endpoints are `Accountant` only.
- History/detail endpoints allow `Accountant` and `CompanyOwner`.
- Every report query is filtered by authenticated `companyId`.
- Owner view is restricted to approved/sent states.
- Send target is enforced to same-company owner email (override to another email is blocked).

## 6) Files Added/Modified

### Added

- `backend/src/accountant-ai-reports/accountant-ai-reports.module.ts`
- `backend/src/accountant-ai-reports/accountant-ai-reports.controller.ts`
- `backend/src/accountant-ai-reports/accountant-ai-reports.service.ts`
- `backend/src/accountant-ai-reports/accountant-ai-reports-agent.service.ts`
- `backend/src/accountant-ai-reports/accountant-ai-reports-pdf.service.ts`
- `backend/src/accountant-ai-reports/schemas/accountant-ai-report.schema.ts`
- `backend/src/accountant-ai-reports/dto/generate-accountant-ai-report.dto.ts`
- `backend/src/accountant-ai-reports/dto/update-accountant-ai-report.dto.ts`
- `backend/src/accountant-ai-reports/dto/approve-and-send-accountant-ai-report.dto.ts`
- `backend/src/accountant-ai-reports/dto/report-history-query.dto.ts`
- `backend/.env.example`
- `ai-agent-service/app.py`
- `ai-agent-service/requirements.txt`
- `ai-agent-service/.env.example`
- `ai-agent-service/README.md`
- `frontend/src/app/models/accountant-ai-report.model.ts`
- `frontend/src/app/pages/accountant-ai-reports.component.ts`

### Modified

- `backend/src/app.module.ts`
- `backend/src/mail/mail.service.ts`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/components/sidebar.component.ts`
- `frontend/src/app/services/api.service.ts`

## 7) Install / Run Commands

### Backend

```bash
cd backend
npm install
npm run build
npm run start:dev
```

### AI Agent Service

```bash
cd ai-agent-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm start
```

## 8) API Endpoints

Base: `/accountant-ai-reports`

- `POST /generate` (Accountant)
- `POST /:id/regenerate` (Accountant)
- `PATCH /:id/draft` (Accountant)
- `POST /:id/approve-send` (Accountant)
- `GET /` (Accountant, CompanyOwner)
- `GET /:id` (Accountant, CompanyOwner)

## 9) Sample Requests

Generate:

```json
{
  "includeWebResearch": true,
  "focusAreas": ["cash flow", "inventory risk"],
  "customInstructions": "Prioritize actions achievable in 30 days."
}
```

Save edited draft:

```json
{
  "editedDraft": "## Executive Summary\nReviewed and adjusted by accountant...",
  "shortEmailSummary": "Reviewed report with key actions for next 30 days."
}
```

Approve and send:

```json
{
  "finalApprovedText": "## Executive Summary\nFinal approved text...",
  "shortEmailSummary": "Final approved report attached."
}
```

## 10) Expected Report JSON Contract (AI Agent Output)

- `executiveSummary`
- `businessState`
- `risks[]`
- `opportunities[]`
- `inventoryActions[]`
- `purchasingActions[]`
- `pricingActions[]`
- `supplierActions[]`
- `actionPlan[]`
- `confidenceNote`
- `shortEmailSummary`
- `fullReportMarkdown`
- `citations[]`

## 11) End-to-End Testing Steps

1. Start MongoDB, backend, ml-service, ai-agent-service, frontend.
2. Log in as `Accountant` user tied to a company with sales/purchase data.
3. Open `/accountant-ai-reports`.
4. Click `Generate AI Report`.
5. Verify draft, sections, citations, and history entry.
6. Edit draft and click `Save Draft`.
7. Click `Approve And Send` and confirm.
8. Verify report status transitions:
   - `DRAFT_GENERATED` -> `EDITED` -> `APPROVED` -> `SENT` (or `FAILED_TO_SEND`).
9. Verify owner inbox received email + attached PDF.
10. Check DB document audit trail and error fields.

## 12) Edge Case Tests

- Missing company owner email -> generation should fail with clear error.
- AI service down -> generation should fail gracefully; no cross-company leakage.
- Web research enabled but unavailable -> report still generated from internal data.
- SMTP failure -> status becomes `FAILED_TO_SEND` with `sendErrors` populated.
- CompanyOwner tries to generate/send -> forbidden.
- Cross-company report ID access -> not found/forbidden due company filter.
