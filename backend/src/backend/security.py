import os
import secrets
from typing import Optional

import bcrypt
from itsdangerous import BadSignature, URLSafeTimedSerializer

SESSION_COOKIE_NAME = "session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

# Falls back to a fresh random secret each process start rather than a fixed
# default, so sessions can't be forged just by reading the source. This is
# consistent with the DB itself being wiped on every start (see database.py)
# — no session could outlive a restart anyway. Set SESSION_SECRET_KEY to keep
# sessions valid across restarts (e.g. multiple replicas behind a proxy).
_SECRET_KEY = os.environ.get("SESSION_SECRET_KEY") or secrets.token_hex(32)
_serializer = URLSafeTimedSerializer(_SECRET_KEY, salt="prelegal-session")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_session_token(user_id: int) -> str:
    return _serializer.dumps({"user_id": user_id})


def read_session_token(token: str) -> Optional[int]:
    try:
        data = _serializer.loads(token, max_age=SESSION_MAX_AGE_SECONDS)
    except BadSignature:
        return None
    return data.get("user_id")
