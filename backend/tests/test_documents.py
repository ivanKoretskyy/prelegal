def _signup(client, email="doc@example.com", password="hunter2"):
    return client.post("/api/auth/signup", json={"email": email, "password": password})


def test_list_documents_requires_auth(client):
    response = client.get("/api/documents")

    assert response.status_code == 401


def test_create_document_requires_auth(client):
    response = client.post("/api/documents", json={"filename": "Mutual-NDA.md", "fields": {}})

    assert response.status_code == 401


def test_create_document_rejects_unknown_filename(client):
    _signup(client)

    response = client.post("/api/documents", json={"filename": "Nonexistent.md", "fields": {}})

    assert response.status_code == 400


def test_create_and_list_document(client):
    _signup(client)

    create_response = client.post(
        "/api/documents",
        json={"filename": "Mutual-NDA.md", "fields": {"Purpose": "Evaluate a partnership"}},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["filename"] == "Mutual-NDA.md"
    assert created["documentName"] == "Mutual Non-Disclosure Agreement"
    assert created["fields"] == {"Purpose": "Evaluate a partnership"}

    list_response = client.get("/api/documents")
    assert list_response.status_code == 200
    body = list_response.json()
    assert len(body) == 1
    assert body[0]["id"] == created["id"]


def test_get_single_document(client):
    _signup(client)
    created = client.post(
        "/api/documents", json={"filename": "Mutual-NDA.md", "fields": {}}
    ).json()

    response = client.get(f"/api/documents/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_document_not_found(client):
    _signup(client)

    response = client.get("/api/documents/999")

    assert response.status_code == 404


def test_update_document_fields(client):
    _signup(client)
    created = client.post(
        "/api/documents", json={"filename": "Mutual-NDA.md", "fields": {"Purpose": "Old"}}
    ).json()

    response = client.put(
        f"/api/documents/{created['id']}", json={"fields": {"Purpose": "New"}}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["fields"] == {"Purpose": "New"}
    assert body["updatedAt"] >= body["createdAt"]


def test_delete_document(client):
    _signup(client)
    created = client.post(
        "/api/documents", json={"filename": "Mutual-NDA.md", "fields": {}}
    ).json()

    delete_response = client.delete(f"/api/documents/{created['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/api/documents/{created['id']}")
    assert get_response.status_code == 404


def test_cannot_access_other_users_document(client):
    _signup(client, email="owner@example.com")
    created = client.post(
        "/api/documents", json={"filename": "Mutual-NDA.md", "fields": {}}
    ).json()

    _signup(client, email="intruder@example.com")

    assert client.get(f"/api/documents/{created['id']}").status_code == 404
    assert (
        client.put(f"/api/documents/{created['id']}", json={"fields": {}}).status_code == 404
    )
    assert client.delete(f"/api/documents/{created['id']}").status_code == 404
