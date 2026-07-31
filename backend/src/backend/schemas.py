from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


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


class NdaFields(BaseModel):
    partyAName: Optional[str] = None
    partyAAddress: Optional[str] = None
    partyBName: Optional[str] = None
    partyBAddress: Optional[str] = None
    purpose: Optional[str] = None
    effectiveDate: Optional[str] = None
    mndaTerm: Optional[str] = None
    termOfConfidentiality: Optional[str] = None
    governingLaw: Optional[str] = None
    jurisdiction: Optional[str] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: NdaFields


class ChatReply(BaseModel):
    reply: str
    fields: NdaFields
