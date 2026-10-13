"""AI Analyst — live, evidence-aware analysis of the sample preview dataset.

The frontend sends the question plus the exact dataset slice it is displaying.
The model is instructed to cite only numbers present in that context and to tag
every finding, so the response renders into the same evidence pills the static
sample answers use.

Uses the Gemini API directly. Non-streaming on purpose: the UI renders a parsed,
structured set of findings at once rather than a prose stream.
"""

import json
import logging
import os
import re

import httpx

from fastapi import APIRouter, HTTPException
from models.analyst import AnalystAnswer, AnalystContext, AnalystFinding, AnalystQuestionRequest

logger = logging.getLogger(__name__)
router = APIRouter()

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"

VALID_KINDS = {"observed", "calculated", "estimate", "explanation", "limitation"}

LIVE_NOTE = (
    "Live AI analysis of the illustrative sample dataset shown above — "
    "not real customer data, and not a guaranteed explanation."
)

SYSTEM_MESSAGE = """You are CPGist AI Analyst, an evidence-aware analytics assistant for the consumer packaged goods (CPG/FMCG) industry.

You answer business questions about a SAMPLE dataset that the user is currently viewing. The dataset slice is supplied to you as JSON. It is synthetic, illustrative data — never describe it as real market performance or customer results.

ABSOLUTE RULES:
1. Only cite numbers that appear in the supplied context JSON. Never invent, extrapolate beyond, or recall outside figures.
2. If the question requires data that is not in the context (competitor pricing, out-of-stock rates, household panel data, margins, trade spend, inventory, regional splits, causal attribution, etc.), you MUST say so in a "limitation" finding.
3. Never claim a cause is proven. Causal statements belong in "explanation" findings and must be framed as plausible hypotheses to verify.
4. Be specific and quantitative. Reference actual retailer names, brand names, weeks, and values from the context.

Every finding must be tagged with exactly one kind:
- "observed": a metric read directly from the supplied context.
- "calculated": a comparison or ratio you computed from supplied numbers (state the arithmetic basis).
- "estimate": a projection or extrapolation. Label it clearly as a projection.
- "explanation": a plausible driver or hypothesis, explicitly unproven.
- "limitation": evidence the dataset lacks, or why the question can't be fully answered.

Return 3 to 5 findings. ALWAYS include at least one "observed" finding and at least one "limitation" finding.

Respond with ONLY a JSON object, no markdown fencing and no prose outside it:
{"findings": [{"kind": "observed", "text": "..."}, {"kind": "limitation", "text": "..."}]}

Each "text" is one or two plain sentences, under 320 characters, written for a CPG executive."""


def _context_payload(ctx: AnalystContext) -> str:
    return json.dumps(
        {
            "selection": {
                "time_period": ctx.period_label,
                "brand_filter": ctx.brand_filter,
                "retailer_filter": ctx.retailer_filter,
                "prior_period_available": ctx.has_prior_period,
            },
            "kpis": [k.model_dump(exclude_none=True) for k in ctx.kpis],
            "weekly_sales_vs_baseline": [w.model_dump() for w in ctx.weekly],
            "brand_totals": [b.model_dump() for b in ctx.brands],
            "retailer_breakdown": [r.model_dump() for r in ctx.retailers],
        },
        separators=(",", ":"),
    )


def _extract_json_object(raw: str) -> str:
    """Isolate the JSON object from a model reply, tolerating ```json fences."""
    text = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(.+?)```", text, re.DOTALL)
    if fenced:
        return fenced.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    return text[start : end + 1] if start != -1 and end > start else text


def _findings_items(payload: str) -> list:
    """Parse the payload and return its raw `findings` list."""
    data = json.loads(payload)
    items = data.get("findings") if isinstance(data, dict) else None
    if not isinstance(items, list) or not items:
        raise ValueError("no findings array in model reply")
    return items


def _coerce_finding(item: object) -> AnalystFinding | None:
    """Validate one raw finding; None if it isn't usable."""
    if not isinstance(item, dict):
        return None
    kind = str(item.get("kind", "")).strip().lower()
    body = str(item.get("text", "")).strip()
    if kind not in VALID_KINDS or not body:
        return None
    return AnalystFinding(kind=kind, text=body[:600])  # type: ignore[arg-type]


def _parse_findings(raw: str) -> list[AnalystFinding]:
    """Extract and validate the tagged findings from the model's reply."""
    findings: list[AnalystFinding] = []
    for item in _findings_items(_extract_json_object(raw))[:6]:
        finding = _coerce_finding(item)
        if finding:
            findings.append(finding)
    if not findings:
        raise ValueError("no valid findings after validation")
    return findings


@router.post("/analyst/ask", response_model=AnalystAnswer)
async def ask_analyst(payload: AnalystQuestionRequest) -> AnalystAnswer:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="AI Analyst is not configured. Set GEMINI_API_KEY in the backend environment; sample investigations remain available.")

    question = payload.question.strip()
    prompt = (
        f"Business question: {question}\n\n"
        f"Sample dataset currently displayed (JSON):\n{_context_payload(payload.context)}\n\n"
        "Return the JSON object of tagged findings now."
    )
    request_body = {
        "system_instruction": {"parts": [{"text": SYSTEM_MESSAGE}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent",
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=request_body,
            )
        if response.status_code != 200:
            logger.error("Gemini AI Analyst request failed with HTTP status %s.", response.status_code)
            raise HTTPException(status_code=502, detail="The AI Analyst could not be reached. Please try again; sample investigations remain available offline.")
        result = response.json()
        candidates = result.get("candidates") or []
        parts = ((candidates[0].get("content") or {}).get("parts") or []) if candidates else []
        reply = "\n".join(str(part.get("text", "")) for part in parts if isinstance(part, dict) and part.get("text"))
        if not reply.strip():
            raise ValueError("Gemini returned no text content")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gemini AI Analyst upstream call failed")
        raise HTTPException(status_code=502, detail="The AI Analyst could not be reached. Please try again; sample investigations remain available offline.")

    try:
        findings = _parse_findings(reply)
    except Exception:
        logger.warning("Gemini AI Analyst returned unparseable output")
        raise HTTPException(status_code=502, detail="The AI Analyst returned a response CPGist could not structure safely. Please rephrase your question and try again.")

    return AnalystAnswer(question=question, findings=findings, note=LIVE_NOTE, source="live_ai")
