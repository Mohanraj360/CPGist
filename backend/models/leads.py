"""Request/response models for the public website's server-backed flows.

Contact/demo leads, data-deletion requests, and the sign-in entry point's
honest "auth not configured" contract. Every model here has a hand-written
TS mirror in frontend/src/lib/api.ts (or the page that consumes it).
"""

import os
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, EmailStr, Field

POLICY_VERSION = os.environ.get("CPGIST_POLICY_VERSION", "draft-0.9")


def _utcnow() -> datetime:
    # Aware UTC on write, so Pydantic serialises the offset and JS parses it.
    return datetime.now(timezone.utc)


BusinessType = Literal["CPG Brand", "Retailer", "Consulting Firm", "Analytics Team", "Other"]
PrimaryChallenge = Literal[
    "Sales and Category Analysis",
    "Brand and Product Performance",
    "Retailer and Distribution Analysis",
    "Pricing and Promotion Analysis",
    "AI-Assisted Analytics",
    "Reporting and Business Reviews",
    "Other",
]


# ---------------------------------------------------------------------------
# Contact / demo requests
# ---------------------------------------------------------------------------


class ContactLeadCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    work_email: EmailStr
    company: str = Field(min_length=2, max_length=160)
    job_title: str = Field(min_length=2, max_length=120)
    business_type: BusinessType
    primary_challenge: PrimaryChallenge
    message: str | None = Field(default=None, max_length=2000)
    # Separate, optional, never pre-checked marketing consent.
    marketing_opt_in: bool = False


class ContactLeadReceipt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    status: Literal["received"] = "received"
    received_at: datetime = Field(default_factory=_utcnow)
    message: str = (
        "Thanks — your request was received. We'll review the details and reply "
        "to your work email."
    )


# ---------------------------------------------------------------------------
# Data-deletion requests
# ---------------------------------------------------------------------------


class DataDeletionRequestCreate(BaseModel):
    account_email: EmailStr
    request_details: str = Field(min_length=10, max_length=2000)


class DataDeletionRequestReceipt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    status: Literal["received"] = "received"
    verification: Literal["pending"] = "pending"
    received_at: datetime = Field(default_factory=_utcnow)
    message: str = (
        "Your request was recorded. Before any data is deleted or disclosed we "
        "must verify that this email belongs to you, so nothing has been deleted "
        "yet."
    )
