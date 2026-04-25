import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Tuple

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS


def load_env_file() -> None:
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            clean = line.strip()
            if not clean or clean.startswith("#") or "=" not in clean:
                continue
            key, value = clean.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                os.environ[key] = value


load_env_file()

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-flash-lite-latest"
GEMINI_API_ENDPOINT = os.getenv(
    "GEMINI_API_ENDPOINT",
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
)
TIMEOUT_SECONDS = int(os.getenv("AI_AGENT_TIMEOUT_SECONDS", "90"))
MAX_OUTPUT_TOKENS = int(os.getenv("AI_AGENT_MAX_OUTPUT_TOKENS", "4096"))
WEB_RESEARCH_ENABLED = os.getenv("AI_AGENT_USE_WEB_RESEARCH", "true").lower() == "true"
MAX_WEB_CITATIONS = int(os.getenv("AI_AGENT_MAX_WEB_CITATIONS", "8"))


@app.get("/health")
def health() -> Any:
    return jsonify(
        {
            "status": "ok",
            "service": "accountant-ai-agent",
            "model": GEMINI_MODEL,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )


@app.post("/reports/generate")
def generate_report() -> Any:
    payload = request.get_json(silent=True) or {}
    company_id = str(payload.get("companyId", "")).strip()
    context = payload.get("context")
    include_web = bool(payload.get("includeWebResearch", False))
    focus_areas = payload.get("focusAreas", []) or []
    custom_instructions = str(payload.get("customInstructions", "")).strip()
    previous_draft = str(payload.get("previousDraft", "")).strip()

    if not company_id:
        return jsonify({"error": "companyId is required"}), 400
    if not isinstance(context, dict):
        return jsonify({"error": "context must be an object"}), 400

    used_web_research = False
    web_observations: List[str] = []
    web_citations: List[Dict[str, str]] = []
    warnings: List[str] = []

    if include_web and WEB_RESEARCH_ENABLED:
        try:
            web_observations, web_citations = run_web_research(context)
            used_web_research = len(web_citations) > 0
            if not used_web_research:
                warnings.append("Web research requested but no external sources were collected.")
        except Exception as research_error:
            warnings.append(f"Web research failed: {str(research_error)}")
            used_web_research = False
            web_observations = []
            web_citations = []

    generated_raw: Dict[str, Any]
    if GEMINI_API_KEY:
        try:
            prompt = build_prompt(
                context=context,
                focus_areas=focus_areas,
                include_web=include_web,
                web_observations=web_observations,
                custom_instructions=custom_instructions,
                previous_draft=previous_draft,
            )
            llm_text = call_gemini(prompt)
            generated_raw = extract_json(llm_text)
        except Exception as generation_error:
            warnings.append(f"Gemini generation failed, fallback used: {str(generation_error)}")
            generated_raw = build_fallback_report(context, web_observations)
    else:
        warnings.append("GEMINI_API_KEY not configured, fallback report generation used.")
        generated_raw = build_fallback_report(context, web_observations)

    report = normalize_report(generated_raw, web_citations)
    return jsonify(
        {
            "report": report,
            "usedWebResearch": used_web_research,
            "citations": report.get("citations", []),
            "generationWarnings": warnings,
        }
    )


def run_web_research(context: Dict[str, Any]) -> Tuple[List[str], List[Dict[str, str]]]:
    company_name = (
        context.get("company", {}).get("companyName")
        or context.get("internalFacts", {}).get("companyName")
        or "the company"
    )
    top_products = context.get("internalFacts", {}).get("topEntities", {}).get("products", []) or []
    top_product_names = [str(item.get("_id", "")).strip() for item in top_products if isinstance(item, dict)]
    top_product_names = [name for name in top_product_names if name][:2]

    base_queries = [
        f"{company_name} industry market trends 2026",
        "small business inventory optimization best practices",
        "supplier risk management recommendations for SMB",
    ]
    if top_product_names:
        base_queries.append(f"{top_product_names[0]} pricing pressure market trend")

    citations: List[Dict[str, str]] = []
    observations: List[str] = []
    seen_urls = set()

    for query in base_queries:
        if len(citations) >= MAX_WEB_CITATIONS:
            break
        try:
            response = requests.get(
                "https://api.duckduckgo.com/",
                params={
                    "q": query,
                    "format": "json",
                    "no_html": "1",
                    "skip_disambig": "1",
                },
                timeout=20,
            )
            if response.status_code != 200:
                continue
            payload = response.json()

            abstract_text = clean_text(payload.get("AbstractText", ""))
            abstract_url = clean_text(payload.get("AbstractURL", ""))
            abstract_source = clean_text(payload.get("AbstractSource", "DuckDuckGo"))
            heading = clean_text(payload.get("Heading", "External market observation"))

            if abstract_url and abstract_url not in seen_urls and abstract_text:
                seen_urls.add(abstract_url)
                citations.append(
                    {
                        "title": heading or query,
                        "url": abstract_url,
                        "source": abstract_source or "DuckDuckGo",
                        "snippet": abstract_text,
                    }
                )
                observations.append(f"{heading}: {abstract_text}")

            related_topics = payload.get("RelatedTopics", []) or []
            for topic in related_topics:
                if len(citations) >= MAX_WEB_CITATIONS:
                    break
                if not isinstance(topic, dict):
                    continue
                topic_url = clean_text(topic.get("FirstURL", ""))
                topic_text = clean_text(topic.get("Text", ""))
                if not topic_url or not topic_text or topic_url in seen_urls:
                    continue
                seen_urls.add(topic_url)
                title = topic_text.split(" - ")[0][:140]
                citations.append(
                    {
                        "title": title or "External observation",
                        "url": topic_url,
                        "source": "DuckDuckGo",
                        "snippet": topic_text,
                    }
                )
                observations.append(topic_text)
        except Exception:
            continue

    return observations[:MAX_WEB_CITATIONS], citations[:MAX_WEB_CITATIONS]


def build_prompt(
    context: Dict[str, Any],
    focus_areas: List[str],
    include_web: bool,
    web_observations: List[str],
    custom_instructions: str,
    previous_draft: str,
) -> str:
    schema = {
        "executiveSummary": "string",
        "businessState": "string",
        "risks": ["string"],
        "opportunities": ["string"],
        "inventoryActions": ["string"],
        "purchasingActions": ["string"],
        "pricingActions": ["string"],
        "supplierActions": ["string"],
        "actionPlan": ["string"],
        "confidenceNote": "string",
        "shortEmailSummary": "string",
        "fullReportMarkdown": "string",
        "citations": [
            {"title": "string", "url": "string", "source": "string", "snippet": "string"}
        ],
    }

    focus_text = ", ".join([clean_text(item) for item in focus_areas if clean_text(item)]) or "none"
    custom_text = custom_instructions or "none"
    previous_text = previous_draft[:6000] if previous_draft else "none"
    web_text = "\n".join([f"- {item}" for item in web_observations]) if web_observations else "none"

    return f"""
You are a finance-oriented AI accountant assistant for a business platform.
You must generate a professional, practical, and conservative business report.

Hard rules:
1) Use internal company data first. Do not invent numbers or facts.
2) If data is missing or uncertain, state uncertainty explicitly.
3) Separate internal facts from any external observations.
4) Keep recommendations actionable and prioritized.
5) Return ONLY valid JSON. No markdown wrapper, no explanation outside JSON.
6) Follow exactly this JSON shape:
{json.dumps(schema, indent=2)}

Focus areas requested: {focus_text}
Custom instructions from accountant: {custom_text}
Existing previous draft (if any): {previous_text}

External web research requested: {"yes" if include_web else "no"}
External observations:
{web_text}

Internal company context JSON:
{json.dumps(context, ensure_ascii=True)}
"""


def call_gemini(prompt: str) -> str:
    endpoint = GEMINI_API_ENDPOINT.format(model=GEMINI_MODEL)
    url = f"{endpoint}?key={GEMINI_API_KEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": MAX_OUTPUT_TOKENS,
        },
    }

    response = requests.post(url, json=body, timeout=TIMEOUT_SECONDS)
    if response.status_code >= 400:
        raise RuntimeError(f"Gemini API error {response.status_code}: {response.text[:400]}")

    payload = response.json()
    candidates = payload.get("candidates", []) or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")

    parts = candidates[0].get("content", {}).get("parts", []) or []
    if not parts:
        raise RuntimeError("Gemini returned empty content")

    text = parts[0].get("text", "")
    if not isinstance(text, str) or not text.strip():
        raise RuntimeError("Gemini returned empty text")
    return text


