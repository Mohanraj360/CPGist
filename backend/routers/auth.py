"""Authentication routes: Google OAuth and verified email/password accounts."""
import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from html import escape
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from lib.auth import (
    clear_session_cookie, create_session, current_user_optional, delete_session,
    hash_password, upsert_user, verify_password,
)
from lib.db import db
from models.auth import LogoutResponse, PasswordSignInRequest, SignUpRequest, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")
VERIFY_TTL = timedelta(hours=24)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "https://cpgist.vercel.app").rstrip("/")


async def _send_email(*, to: str, subject: str, html: str) -> bool:
    """Send mail from the CPGist Gmail account through Gmail API when configured.

    Resend is a fallback for deployments that use a verified sender domain. Gmail
    SMTP is deliberately not used because Render deployments may block outbound SMTP.
    """
    sender_name = os.getenv("EMAIL_FROM_NAME", "CPGist AI").strip()
    reply_to = os.getenv("EMAIL_REPLY_TO", "cpgistai@gmail.com").strip()
    gmail_client_id = os.getenv("GMAIL_OAUTH_CLIENT_ID", "").strip()
    gmail_client_secret = os.getenv("GMAIL_OAUTH_CLIENT_SECRET", "").strip()
    gmail_refresh_token = os.getenv("GMAIL_OAUTH_REFRESH_TOKEN", "").strip()
    gmail_sender = os.getenv("GMAIL_SENDER_EMAIL", "cpgistai@gmail.com").strip()
    gmail_config_values = (gmail_client_id, gmail_client_secret, gmail_refresh_token)
    gmail_configured = any(gmail_config_values)

    if gmail_configured:
        if not all(gmail_config_values) or not gmail_sender:
            logger.error("Gmail API email delivery is configured incompletely; check GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN, and GMAIL_SENDER_EMAIL.")
            return False
        try:
            from email.message import EmailMessage
            from email.utils import formataddr
            import base64

            async with httpx.AsyncClient(timeout=20.0) as client:
                token_response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": gmail_client_id,
                        "client_secret": gmail_client_secret,
                        "refresh_token": gmail_refresh_token,
                        "grant_type": "refresh_token",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                if token_response.status_code != 200:
                    logger.error("Gmail API access-token refresh failed with HTTP status %s.", token_response.status_code)
                    return False
                access_token = token_response.json().get("access_token")
                if not access_token:
                    logger.error("Gmail API token response did not include an access token.")
                    return False

                message = EmailMessage()
                message["Subject"] = subject
                message["From"] = formataddr((sender_name, gmail_sender))
                message["To"] = to
                if reply_to:
                    message["Reply-To"] = reply_to
                message.set_content("This email contains HTML content. Please open it in an HTML-capable email client.")
                message.add_alternative(html, subtype="html")
                raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("ascii").rstrip("=")
                send_response = await client.post(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                    headers={"Authorization": f"Bearer {access_token}"},
                    json={"raw": raw_message},
                )
            if send_response.status_code not in (200, 201):
                logger.error("Gmail API message send failed with HTTP status %s.", send_response.status_code)
                return False
            return True
        except Exception:
            logger.exception("Gmail API email delivery failed.")
            return False

    # Resend fallback: the From address must be a sender/domain verified in Resend.
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    sender_email = os.getenv("RESEND_FROM_EMAIL", "").strip()
    if not api_key or not sender_email:
        logger.error("Email not sent: configure Gmail API credentials or RESEND_API_KEY and RESEND_FROM_EMAIL.")
        return False
    payload = {
        "from": f"{sender_name} <{sender_email}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = [reply_to]
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if response.status_code not in (200, 201):
            logger.error("Resend email delivery failed with HTTP status %s.", response.status_code)
            return False
        return True
    except Exception:
        logger.exception("Resend email API request failed.")
        return False


async def _send_verification_email(email: str, name: str, token: str) -> bool:
    link = f"{_frontend_url()}/api/auth/verify-email?token={quote(token)}"
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


def _google_redirect_uri() -> str:
    configured = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
    if configured:
        return configured
    return f"{_frontend_url()}/api/auth/google/callback"


@router.get("/google/start")
async def google_auth_start() -> RedirectResponse:
    """Begin first-party Google OAuth; no third-party authentication relay is used."""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    redirect_uri = _google_redirect_uri()
    if not client_id or not redirect_uri:
        raise HTTPException(
            status_code=503,
            detail="Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in the backend environment.",
        )
    state = secrets.token_urlsafe(32)
    params = urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    })
    response = RedirectResponse(
        f"https://accounts.google.com/o/oauth2/v2/auth?{params}",
        status_code=302,
    )
    response.set_cookie(
        key="google_oauth_state",
        value=state,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/api/auth/google",
        max_age=600,
    )
    return response


