import os

# Must run before any app import so the lazily-created engine binds to the
# test database.
TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/taggit_test",
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import uuid  # noqa: E402
from collections.abc import Generator  # noqa: E402

import pytest  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402

from app.db import Base  # noqa: E402
from app.models import User  # noqa: E402


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DATABASE_URL)
    with eng.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine) -> Generator[Session, None, None]:
    """A session wrapped in an outer transaction that is rolled back per test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection, join_transaction_mode="create_savepoint")()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


def make_user(db: Session, email: str | None = None) -> User:
    user = User(id=uuid.uuid4(), email=email or f"{uuid.uuid4().hex[:8]}@example.com")
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def client(engine):
    """TestClient against the real app (auth NOT faked)."""
    from fastapi.testclient import TestClient

    from app.main import create_app

    return TestClient(create_app())


@pytest.fixture
def auth_client(engine):
    """(client, user): TestClient with get_current_user overridden to a fresh user.

    Reusable by all API tests — no real Supabase needed.
    """
    from fastapi.testclient import TestClient

    from app.auth import get_current_user
    from app.main import create_app

    with sessionmaker(bind=engine, expire_on_commit=False)() as session:
        user = make_user(session, email=f"{uuid.uuid4().hex[:8]}@test.example")
        session.commit()

    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app), user
