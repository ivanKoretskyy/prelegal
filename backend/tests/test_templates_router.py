def test_get_template_returns_name_fields_and_content(client):
    response = client.get("/api/templates/Mutual-NDA.md")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Mutual Non-Disclosure Agreement"
    assert body["filename"] == "Mutual-NDA.md"
    assert "Purpose" in body["fields"]
    assert "Standard Terms" in body["content"]


def test_get_template_rejects_unknown_filename(client):
    response = client.get("/api/templates/Nonexistent.md")

    assert response.status_code == 404


def test_get_template_rejects_path_traversal(client):
    response = client.get("/api/templates/..%2Fcatalog.json")

    assert response.status_code in (404, 400)
