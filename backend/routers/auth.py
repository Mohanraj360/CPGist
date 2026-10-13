"""Authentication routes: Google OAuth and verified email/password accounts."""
import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from html import escape
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from lib.auth import (
    clear_session_cookie, create_session, current_user_optional, delete_session,
    hash_password, upsert_user, verify_password,
)
from lib.db import db
from models.auth import GoogleSessionRequest, LogoutResponse, PasswordSignInRequest, SignUpRequest, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")
EMERGENT_SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
VERIFY_TTL = timedelta(hours=24)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "https://cp-gist.vercel.app").rstrip("/")


async def _send_email(*, to: str, subject: str, html: str) -> bool:
    """Send through Resend. Missing configuration is a logged operational error, not a fake success."""
    api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("EMAIL_FROM")
    if not api_key or not sender:
        logger.error("Email not sent: configure RESEND_API_KEY and EMAIL_FROM in Render.")
        return False
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            response = await http.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"from": sender, "to": [to], "subject": subject, "html": html},
            )
        if response.status_code >= 300:
            logger.error("Email provider rejected message (status=%s).", response.status_code)
            return False
        return True
    except Exception:
        logger.exception("Email provider request failed.")
        return False


async def _send_verification_email(email: str, name: str, token: str) -> bool:
    link = f"{_frontend_url()}/verify-email?token={quote(token)}"
    safe_name = escape(name)
    return await _send_email(
        to=email,
        subject="Verify your email for CPGist",
        html=f"""<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#14233f">
        <h1>Verify your email</h1><p>Hi {safe_name},</p>
        <p>Confirm your email address to activate your CPGist account. This link expires in 24 hours.</p>
        <p><a href="{escape(link, quote=True)}" style="display:inline-block;padding:12px 20px;background:#172554;color:#fff;text-decoration:none;border-radius:8px">Verify email address</a></p>
        <p>If you didn't create a CPGist account, you can ignore this email.</p></div>""",
    )


async def _send_welcome_email(email: str, name: str) -> bool:
    safe_name = escape(name)
    return await _send_email(
        to=email,
        subject="Welcome to CPGist",
        html=f"""<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#14233f">
        <h1>Welcome to CPGist, {safe_name}!</h1>
        <p>Your email is verified and your account is ready.</p>
        <p>Explore the CPGist workspace to review illustrative retail KPIs and discover the product workflow.</p>
        <p><a href="{escape(_frontend_url() + '/workspace', quote=True)}">Open your workspace</a></p>
        <p>Note: until you connect your own data, dashboard metrics are illustrative sample data.</p></div>""",
    )


@router.post("/google/session", response_model=User)
async def exchange_google_session(payload: GoogleSessionRequest, response: Response) -> User:
    try:
        async with httpx.AsyncClient(timeout=20.0) as http:
            upstream = await http.get(EMERGENT_SESSION_DATA_URL, headers={"X-Session-ID": payload.session_id})
    except Exception:
        logger.exception("Emergent Auth session-data call failed")
        raise HTTPException(status_code=502, detail="Could not reach the sign-in service. Please try again.")
    if upstream.status_code != 200:
        raise HTTPException(status_code=401, detail="This sign-in link has expired. Please sign in again.")
    data = upstream.json()
    email, name = data.get("email"), data.get("name")
    if not email:
        raise HTTPException(status_code=502, detail="The sign-in service returned an incomplete profile.")
    user_doc = await upsert_user(email=email.lower().strip(), name=name or email.split("@")[0],
                                 picture=data.get("picture"), method="google")
    await create_session(user_doc["user_id"], response, token=data.get("session_token"))
    user_doc.pop("password_hash", None)
    user_doc.pop("last_login_at", None)
    return User(**user_doc)


