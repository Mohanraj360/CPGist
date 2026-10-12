"""Authenticated workspace routes.

The workspace currently runs on the shared illustrative sample dataset — the
same figures the public preview shows — because no customer data upload exists
yet. The payload says so explicitly, so the UI can label it honestly.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from lib.auth import require_user
from models.auth import User
from pydantic import BaseModel

router = APIRouter(prefix="/workspace")


class WorkspaceOverview(BaseModel):
    user: User
    dataset_label: str
    dataset_is_sample: bool
    connected_sources: list[str]
    pending_capabilities: list[str]
    generated_at: datetime


@router.get("/overview", response_model=WorkspaceOverview)
async def overview(user: User = Depends(require_user)) -> WorkspaceOverview:
    return WorkspaceOverview(
        user=user,
        dataset_label="CPGist illustrative sample dataset (4 brands × 5 retailers × 52 weeks)",
        dataset_is_sample=True,
        connected_sources=[],
        pending_capabilities=[
            "Upload your own sales, shipment, or promotion extract (CSV/Excel)",
            "Field mapping and validation for your data model",
            "Saved views and scheduled executive reports",
            "Team seats and shared workspaces",
        ],
        generated_at=datetime.now(timezone.utc),
    )
