import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

SESSION_COOKIE_NAME = "session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

JWT_ALGORITHM = "HS256"

# The SQLite DB and this secret both now persist across container restarts
# (see database.py and scripts/start-*), so unlike the old itsdangerous
# setup, there's no free "everything resets on restart" safety net for a
# forgotten secret. Failing fast here beats silently issuing tokens that
# become invalid — or worse, forgeable via a predictable default — the next
# time the process restarts. The start scripts generate and persist this
# into .env automatically, so this should only ever fail outside that path.
try:
    _SECRET_KEY = os.environ["SESSION_SECRET_KEY"]
except KeyError as exc:
    raise RuntimeError(
        "SESSION_SECRET_KEY is not set. Run via scripts/start-* (which "
        "generates and persists one into .env), or set it yourself for "
        "local/dev use."
    ) from exc


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_session_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(seconds=SESSION_MAX_AGE_SECONDS),
    }
    return jwt.encode(payload, _SECRET_KEY, algorithm=JWT_ALGORITHM)


def read_session_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, _SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    return int(payload["sub"])