@router.post("/signup", status_code=202)
async def signup(payload: SignUpRequest) -> dict:
    """Create a pending password account and email a single-use verification link."""
    if not payload.accept_terms:
        raise HTTPException(status_code=400, detail="You must accept the Terms of Service to create an account.")
    email = str(payload.email).lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        if existing.get("email_verified") is True:
            raise HTTPException(status_code=409, detail="An account with this email already exists. Try signing in instead.")
        # Pending accounts may request a fresh verification email by submitting signup again.
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {
            "name": payload.name.strip(), "password_hash": hash_password(payload.password),
            "auth_methods": ["password"], "email_verified": False,
        }})
        name = payload.name.strip()
    else:
        user_doc = await upsert_user(email=email, name=payload.name.strip(), picture=None,
                                     method="password", password_hash=hash_password(payload.password))
        user_id, name = user_doc["user_id"], payload.name.strip()
        await db.users.update_one({"user_id": user_id}, {"$set": {"email_verified": False}})
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    await db.email_verification_tokens.delete_many({"user_id": user_id})
    await db.email_verification_tokens.insert_one({
        "user_id": user_id, "token_hash": _token_hash(token),
        "created_at": now, "expires_at": now + VERIFY_TTL,
    })
    sent = await _send_verification_email(email, name, token)
    if not sent:
        raise HTTPException(status_code=503, detail="Your account was created but the verification email could not be sent. Configure the email service or try again later.")
    return {"status": "verification_required", "email": email,
            "message": "Check your inbox for a verification link. It expires in 24 hours."}


@router.get("/verify-email", response_class=HTMLResponse)
async def verify_email(token: str) -> HTMLResponse:
    """Verify a one-time email token, then send a welcome email."""
    if not token or len(token) > 256:
        raise HTTPException(status_code=400, detail="Invalid verification link.")
    record = await db.email_verification_tokens.find_one({"token_hash": _token_hash(token)}, {"_id": 0})
    now = datetime.now(timezone.utc)
    if not record or record["expires_at"].replace(tzinfo=record["expires_at"].tzinfo or timezone.utc) < now:
        raise HTTPException(status_code=400, detail="This verification link is invalid or expired. Please sign up again.")
    user = await db.users.find_one({"user_id": record["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Account not found. Please sign up again.")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"email_verified": True, "email_verified_at": now}})
    await db.email_verification_tokens.delete_many({"user_id": user["user_id"]})
    await _send_welcome_email(user["email"], user.get("name") or "there")
    safe_frontend = escape(_frontend_url(), quote=True)
    return HTMLResponse(f"""<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email verified | CPGist</title></head>
    <body style="font-family:Arial,sans-serif;background:#f5f7fb;padding:48px 16px;color:#14233f"><main style="max-width:520px;margin:auto;background:white;padding:32px;border-radius:16px">
    <h1>Email verified successfully</h1><p>Your CPGist account is activated. You can now sign in with your email and password.</p>
    <p><a style="display:inline-block;background:#172554;color:white;padding:12px 18px;border-radius:8px;text-decoration:none" href="{safe_frontend}/signin">Go to sign in</a></p></main></body></html>""")


@router.post("/signin", response_model=User)
async def signin(payload: PasswordSignInRequest, response: Response) -> User:
    email = str(payload.email).lower().strip()
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if user_doc and not user_doc.get("password_hash"):
        raise HTTPException(status_code=409, detail="This email is registered through Google. Use “Continue with Google” to sign in.")
    if not user_doc or not verify_password(payload.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if user_doc.get("email_verified") is not True:
        raise HTTPException(status_code=403, detail="Please verify your email before signing in. Check your inbox or create your account again to resend the verification link.")
    await create_session(user_doc["user_id"], response)
    user_doc.pop("password_hash", None)
    user_doc.pop("last_login_at", None)
    return User(**user_doc)


@router.get("/me", response_model=User)
async def me(request: Request) -> User:
    user = await current_user_optional(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.get("/session", response_model=User | None)
async def session_probe(request: Request) -> User | None:
    return await current_user_optional(request)


@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request, response: Response) -> LogoutResponse:
    await delete_session(request)
    clear_session_cookie(response)
    return LogoutResponse()
