"""Smoke tests for the public website's server-backed flows."""

import httpx


def test_contact_lead_created(client: httpx.Client):
    payload = {
        "full_name": "Jordan Fields",
        "work_email": "jordan@acmebrands.example",
        "company": "Acme Brands",
        "job_title": "Head of Sales",
        "business_type": "CPG Brand",
        "primary_challenge": "Retailer and Distribution Analysis",
        "message": "Interested in a demo for our team.",
        "marketing_opt_in": False,
    }
    res = client.post("/contact/leads", json=payload)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "received"
    assert body["id"]
    assert body["received_at"]


def test_contact_lead_validation_error(client: httpx.Client):
    res = client.post("/contact/leads", json={"full_name": "X", "work_email": "not-an-email"})
    assert res.status_code == 422
    assert "detail" in res.json()


def test_data_deletion_request_created(client: httpx.Client):
    res = client.post(
        "/compliance/data-deletion-requests",
        json={"account_email": "user@example.com", "request_details": "Please delete my demo request data."},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "received"
    assert body["verification"] == "pending"


def test_data_deletion_request_validation_error(client: httpx.Client):
    res = client.post("/compliance/data-deletion-requests", json={"account_email": "user@example.com", "request_details": "short"})
    assert res.status_code == 422