@router.get("/google/callback")
async def google_auth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    """Exchange Google's authorization code, validate the profile, and create a CPGist session."""
    frontend_signin = f"{_frontend_url()}/signin"
    if error or not code or not state:
        return RedirectResponse(f"{frontend_signin}?error=google_auth_failed", status_code=303)

    saved_state = request.cookies.get("google_oauth_state", "")
    if not saved_state or not secrets.compare_digest(saved_state, state):
        return RedirectResponse(f"{frontend_signin}?error=google_auth_state", status_code=303)

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = _google_redirect_uri()
    if not client_id or not client_secret or not redirect_uri:
        logger.error("Google OAuth callback reached without required server configuration.")
        return RedirectResponse(f"{frontend_signin}?error=google_auth_config", status_code=303)

    try:
        async with httpx.AsyncClient(timeout=20.0) as http:
            token_response = await http.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if token_response.status_code != 200:
                logger.warning("Google OAuth token exchange failed with HTTP status %s.", token_response.status_code)
                return RedirectResponse(f"{frontend_signin}?error=google_token_exchange", status_code=303)
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.warning("Google OAuth token response did not contain an access token.")
                return RedirectResponse(f"{frontend_signin}?error=google_profile", status_code=303)
            profile_response = await http.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if profile_response.status_code != 200:
                logger.warning("Google userinfo request failed with HTTP status %s.", profile_response.status_code)
                return RedirectResponse(f"{frontend_signin}?error=google_profile", status_code=303)
            profile = profile_response.json()
    except httpx.HTTPError:
        logger.exception("Google OAuth HTTPS request failed.")
        return RedirectResponse(f"{frontend_signin}?error=google_network", status_code=303)

    email = str(profile.get("email") or "").strip().lower()
    email_verified = profile.get("email_verified") is True or str(profile.get("email_verified")).lower() == "true"
    if not email or not email_verified:
        return RedirectResponse(f"{frontend_signin}?error=google_email_unverified", status_code=303)

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    is_new_user = existing is None
    name = str(profile.get("name") or email.split("@")[0]).strip()
    picture = profile.get("picture")
    user_doc = await upsert_user(
        email=email,
        name=name,
        picture=picture,
        method="google",
    )
    await db.users.update_one(
        {"user_id": user_doc["user_id"]},
        {"$set": {"email_verified": True, "email_verified_at": datetime.now(timezone.utc)}},
    )

    redirect_response = RedirectResponse(f"{_frontend_url()}/workspace", status_code=303)
    redirect_response.delete_cookie(
        key="google_oauth_state",
        path="/api/auth/google",
        samesite="lax",
        secure=True,
    )
    await create_session(user_doc["user_id"], redirect_response)

    # Send a welcome message only for a newly created account, never on every login.
    if is_new_user:
        await _send_welcome_email(email, name)

    return redirect_response


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
        if "google" in (existing.get("auth_methods") or []) and not existing.get("password_hash"):
            raise HTTPException(status_code=409, detail="This email is registered through Google. Use Google sign-in instead.")
        # Only an unverified password account may request a fresh verification email.
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
