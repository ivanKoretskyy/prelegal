from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session

from .database import get_session
from .models import User
from .security import SESSION_COOKIE_NAME, read_session_token


def get_current_user(request: Request, session: Session = Depends(get_session)) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = read_session_token(token) if token else None
    user = session.get(User, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user
