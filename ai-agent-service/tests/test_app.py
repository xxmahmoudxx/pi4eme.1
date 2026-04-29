"""Basic tests for the AI Agent Service Flask app.

External calls (Gemini, DuckDuckGo) are NEVER hit — fallback path is forced
via empty GEMINI_API_KEY (set in conftest.py).
"""
import pytest

import app as ai_app


@pytest.fixture
def client():
    ai_app.app.config["TESTING"] = True
    with ai_app.app.test_client() as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "ok"
    assert body["service"] == "accountant-ai-agent"


def test_generate_report_requires_company_id(client):
    response = client.post("/reports/generate", json={"context": {}})
    assert response.status_code == 400
    body = response.get_json()
    assert "companyId" in body.get("error", "")


def test_generate_report_requires_context_object(client):
    response = client.post(
        "/reports/generate",
        json={"companyId": "C1", "context": "not-an-object"},
    )
    assert response.status_code == 400


def test_generate_report_uses_fallback_without_api_key(client):
    payload = {
        "companyId": "C1",
        "context": {
            "company": {"companyName": "Acme"},
            "internalFacts": {
                "kpis": {"estimatedProfit": 1000},
                "analytics": {
                    "healthScore": {"score": 75, "status": "GOOD"},
                    "stockoutRisks": [],
                    "productPerformance": [],
                },
            },
        },
        "includeWebResearch": False,
    }
    response = client.post("/reports/generate", json=payload)
    assert response.status_code == 200
    body = response.get_json()
    assert "report" in body
    assert "executiveSummary" in body["report"]
    assert isinstance(body["report"]["risks"], list)
    assert isinstance(body["report"]["actionPlan"], list)
    assert body["usedWebResearch"] is False
    assert any("GEMINI_API_KEY" in w for w in body["generationWarnings"])


def test_clean_text_helper():
    assert ai_app.clean_text("  hello  ") == "hello"
    assert ai_app.clean_text(None) == ""
    assert ai_app.clean_text(42) == "42"


def test_clean_string_list_helper():
    assert ai_app.clean_string_list(["a", "  b ", "", None]) == ["a", "b"]
    assert ai_app.clean_string_list("not-a-list") == []


def test_extract_json_strips_code_fence():
    text = """```json
{"a": 1}
```"""
    assert ai_app.extract_json(text) == {"a": 1}


def test_extract_json_finds_object_in_noise():
    text = "blah blah {\"a\": 2} trailing"
    assert ai_app.extract_json(text) == {"a": 2}
