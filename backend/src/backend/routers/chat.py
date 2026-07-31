from fastapi import APIRouter, HTTPException, status
from litellm import completion

from ..schemas import ChatReply, ChatRequest, NdaFields

router = APIRouter(prefix="/api/chat", tags=["chat"])

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

FIELD_LABELS: dict[str, str] = {
    "partyAName": "Party A name",
    "partyAAddress": "Party A address",
    "partyBName": "Party B name",
    "partyBAddress": "Party B address",
    "purpose": "Purpose of the disclosure",
    "effectiveDate": "Effective date (YYYY-MM-DD)",
    "mndaTerm": "Term of the NDA itself (e.g. '1 year from the Effective Date')",
    "termOfConfidentiality": "How long confidentiality obligations survive after disclosure (e.g. '3 years from disclosure')",
    "governingLaw": "Governing law (a US state)",
    "jurisdiction": "Jurisdiction / venue for disputes (a city and state)",
}

GREETING = (
    "Hi! I'll help you put together a Mutual Non-Disclosure Agreement. "
    "Let's start with the two parties — what are their names?"
)


def _system_prompt(known_fields: NdaFields) -> str:
    known = {
        key: value
        for key, value in known_fields.model_dump().items()
        if value and value.strip()
    }
    known_lines = (
        "\n".join(f"- {FIELD_LABELS[key]}: {value}" for key, value in known.items())
        or "(none yet)"
    )
    missing_lines = (
        "\n".join(f"- {label}" for key, label in FIELD_LABELS.items() if key not in known)
        or "(none — all fields are known)"
    )

    return (
        "You are a friendly legal-drafting assistant helping a user fill in a Mutual "
        "Non-Disclosure Agreement through natural conversation. There are exactly 10 fields "
        "to gather:\n"
        + "\n".join(f"- {label}" for label in FIELD_LABELS.values())
        + "\n\nAlready known:\n"
        + known_lines
        + "\n\nStill missing:\n"
        + missing_lines
        + "\n\nAsk about a couple of missing fields at a time, in plain conversational "
        "language — don't interrogate the user with a rigid checklist. Only record a field "
        "once the user has actually stated it; don't invent values. If the user corrects or "
        "changes something already known, update it. Once every field is known, say so and "
        "let them know the document preview is complete.\n\n"
        "In your response, always return the FULL current state of all 10 fields (including "
        "the ones already known above, unchanged, plus anything new from this message) — "
        "never omit a previously known field unless the user asked to change it."
    )


@router.get("/greeting", response_model=ChatReply)
def greeting() -> ChatReply:
    return ChatReply(reply=GREETING, fields=NdaFields())


@router.post("/message", response_model=ChatReply)
def send_message(body: ChatRequest) -> ChatReply:
    messages = [{"role": "system", "content": _system_prompt(body.fields)}]
    messages += [{"role": message.role, "content": message.content} for message in body.messages]

    try:
        response = completion(
            model=MODEL,
            messages=messages,
            response_format=ChatReply,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        return ChatReply.model_validate_json(response.choices[0].message.content)
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "AI service is unavailable") from exc
