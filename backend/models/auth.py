"""Auth models — shared by both sign-in paths (Emergent Google Auth and
email+password). Both issue the same httpOnly session cookie, so
GET /api/auth/me behaves identically either way.

Hand-written TS mirrors live in frontend/src/lib/session.ts.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

AuthMethod = Literal["google", "password"]


class User(BaseModel):
    """Public user shape. Mongo's _id is never exposed (always projected out)."""

    user_id: str
    email: EmailStr
    name: str
    picture: str | None = None
    auth_methods: list[AuthMethod] = Field(default_factory=list)
    created_at: datetime


class GoogleSessionRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=512)


class SignUpRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    accept_terms: bool


class PasswordSignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class LogoutResponse(BaseModel):
    status: Literal["signed_out"] = "signed_out"
