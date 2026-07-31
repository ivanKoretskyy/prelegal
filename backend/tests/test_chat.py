import json
from unittest.mock import patch

from backend.schemas import ChatReply, NdaFields


def _fake_llm_response(reply: str, fields: dict) -> object:
    content = ChatReply(reply=reply, fields=NdaFields(**fields)).model_dump_json()

    class _Message:
        pass

    class _Choice:
        pass

    class _Response:
        pass

    message = _Message()
    message.content = content
    choice = _Choice()
    choice.message = message
    response = _Response()
    response.choices = [choice]
    return response


def test_greeting_returns_static_message_with_no_fields(client):
    response = client.get("/api/chat/greeting")

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]
    assert all(value is None for value in body["fields"].values())


def test_message_extracts_fields_from_the_conversation(client):
    fake_response = _fake_llm_response(
        "Got it — Acme, Inc. and Beta Labs LLC. What's the purpose of this NDA?",
        {"partyAName": "Acme, Inc.", "partyBName": "Beta Labs LLC"},
    )

    with patch("backend.routers.chat.completion", return_value=fake_response) as mock_completion:
        response = client.post(
            "/api/chat/message",
            json={
                "messages": [
                    {"role": "user", "content": "The parties are Acme, Inc. and Beta Labs LLC."}
                ],
                "fields": {},
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["fields"]["partyAName"] == "Acme, Inc."
    assert body["fields"]["partyBName"] == "Beta Labs LLC"
    assert "purpose" in body["reply"].lower()

    sent_messages = mock_completion.call_args.kwargs["messages"]
    assert sent_messages[0]["role"] == "system"
    assert sent_messages[-1] == {
        "role": "user",
        "content": "The parties are Acme, Inc. and Beta Labs LLC.",
    }


def test_message_preserves_already_known_fields_in_the_prompt(client):
    fake_response = _fake_llm_response("Noted.", {"partyAName": "Acme, Inc."})

    with patch("backend.routers.chat.completion", return_value=fake_response) as mock_completion:
        client.post(
            "/api/chat/message",
            json={"messages": [{"role": "user", "content": "hi"}], "fields": {"partyAName": "Acme, Inc."}},
        )

    system_prompt = mock_completion.call_args.kwargs["messages"][0]["content"]
    assert "Acme, Inc." in system_prompt


def test_message_treats_empty_strings_as_unknown_in_the_prompt(client):
    # The real frontend always sends all 10 field keys, defaulting unset ones to
    # "" rather than omitting them — the prompt must not treat those as known.
    all_fields_empty_except_one = {
        "partyAName": "Acme, Inc.",
        "partyAAddress": "",
        "partyBName": "",
        "partyBAddress": "",
        "purpose": "",
        "effectiveDate": "",
        "mndaTerm": "",
        "termOfConfidentiality": "",
        "governingLaw": "",
        "jurisdiction": "",
    }
    fake_response = _fake_llm_response("Noted.", {"partyAName": "Acme, Inc."})

    with patch("backend.routers.chat.completion", return_value=fake_response) as mock_completion:
        client.post(
            "/api/chat/message",
            json={"messages": [{"role": "user", "content": "hi"}], "fields": all_fields_empty_except_one},
        )

    system_prompt = mock_completion.call_args.kwargs["messages"][0]["content"]
    assert "Still missing:\n(none — all fields are known)" not in system_prompt
    assert "Party B name" in system_prompt.split("Still missing:")[1]


def test_message_returns_502_when_the_llm_call_fails(client):
    with patch("backend.routers.chat.completion", side_effect=RuntimeError("boom")):
        response = client.post(
            "/api/chat/message",
            json={"messages": [{"role": "user", "content": "hi"}], "fields": {}},
        )

    assert response.status_code == 502
