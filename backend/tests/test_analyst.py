"""AI Analyst endpoint: validation contract + live structured response."""

import httpx

CONTEXT = {
    "period_label": "Last 12 weeks",
    "brand_filter": "All brands",
    "retailer_filter": "All retailers",
    "has_prior_period": True,
    "kpis": [
        {"label": "Gross sales", "value": "$5.33M", "change": "-3.9%"},
        {"label": "Units sold", "value": "1.27M", "change": "-3.8%"},
    ],
    "weekly": [
        {"week": "W51", "sales": "$430K", "baseline": "$412K"},
        {"week": "W52", "sales": "$447K", "baseline": "$418K"},
    ],
    "brands": [{"brand": "OatCraft Beverages", "sales": "$1.79M", "growth": "-2.1%"}],
    "retailers": [
        {
            "retailer": "Target",
            "sales": "$1.42M",
            "growth": "-0.4%",
            "velocity": "61.2 units/store/wk",
            "acv": "82.0%",
            "promo_share": "7.9%",
        }
    ],
}

VALID_KINDS = {"observed", "calculated", "estimate", "explanation", "limitation"}


def test_analyst_rejects_short_question(client: httpx.Client):
    res = client.post("/analyst/ask", json={"question": "hi", "context": CONTEXT})
    assert res.status_code == 422


def test_analyst_requires_context(client: httpx.Client):
    res = client.post("/analyst/ask", json={"question": "What is driving the sales decline?"})
    assert res.status_code == 422


def test_analyst_returns_tagged_findings(client: httpx.Client):
    res = client.post(
        "/analyst/ask",
        json={"question": "What is driving the gross sales decline in this selection?", "context": CONTEXT},
        timeout=90.0,
    )
    # 502 is an acceptable upstream-failure outcome; anything else must be a well-formed answer.
    if res.status_code == 502:
        return
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["source"] == "live_ai"
    assert body["findings"], "expected at least one finding"
    kinds = {f["kind"] for f in body["findings"]}
    assert kinds <= VALID_KINDS
    assert "observed" in kinds
    assert "limitation" in kinds, "evidence-aware contract requires a stated limitation"
    assert all(f["text"].strip() for f in body["findings"])