def extract_json(text: str) -> Dict[str, Any]:
    clean = text.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?", "", clean).strip()
        clean = re.sub(r"```$", "", clean).strip()

    try:
        return json.loads(clean)
    except Exception:
        match = re.search(r"\{.*\}", clean, flags=re.DOTALL)
        if not match:
            raise RuntimeError("No JSON object found in model response")
        return json.loads(match.group(0))


def build_fallback_report(context: Dict[str, Any], web_observations: List[str]) -> Dict[str, Any]:
    kpis = context.get("internalFacts", {}).get("kpis", {}) or {}
    analytics = context.get("internalFacts", {}).get("analytics", {}) or {}
    health = analytics.get("healthScore", {}) or {}
    score = health.get("score", "N/A")
    status = health.get("status", "UNKNOWN")

    estimated_profit = kpis.get("estimatedProfit", 0)
    profit_phrase = "positive" if estimated_profit >= 0 else "negative"

    risks = []
    stock_risks = analytics.get("stockoutRisks", []) or []
    if isinstance(stock_risks, list):
        high_risks = [entry for entry in stock_risks if str(entry.get("risk", "")).upper() == "HIGH"]
        if high_risks:
            risks.append(f"{len(high_risks)} products are in high stockout risk.")

    if estimated_profit < 0:
        risks.append("Estimated profit is negative based on current revenue and cost totals.")

    opportunities = []
    product_performance = analytics.get("productPerformance", []) or []
    if isinstance(product_performance, list):
        top = [item for item in product_performance if str(item.get("label", "")).lower().startswith("top")]
        if top:
            opportunities.append(
                f"{len(top)} products show top-performing behavior and can be scaled carefully."
            )

    if not opportunities:
        opportunities.append("Use current customer and supplier data to improve margin by prioritizing high-value segments.")

    inventory_actions = [
        "Review products with highest stockout risk and place phased replenishment orders.",
        "Set minimum stock thresholds for top-selling products.",
    ]
    purchasing_actions = [
        "Consolidate purchases for frequently ordered categories to improve negotiation leverage.",
        "Audit pending/rejected purchase patterns to reduce non-essential spend.",
    ]
    pricing_actions = [
        "Run a controlled margin review for low-margin products before price changes.",
    ]
    supplier_actions = [
        "Prioritize reliable suppliers with consistent delivery quality and competitive unit cost.",
    ]
    action_plan = [
        "Week 1: validate high-risk stock items and approve urgent replenishment.",
        "Week 2: review margin by product and identify corrective pricing or cost actions.",
        "Week 3: finalize supplier optimization and procurement cadence updates.",
    ]

    external_note = (
        f"External observations were limited. Sample notes: {'; '.join(web_observations[:2])}"
        if web_observations
        else "No external observations were included in fallback mode."
    )

    return {
        "executiveSummary": f"Current health score is {score} ({status}) with {profit_phrase} estimated profit. Focus on inventory risk and purchasing discipline.",
        "businessState": "Internal data indicates the company can improve planning quality by aligning procurement, pricing, and demand trends.",
        "risks": risks or ["Data quality limits confidence; validate key assumptions before major decisions."],
        "opportunities": opportunities,
        "inventoryActions": inventory_actions,
        "purchasingActions": purchasing_actions,
        "pricingActions": pricing_actions,
        "supplierActions": supplier_actions,
        "actionPlan": action_plan,
        "confidenceNote": "Confidence is moderate because this fallback relies on summarized data and not full model reasoning.",
        "shortEmailSummary": "Report approved: prioritize stockout mitigation, margin protection, and supplier optimization in the next three weeks.",
        "fullReportMarkdown": (
            "## Executive Summary\n"
            f"Current health score is {score} ({status}) with {profit_phrase} estimated profit.\n\n"
            "## Current Business State\n"
            "Internal KPIs and AI indicators suggest operational improvements are achievable through focused inventory and purchasing controls.\n\n"
            "## Key Risks\n"
            + "\n".join([f"- {item}" for item in (risks or ["Data quality limitations detected."])])
            + "\n\n## Key Opportunities\n"
            + "\n".join([f"- {item}" for item in opportunities])
            + "\n\n## Next Steps\n"
            + "\n".join([f"- {item}" for item in action_plan])
            + f"\n\n## External Note\n{external_note}"
        ),
        "citations": [],
    }


