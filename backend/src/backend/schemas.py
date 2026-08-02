from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    documentType: Optional[str] = None
    fields: dict[str, Optional[str]] = Field(default_factory=dict)


class ChatReply(BaseModel):
    reply: str
    documentType: Optional[str] = None
    fields: dict[str, Optional[str]] = Field(default_factory=dict)


class DocumentCreate(BaseModel):
    filename: str
    fields: dict[str, str] = Field(default_factory=dict)


class DocumentUpdate(BaseModel):
    fields: dict[str, str]


class DocumentOut(BaseModel):
    id: int
    filename: str
    documentName: str
    fields: dict[str, str]
    createdAt: datetime
    updatedAt: datetime
