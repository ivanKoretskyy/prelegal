from typing import Optional

from fastapi import APIRouter, HTTPException, status
from litellm import completion
from pydantic import BaseModel, Field, create_model

from ..schemas import ChatReply, ChatRequest
from ..templates import list_catalog, load_template

router = APIRouter(prefix="/api/chat", tags=["chat"])

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

GREETING = (
    "Hi! I can help you draft any of our supported agreements. Tell me what kind of "
    "agreement you need, or describe your situation and I'll suggest one."
)


class _DocumentMatch(BaseModel):
    reply: str
    matchedFilename: Optional[str] = None


def _classification_prompt() -> str:
    catalog_lines = "\n".join(
        f"- {entry.name} ({entry.filename}): {entry.description}" for entry in list_catalog()
    )
    return (
        "You are a legal-drafting assistant. Your only job right now is to figure out which "
        "ONE of the following supported document types the user needs, before a separate flow "
        "takes over to gather its details:\n\n"
        + catalog_lines
        + "\n\nIf the user's request clearly matches one of these, confirm it in your reply and "
        "set matchedFilename to its exact filename shown in parentheses above. If it's ambiguous, "
        "ask a clarifying question and leave matchedFilename unset. If they've asked for "
        "something genuinely outside this list, explain briefly and kindly that we can't "
        "generate that specific document, and suggest the closest one we do support by name — "
        "but leave matchedFilename unset in THAT turn, until they actually confirm they want it. "
        "If, looking at the conversation so far, you (the assistant) already proposed a specific "
        "document by name — whether as a direct match or as a closest-match suggestion — and the "
        "user's latest message agrees to it (e.g. 'sure', 'yes', 'let's do that', 'sounds good'), "
        "you MUST set matchedFilename to that document's filename in this reply. Never say you're "
        "proceeding with a document in your reply text without also setting matchedFilename to "
        "match — the two must always agree."
    )


def _field_gathering_prompt(document_name: str, field_labels: list[str], known_fields: dict) -> str:
    known = {label: value for label, value in known_fields.items() if value and value.strip()}
    known_lines = (
        "\n".join(f"- {label}: {known[label]}" for label in field_labels if label in known)
        or "(none yet)"
    )
    missing_lines = (
        "\n".join(f"- {label}" for label in field_labels if label not in known)
        or "(none — all fields are known)"
    )

    return (
        f"You are a friendly legal-drafting assistant helping a user fill in a {document_name} "
        f"through natural conversation. There are exactly {len(field_labels)} fields to gather:\n"
        + "\n".join(f"- {label}" for label in field_labels)
        + "\n\nAlready known:\n"
        + known_lines
        + "\n\nStill missing:\n"
        + missing_lines
        + "\n\nAsk about a couple of missing fields at a time, in plain conversational "
        "language — don't interrogate the user with a rigid checklist. Only record a field "
        "once the user has actually stated it; don't invent values. If the user corrects or "
        "changes something already known, update it. Once every field is known, say so and "
        "let them know the document preview is complete.\n\n"
        "In your response, always return the FULL current state of all fields (including the "
        "ones already known above, unchanged, plus anything new from this message) — never "
        "omit a previously known field unless the user asked to change it."
    )


def _build_fields_model(field_labels: list[str]) -> type[BaseModel]:
    fields = {
        f"f{index}": (Optional[str], Field(default=None, alias=label))
        for index, label in enumerate(field_labels)
    }
    return create_model("DocumentFields", **fields)


@router.get("/greeting", response_model=ChatReply)
def greeting() -> ChatReply:
    return ChatReply(reply=GREETING)


@router.post("/message", response_model=ChatReply)
def send_message(body: ChatRequest) -> ChatReply:
    history = [{"role": message.role, "content": message.content} for message in body.messages]

    try:
        if body.documentType is None:
            return _classify(history)
        return _gather_fields(body.documentType, body.fields, history)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "AI service is unavailable") from exc


def _classify(history: list[dict]) -> ChatReply:
    messages = [{"role": "system", "content": _classification_prompt()}, *history]
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=_DocumentMatch,
        reasoning_effort="medium",
        extra_body=EXTRA_BODY,
    )
    result = _DocumentMatch.model_validate_json(response.choices[0].message.content)

    valid_filenames = {entry.filename for entry in list_catalog()}
    matched = result.matchedFilename if result.matchedFilename in valid_filenames else None
    return ChatReply(reply=result.reply, documentType=matched)


def _gather_fields(document_type: str, known_fields: dict, history: list[dict]) -> ChatReply:
    try:
        document = load_template(document_type)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown document type")

    fields_model = _build_fields_model(document.fields)
    reply_model = create_model("FieldGatheringReply", reply=(str, ...), fields=(fields_model, ...))

    messages = [
        {"role": "system", "content": _field_gathering_prompt(document.name, document.fields, known_fields)},
        *history,
    ]
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=reply_model,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    result = reply_model.model_validate_json(response.choices[0].message.content)

    return ChatReply(
        reply=result.reply,
        documentType=document_type,
        fields=result.fields.model_dump(by_alias=True),
    )
