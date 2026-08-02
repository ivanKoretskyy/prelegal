import os
from typing import Iterator

# security.py reads SESSION_SECRET_KEY at import time, so this must be set
# before `backend.main` (and everything it imports) is ever imported.
os.environ.setdefault("SESSION_SECRET_KEY", "test-secret-key-at-least-32-bytes-long")

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from backend.database import get_session
from backend.main import app


@pytest.fixture()
def client() -> Iterator[TestClient]:
    """A TestClient backed by a fresh in-memory SQLite DB per test.

    Instantiated without triggering the app's lifespan, so the real
    file-based DB (used outside of tests) is never touched.
    """
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)

    def override_get_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