def normalize_report(raw: Dict[str, Any], web_citations: List[Dict[str, str]]) -> Dict[str, Any]:
    report = {
        "executiveSummary": clean_text(raw.get("executiveSummary", "")),
        "businessState": clean_text(raw.get("businessState", "")),
        "risks": clean_string_list(raw.get("risks", [])),
        "opportunities": clean_string_list(raw.get("opportunities", [])),
        "inventoryActions": clean_string_list(raw.get("inventoryActions", [])),
        "purchasingActions": clean_string_list(raw.get("purchasingActions", [])),
        "pricingActions": clean_string_list(raw.get("pricingActions", [])),
        "supplierActions": clean_string_list(raw.get("supplierActions", [])),
        "actionPlan": clean_string_list(raw.get("actionPlan", [])),
        "confidenceNote": clean_text(raw.get("confidenceNote", "")),
        "shortEmailSummary": clean_text(raw.get("shortEmailSummary", "")),
        "fullReportMarkdown": clean_text(raw.get("fullReportMarkdown", "")),
        "citations": normalize_citations(raw.get("citations", []), web_citations),
    }

    if not report["shortEmailSummary"]:
        report["shortEmailSummary"] = report["executiveSummary"][:400]

    if not report["fullReportMarkdown"]:
        report["fullReportMarkdown"] = (
            "## Executive Summary\n"
            f"{report['executiveSummary']}\n\n"
            "## Current Business State\n"
            f"{report['businessState']}\n\n"
            "## Risks\n"
            + "\n".join([f"- {item}" for item in report["risks"]])
            + "\n\n## Opportunities\n"
            + "\n".join([f"- {item}" for item in report["opportunities"]])
            + "\n\n## Action Plan\n"
            + "\n".join([f"- {item}" for item in report["actionPlan"]])
        )

    return report


def normalize_citations(
    model_citations: Any, web_citations: List[Dict[str, str]]
) -> List[Dict[str, str]]:
    citations = []
    if isinstance(model_citations, list):
        citations.extend(model_citations)
    citations.extend(web_citations)

    normalized: List[Dict[str, str]] = []
    seen = set()
    for citation in citations:
        if not isinstance(citation, dict):
            continue
        title = clean_text(citation.get("title", ""))
        url = clean_text(citation.get("url", ""))
        source = clean_text(citation.get("source", ""))
        snippet = clean_text(citation.get("snippet", ""))
        key = f"{title}|{url}"
        if not key.strip("|") or key in seen:
            continue
        seen.add(key)
        normalized.append(
            {
                "title": title,
                "url": url,
                "source": source,
                "snippet": snippet,
            }
        )
        if len(normalized) >= MAX_WEB_CITATIONS:
            break
    return normalized


def clean_string_list(values: Any) -> List[str]:
    if not isinstance(values, list):
        return []
    cleaned = [clean_text(value) for value in values]
    return [value for value in cleaned if value]


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


if __name__ == "__main__":
    port = int(os.getenv("AI_AGENT_PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
