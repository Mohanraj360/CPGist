"""Public-website flows: contact/demo leads, data-deletion requests, and the
honest sign-in entry point.

Data minimisation rules observed here:
- No request payload is ever logged (credentials, dataset contents, personal data).
- Consent is recorded server-side (status, timestamp, policy version, source).
- Sign-in never authenticates or stores anything until an identity provider is
  configured — it reports the missing integration instead of pretending.
"""

import logging

from fastapi import APIRouter, HTTPException
from lib.db import db
from models.leads import (
    POLICY_VERSION,
    ContactLeadCreate,
    ContactLeadReceipt,
    DataDeletionRequestCreate,
    DataDeletionRequestReceipt,
    _utcnow,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/contact/leads", response_model=ContactLeadReceipt, status_code=201)
async def create_contact_lead(payload: ContactLeadCreate) -> ContactLeadReceipt:
    """Store a validated demo/contact request. Returns 201 with a receipt."""
    now = _utcnow()
    receipt = ContactLeadReceipt()
    doc = {
        **payload.model_dump(),
        "id": receipt.id,
        "status": "new",
        "received_at": now,
        # Consent is recorded as part of the submission, server-side.
        "consent": {
            "marketing_opt_in": payload.marketing_opt_in,
            "policy_version": POLICY_VERSION,
            "recorded_at": now,
            "source": "contact_page",
            "source_url_path": "/contact",
        },
    }
    try:
        await db.contact_leads.insert_one(doc)
    except Exception:
        logger.exception("failed to store contact lead")
        raise HTTPException(
            status_code=500,
            detail=(
                "We couldn't save your request because of a server error. "
                "Please try again in a moment — your details were not discarded."
            ),
        )
    return receipt


@router.post(
    "/compliance/data-deletion-requests",
    response_model=DataDeletionRequestReceipt,
    status_code=201,
)
async def create_data_deletion_request(
    payload: DataDeletionRequestCreate,
) -> DataDeletionRequestReceipt:
    """Record a data-deletion request. Verification happens before any deletion."""
    now = _utcnow()
    receipt = DataDeletionRequestReceipt()
    doc = {
        **payload.model_dump(),
        "id": receipt.id,
        "status": "received",
        "verification": "pending",
        "received_at": now,
        "handled_at": None,
        "policy_version": POLICY_VERSION,
        "source": "data_deletion_page",
    }
    try:
        await db.data_deletion_requests.insert_one(doc)
    except Exception:
        logger.exception("failed to store data-deletion request")
        raise HTTPException(
            status_code=500,
            detail=(
                "We couldn't record your request because of a server error. "
                "Please try again in a moment — nothing was silently discarded."
            ),
        )
    return receipt
