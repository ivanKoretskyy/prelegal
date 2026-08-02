from datetime import datetime, timedelta, timezone

import jwt

from backend.security import (
    JWT_ALGORITHM,
    _SECRET_KEY,
    create_session_token,
    read_session_token,
)


def test_round_trips_user_id():
    token = create_session_token(42)

    assert read_session_token(token) == 42


def test_rejects_tampered_token():
    token = create_session_token(42)
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")

    assert read_session_token(tampered) is None


def test_rejects_expired_token():
    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {"sub": "42", "iat": now - timedelta(days=10), "exp": now - timedelta(days=3)},
        _SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    assert read_session_token(expired) is None


def test_rejects_garbage_token():
    assert read_session_token("not-a-jwt") is None
