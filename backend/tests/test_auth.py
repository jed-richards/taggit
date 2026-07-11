import time
import uuid

import jwt
import pytest
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.models import User
from app.settings import get_settings

SECRET = "test-jwt-secret"


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_token(
    sub: str | None = None,
    email: str = "mk@example.com",
    secret: str = SECRET,
    expires_in: int = 3600,
    aud: str = "authenticated",
    **extra,
) -> str:
    payload = {
        "sub": sub or str(uuid.uuid4()),
        "email": email,
        "aud": aud,
        "exp": int(time.time()) + expires_in,
        **extra,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_missing_token_is_401(client):
    resp = client.get("/api/me")
    assert resp.status_code == 401


def test_garbage_token_is_401(client):
    resp = client.get("/api/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


def test_expired_token_is_401(client):
    token = make_token(expires_in=-60)
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_wrong_secret_is_401(client):
    token = make_token(secret="some-other-secret")
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_wrong_audience_is_401(client):
    token = make_token(aud="anon")
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_valid_token_creates_user_once_and_keeps_claims_fresh(client, engine):
    sub = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {make_token(sub=sub, email='mk@example.com')}"}

    resp = client.get("/api/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == sub
    assert resp.json()["email"] == "mk@example.com"

    # second request: no duplicate row; changed email claim refreshes the row
    headers2 = {
        "Authorization": f"Bearer {make_token(sub=sub, email='new@example.com')}",
    }
    resp2 = client.get("/api/me", headers=headers2)
    assert resp2.status_code == 200

    with sessionmaker(bind=engine)() as session:
        rows = session.scalars(select(User).where(User.id == uuid.UUID(sub))).all()
        assert len(rows) == 1
        assert rows[0].email == "new@example.com"


def test_display_name_from_user_metadata(client, engine):
    sub = str(uuid.uuid4())
    token = make_token(sub=sub, user_metadata={"full_name": "Mary K"})
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Mary K"


def test_auth_client_fixture_fakes_verification(auth_client):
    client, user = auth_client
    resp = client.get("/api/me")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(user.id)
