"""Auth lifecycle: session cookie issuance, protection, and sign-out."""

import os
import time

import httpx

API_URL = f"{os.environ.get('BACKEND_URL', 'http://localhost:8001')}/api"


def _email() -> str:
    return f"pytest.auth.{time.time_ns()}@example.com"


# Throwaway password for accounts this suite creates at runtime — not a real
# credential. Override with TEST_PASSWORD if a deployment enforces a policy.
PASSWORD = os.environ.get("TEST_PASSWORD", "strong-password-123")


def _bearer(res: httpx.Response) -> dict[str, str]:
    """Session cookie -> Authorization header.

    The session cookie is set with Secure=True (correct for the HTTPS preview, and
    browsers accept it on localhost). httpx is stricter and won't replay a Secure
    cookie over plain HTTP, so these tests use the Authorization fallback that
    lib.auth._token_from_request also supports. Same session-resolution code path.
    """
    token = res.cookies.get("session_token")
    assert token, "signup/signin must issue a session_token cookie"
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_me_is_401(client: httpx.Client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_unauthenticated_session_probe_is_null(client: httpx.Client):
    res = client.get("/auth/session")
    assert res.status_code == 200
    assert res.json() is None


def test_protected_workspace_requires_auth(client: httpx.Client):
    res = client.get("/workspace/overview")
    assert res.status_code == 401


def test_signup_then_me_then_logout():
    email = _email()
    with httpx.Client(base_url=API_URL, timeout=30.0) as c:
        signup = c.post(
            "/auth/signup",
            json={"name": "Pytest User", "email": email, "password": PASSWORD, "accept_terms": True},
        )
        assert signup.status_code == 201, signup.text
        auth_h = _bearer(signup)
        body = signup.json()
        assert body["email"] == email
        assert body["user_id"].startswith("user_")
        assert "password_hash" not in body, "password hash must never be returned"
        assert "session_token" not in body, "tokens ride the httpOnly cookie, never JSON"

        me = c.get("/auth/me", headers=auth_h)
        assert me.status_code == 200
        assert me.json()["user_id"] == body["user_id"]

        ws = c.get("/workspace/overview", headers=auth_h)
        assert ws.status_code == 200
        assert ws.json()["dataset_is_sample"]

        assert c.post("/auth/logout", headers=auth_h).status_code == 200
        assert c.get("/auth/me", headers=auth_h).status_code == 401


def test_signup_requires_accepted_terms(client: httpx.Client):
    res = client.post(
        "/auth/signup",
        json={"name": "No Terms", "email": _email(), "password": PASSWORD, "accept_terms": False},
    )
    assert res.status_code == 400


def test_signup_rejects_short_password(client: httpx.Client):
    res = client.post(
        "/auth/signup",
        json={"name": "Short Pass", "email": _email(), "password": "abc", "accept_terms": True},
    )
    assert res.status_code == 422


def test_duplicate_signup_conflicts():
    email = _email()
    payload = {"name": "Dupe User", "email": email, "password": PASSWORD, "accept_terms": True}
    with httpx.Client(base_url=API_URL, timeout=30.0) as c:
        assert c.post("/auth/signup", json=payload).status_code == 201
    with httpx.Client(base_url=API_URL, timeout=30.0) as c2:
        assert c2.post("/auth/signup", json=payload).status_code == 409


def test_signin_wrong_password_is_401():
    email = _email()
    with httpx.Client(base_url=API_URL, timeout=30.0) as c:
        c.post("/auth/signup", json={"name": "Pw User", "email": email, "password": PASSWORD, "accept_terms": True})
    with httpx.Client(base_url=API_URL, timeout=30.0) as c2:
        res = c2.post("/auth/signin", json={"email": email, "password": "definitely-wrong"})
        assert res.status_code == 401
        # Must not disclose whether the account exists.
        assert "Incorrect email or password" in res.json()["detail"]


def test_signin_correct_password_sets_session():
    email = _email()
    with httpx.Client(base_url=API_URL, timeout=30.0) as c:
        c.post("/auth/signup", json={"name": "Pw User", "email": email, "password": PASSWORD, "accept_terms": True})
    with httpx.Client(base_url=API_URL, timeout=30.0) as c2:
        signin = c2.post("/auth/signin", json={"email": email, "password": PASSWORD})
        assert signin.status_code == 200
        assert c2.get("/auth/me", headers=_bearer(signin)).status_code == 200


def test_google_session_rejects_bad_session_id(client: httpx.Client):
    res = client.post("/auth/google/session", json={"session_id": "clearly-not-a-valid-session"})
    assert res.status_code == 401
