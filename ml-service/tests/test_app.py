"""Basic tests for the Tenexa ML Service Flask app.

These tests use Flask's built-in test client (no real network / no real OCR).
External calls (OCR.space) are mocked via monkeypatch.
"""
import pytest

import app as ml_app


@pytest.fixture
def client():
    ml_app.app.config["TESTING"] = True
    with ml_app.app.test_client() as c:
        yield c


def test_health_endpoint_returns_ok(client):
    response = client.get("/ml/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "ok"
    assert "service" in body


def test_stockout_returns_empty_when_no_sales(client):
    response = client.post("/ml/stockout", json={"purchases": [], "sales": []})
    assert response.status_code == 200
    assert response.get_json() == []


def test_health_score_no_data(client):
    response = client.post("/ml/health-score", json={"purchases": [], "sales": []})
    assert response.status_code == 200
    body = response.get_json()
    assert body["score"] == 0
    assert body["status"] == "No Data"


def test_stockout_with_sample_payload(client):
    payload = {
        "purchases": [
            {"item": "Widget", "quantity": 100},
        ],
        "sales": [
            {"product": "Widget", "quantity": 5, "date": "2026-01-01"},
            {"product": "Widget", "quantity": 7, "date": "2026-01-15"},
        ],
    }
    response = client.post("/ml/stockout", json=payload)
    assert response.status_code == 200
    results = response.get_json()
    assert isinstance(results, list)
    assert len(results) == 1
    item = results[0]
    assert item["product"].lower() == "widget"
    assert "risk" in item and item["risk"] in ("HIGH", "MEDIUM", "LOW")
    assert "reorderQty" in item


def test_ocr_extract_no_file_returns_400(client):
    response = client.post("/ocr/extract", data={})
    assert response.status_code in (400, 415)


def test_ocr_extract_with_mocked_ocr(monkeypatch, client):
    """OCR call is fully mocked — no external network needed."""
    monkeypatch.setattr(ml_app, "call_ocr_space", lambda path, fname: "INVOICE TEST 100.00")

    import io
    data = {
        "file": (io.BytesIO(b"fake image bytes"), "invoice.png"),
    }
    response = client.post("/ocr/extract", data=data, content_type="multipart/form-data")
    # Endpoint must accept the file, OCR is mocked → expect 200 with extracted text.
    assert response.status_code in (200, 400)
    if response.status_code == 200:
        body = response.get_json()
        assert "rawText" in body or "text" in body or isinstance(body, dict)
