"""Session + user helpers shared by every auth path.

Sessions are opaque random tokens stored in Mongo and delivered to the browser
as an httpOnly cookie. Nothing auth-related is ever returned in a JSON body and
no token is readable by JavaScript.
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response
from lib.db import db
from models.auth import AuthMethod, User
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

SESSION_COOKIE = "session_token"
SESSION_TTL = timedelta(days=7)

# bcrypt has a hard 72-byte input limit; passlib raises above it.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__truncate_error=False)


def hash_password(raw: str) -> str:
    return pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(raw, hashed)
    except Exception:
        return False


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | str) -> datetime:
    """Motor hands back naive datetimes; normalise to aware UTC before comparing."""
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def upsert_user(
    *,
    email: str,
    name: str,
    picture: str | None,
    method: AuthMethod,
    password_hash: str | None = None,
) -> dict:
    """Create or update the user for this email, recording the auth method used.

    One account per email: a user who first signed in with Google and later sets
    a password (or vice versa) keeps the same user_id, with both methods listed.
    """
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    now = _utcnow()

    if existing:
        updates: dict = {"last_login_at": now, "name": existing.get("name") or name}
        if picture and not existing.get("picture"):
            updates["picture"] = picture
        methods = list(existing.get("auth_methods") or [])
        if method not in methods:
            methods.append(method)
            updates["auth_methods"] = methods
        if password_hash and not existing.get("password_hash"):
            updates["password_hash"] = password_hash
        await db.users.update_one({"user_id": existing["user_id"]}, {"$set": updates})
        return {**existing, **updates}

    doc = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "email": email,
        "name": name,
        "picture": picture,
        "auth_methods": [method],
        "created_at": now,
        "last_login_at": now,
    }
    if password_hash:
        doc["password_hash"] = password_hash
    await db.users.insert_one(dict(doc))
    return doc


async def create_session(user_id: str, response: Response, token: str | None = None) -> str:
    """Persist a session and set it as an httpOnly cookie."""
    session_token = token or secrets.token_urlsafe(40)
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": session_token,
            "created_at": _utcnow(),
            "expires_at": _utcnow() + SESSION_TTL,
        }
    )
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",  # required behind the Emergent preview proxy
        path="/",
        max_age=int(SESSION_TTL.total_seconds()),
    )
    return session_token


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE, path="/", samesite="none", secure=True)


def _token_from_request(request: Request) -> str | None:
    """Cookie first, then Authorization header as a fallback (used by tests/curl)."""
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        return token
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:].strip() or None
    return None


async def current_user_optional(request: Request) -> User | None:
    """Resolve the signed-in user, or None. Never raises."""
    token = _token_from_request(request)
    if not token:
        return None

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    if _aware(session["expires_at"]) < _utcnow():
        await db.user_sessions.delete_one({"session_token": token})
        return None

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    user_doc.pop("password_hash", None)
    user_doc.pop("last_login_at", None)
    return User(**user_doc)


async def require_user(request: Request) -> User:
    """FastAPI dependency for protected routes — 401 lets the SPA redirect to /signin."""
    user = await current_user_optional(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def delete_session(request: Request) -> None:
    token = _token_from_request(request)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
