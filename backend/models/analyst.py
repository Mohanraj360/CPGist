"""Models for the AI Analyst endpoint.

The frontend sends the question plus a compact summary of the sample dataset it
is currently displaying, so the model can only reason about numbers that are
actually on screen. Each model here has a hand-written TS mirror in
frontend/src/lib/analyst.ts.
"""

from typing import Literal

from pydantic import BaseModel, Field

FindingKind = Literal["observed", "calculated", "estimate", "explanation", "limitation"]


class AnalystKpi(BaseModel):
    label: str = Field(max_length=80)
    value: str = Field(max_length=40)
    change: str | None = Field(default=None, max_length=40)


class AnalystRetailerRow(BaseModel):
    retailer: str = Field(max_length=60)
    sales: str = Field(max_length=40)
    growth: str = Field(max_length=40)
    velocity: str = Field(max_length=40)
    acv: str = Field(max_length=40)
    promo_share: str = Field(max_length=40)


class AnalystBrandRow(BaseModel):
    brand: str = Field(max_length=60)
    sales: str = Field(max_length=40)
    growth: str = Field(max_length=40)


class AnalystWeekPoint(BaseModel):
    week: str = Field(max_length=12)
    sales: str = Field(max_length=40)
    baseline: str = Field(max_length=40)


class AnalystContext(BaseModel):
    """The slice of the sample dataset currently shown in the preview."""

    period_label: str = Field(max_length=60)
    brand_filter: str = Field(max_length=60)
    retailer_filter: str = Field(max_length=60)
    has_prior_period: bool
    kpis: list[AnalystKpi] = Field(max_length=8)
    weekly: list[AnalystWeekPoint] = Field(max_length=52)
    brands: list[AnalystBrandRow] = Field(max_length=10)
    retailers: list[AnalystRetailerRow] = Field(max_length=10)


class AnalystQuestionRequest(BaseModel):
    question: str = Field(min_length=5, max_length=400)
    context: AnalystContext


class AnalystFinding(BaseModel):
    kind: FindingKind
    text: str


class AnalystAnswer(BaseModel):
    question: str
    findings: list[AnalystFinding]
    note: str
    source: Literal["live_ai", "fallback"] = "live_ai"
