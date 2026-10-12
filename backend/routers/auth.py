"""Authentication routes — Emergent Google Auth (primary) and email+password.

Both paths converge on the same httpOnly session cookie, so GET /api/auth/me
answers "who am I" identically regardless of how the user signed in. Tokens are
never returned in a JSON body. Credentials are never logged.
"""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from lib.auth import (
    clear_session_cookie,
    create_session,
    current_user_optional,
    delete_session,
    hash_password,
    require_user,
    upsert_user,
    verify_password,
)
from lib.db import db
from models.auth import (
    GoogleSessionRequest,
    LogoutResponse,
    PasswordSignInRequest,
    SignUpRequest,
    User,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")

EMERGENT_SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


@router.post("/google/session", response_model=User)
async def exchange_google_session(payload: GoogleSessionRequest, response: Response) -> User:
    """Exchange the one-time session_id from the auth redirect for a real session.

    The call to Emergent Auth happens here, server-side — never from the browser.
    """
    try:
        async with httpx.AsyncClient(timeout=20.0) as http:
            upstream = await http.get(
                EMERGENT_SESSION_DATA_URL,
                headers={"X-Session-ID": payload.session_id},
            )
    except Exception:
        logger.exception("Emergent Auth session-data call failed")
        raise HTTPException(status_code=502, detail="Could not reach the sign-in service. Please try again.")

    if upstream.status_code != 200:
        # An expired or already-used session_id lands here.
        raise HTTPException(status_code=401, detail="This sign-in link has expired. Please sign in again.")

    data = upstream.json()
    email, name = data.get("email"), data.get("name")
    if not email:
        raise HTTPException(status_code=502, detail="The sign-in service returned an incomplete profile.")

    user_doc = await upsert_user(
        email=email,
        name=name or email.split("@")[0],
        picture=data.get("picture"),
        method="google",
    )
    # Reuse Emergent's session_token when provided so both systems agree.
    await create_session(user_doc["user_id"], response, token=data.get("session_token"))

    user_doc.pop("password_hash", None)
    user_doc.pop("last_login_at", None)
    return User(**user_doc)


@router.post("/signup", response_model=User, status_code=201)
async def signup(payload: SignUpRequest, response: Response) -> User:
    """Create an email+password account."""
    if not payload.accept_terms:
        raise HTTPException(status_code=400, detail="You must accept the Terms of Service to create an account.")

    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing and existing.get("password_hash"):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Try signing in instead.")

    user_doc = await upsert_user(
        email=email,
        name=payload.name.strip(),
        picture=None,
        method="password",
        password_hash=hash_password(payload.password),
    )
    await create_session(user_doc["user_id"], response)

    user_doc.pop("password_hash", None)
    user_doc.pop("last_login_at", None)
    return User(**user_doc)


@router.post("/signin", response_model=User)
async def signin(payload: PasswordSignInRequest, response: Response) -> User:
    """Email+password sign-in."""
    email = payload.email.lower().strip()
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})

    if user_doc and not user_doc.get("password_hash"):
        # Account exists but was created through Google — guide rather than fail blindly.
        raise HTTPException(
            status_code=409,
            detail="This email is registered through Google. Use “Continue with Google” to sign in.",
        )

    if not user_doc or not verify_password(payload.password, user_doc["password_hash"]):
        # Same message either way — never reveal whether an email exists.
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    await create_session(user_doc["user_id"], response)
    user_doc.pop("password_hash", None)
    user_doc.pop("last_login_at", None)
    return User(**user_doc)


@router.get("/me", response_model=User)
async def me(user: User = Depends(require_user)) -> User:
    """Who am I. 401 when unauthenticated so the SPA can redirect to /signin."""
    return user


@router.get("/session", response_model=User | None)
async def session_probe(request: Request) -> User | None:
    """Non-failing session check for public pages (null instead of 401)."""
    return await current_user_optional(request)


@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request, response: Response) -> LogoutResponse:
    await delete_session(request)
    clear_session_cookie(response)
    return LogoutResponse()
