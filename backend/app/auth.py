"""Supabase JWT verification.

Identity comes exclusively from the verified JWT (never from client payloads).
Supports both signing schemes Supabase uses:
- asymmetric (RS256/ES256) via the project's JWKS endpoint (preferred)
- legacy HS256 via the shared SUPABASE_JWT_SECRET
"""

import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.settings import get_settings

AUDIENCE = "authenticated"

_jwk_clients: dict[str, jwt.PyJWKClient] = {}


def _jwk_client(supabase_url: str) -> jwt.PyJWKClient:
    if supabase_url not in _jwk_clients:
        _jwk_clients[supabase_url] = jwt.PyJWKClient(
            f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
            lifespan=3600,
        )
    return _jwk_clients[supabase_url]


def decode_token(token: str) -> dict:
    """Verify signature, expiry, and audience; return the claims. Raises jwt exceptions."""
    settings = get_settings()
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "")

    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise jwt.InvalidTokenError("HS256 token but no SUPABASE_JWT_SECRET configured")
        key: object = settings.supabase_jwt_secret
    elif alg in ("RS256", "ES256"):
        if not settings.supabase_url:
            raise jwt.InvalidTokenError("asymmetric token but no SUPABASE_URL configured")
        key = _jwk_client(settings.supabase_url).get_signing_key_from_jwt(token).key
    else:
        raise jwt.InvalidTokenError(f"unsupported algorithm: {alg!r}")

    return jwt.decode(token, key, algorithms=[alg], audience=AUDIENCE)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def get_current_user(request: Request, db: Annotated[Session, Depends(get_db)]) -> User:
    """FastAPI dependency: verify the bearer token and upsert the local user row."""
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise _unauthorized("missing bearer token")

    try:
        claims = decode_token(token)
    except jwt.PyJWTError as exc:
        raise _unauthorized(f"invalid token: {exc}") from exc

    try:
        user_id = uuid.UUID(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise _unauthorized("token has no valid subject") from exc

    email = claims.get("email") or f"{user_id}@unknown.invalid"
    display_name = (claims.get("user_metadata") or {}).get("full_name") or claims.get("name")

    # Race-safe upsert: first authenticated request creates the row,
    # later requests keep email/display_name fresh from the claims.
    stmt = pg_insert(User).values(id=user_id, email=email, display_name=display_name)
    stmt = stmt.on_conflict_do_update(
        index_elements=[User.id],
        set_={"email": stmt.excluded.email, "display_name": stmt.excluded.display_name},
    )
    db.execute(stmt)
    db.commit()
    user = db.get(User, user_id)
    assert user is not None
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
