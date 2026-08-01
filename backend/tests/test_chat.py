from unittest.mock import patch

from backend.routers.chat import _DocumentMatch, _build_fields_model
from pydantic import create_model


def _fake_response(model_instance) -> object:
    content = model_instance.model_dump_json(by_alias=True)

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


def _fake_classification_response(reply: str, matched_filename: str | None) -> object:
    return _fake_response(_DocumentMatch(reply=reply, matchedFilename=matched_filename))


def _fake_field_response(reply: str, field_labels: list[str], values_by_label: dict) -> object:
    fields_model = _build_fields_model(field_labels)
    reply_model = create_model("FieldGatheringReply", reply=(str, ...), fields=(fields_model, ...))
    return _fake_response(
        reply_model(reply=reply, fields=fields_model.model_validate(values_by_label))
    )


def test_greeting_returns_static_message_with_no_document_type(client):
    response = client.get("/api/chat/greeting")

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]
    assert body["documentType"] is None


def test_message_without_document_type_runs_classification(client):
    fake_response = _fake_classification_response(
        "Sounds like a Mutual NDA — shall we go with that?", "Mutual-NDA.md"
    )

    with patch("backend.routers.chat.completion", return_value=fake_response) as mock_completion:
        response = client.post(
            "/api/chat/message",
            json={
                "messages": [{"role": "user", "content": "I need an NDA with a vendor"}],
                "documentType": None,
                "fields": {},
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["documentType"] == "Mutual-NDA.md"
    assert body["fields"] == {}

    system_prompt = mock_completion.call_args.kwargs["messages"][0]["content"]
    assert "Mutual-NDA.md" in system_prompt
    assert "CSA.md" in system_prompt


def test_classification_rejects_a_hallucinated_filename(client):
    fake_response = _fake_classification_response("Sure!", "Not-A-Real-Document.md")

    with patch("backend.routers.chat.completion", return_value=fake_response):
        response = client.post(
            "/api/chat/message",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": None, "fields": {}},
        )

    assert response.json()["documentType"] is None


def test_message_with_document_type_extracts_fields_using_that_documents_schema(client):
    fake_response = _fake_field_response(
        "Got it — Acme, Inc. Who's the other party?",
        ["Purpose", "Effective Date", "MNDA Term", "Term of Confidentiality", "Governing Law", "Jurisdiction"],
        {"Purpose": "Evaluating a partnership"},
    )

    with patch("backend.routers.chat.completion", return_value=fake_response) as mock_completion:
        response = client.post(
            "/api/chat/message",
            json={
                "messages": [{"role": "user", "content": "It's for evaluating a partnership."}],
                "documentType": "Mutual-NDA.md",
                "fields": {},
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["documentType"] == "Mutual-NDA.md"
    assert body["fields"]["Purpose"] == "Evaluating a partnership"

    system_prompt = mock_completion.call_args.kwargs["messages"][0]["content"]
    assert "Mutual Non-Disclosure Agreement" in system_prompt
    assert "Purpose" in system_prompt


def test_message_treats_empty_strings_as_unknown_in_the_field_gathering_prompt(client):
    field_labels = ["Purpose", "Effective Date"]
    fake_response = _fake_field_response("Noted.", field_labels, {"Purpose": "Evaluating a partnership"})

    with patch("backend.routers.chat.completion", return_value=fake_response) as mock_completion:
        client.post(
            "/api/chat/message",
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "documentType": "Mutual-NDA.md",
                "fields": {"Purpose": "Evaluating a partnership", "Effective Date": ""},
            },
        )

    system_prompt = mock_completion.call_args.kwargs["messages"][0]["content"]
    assert "Still missing:\n(none — all fields are known)" not in system_prompt
    assert "- Effective Date" in system_prompt.split("Still missing:")[1]


def test_message_with_unknown_document_type_returns_400(client):
    response = client.post(
        "/api/chat/message",
        json={
            "messages": [{"role": "user", "content": "hi"}],
            "documentType": "Nonexistent.md",
            "fields": {},
        },
    )

    assert response.status_code == 400


def test_message_returns_502_when_the_llm_call_fails(client):
    with patch("backend.routers.chat.completion", side_effect=RuntimeError("boom")):
        response = client.post(
            "/api/chat/message",
            json={"messages": [{"role": "user", "content": "hi"}], "documentType": None, "fields": {}},
        )

    assert response.status_code == 502
