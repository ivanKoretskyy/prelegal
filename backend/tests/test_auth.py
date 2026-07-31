def test_signup_creates_user_and_sets_session_cookie(client):
    response = client.post(
        "/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "a@example.com"
    assert "id" in body
    assert "session" in response.cookies


def test_signup_rejects_duplicate_email(client):
    client.post("/api/auth/signup", json={"email": "dup@example.com", "password": "hunter2"})

    response = client.post(
        "/api/auth/signup", json={"email": "dup@example.com", "password": "other"}
    )

    assert response.status_code == 409


def test_signin_with_correct_credentials_succeeds(client):
    client.post("/api/auth/signup", json={"email": "signin@example.com", "password": "hunter2"})

    response = client.post(
        "/api/auth/signin", json={"email": "signin@example.com", "password": "hunter2"}
    )

    assert response.status_code == 200
    assert response.json()["email"] == "signin@example.com"


def test_signin_with_wrong_password_fails(client):
    client.post("/api/auth/signup", json={"email": "wrong@example.com", "password": "hunter2"})

    response = client.post(
        "/api/auth/signin", json={"email": "wrong@example.com", "password": "nope"}
    )

    assert response.status_code == 401


def test_signin_with_unknown_email_fails(client):
    response = client.post(
        "/api/auth/signin", json={"email": "ghost@example.com", "password": "hunter2"}
    )

    assert response.status_code == 401


def test_me_returns_current_user_after_signup(client):
    client.post("/api/auth/signup", json={"email": "me@example.com", "password": "hunter2"})

    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_me_without_session_is_unauthorized(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_signout_clears_session(client):
    client.post("/api/auth/signup", json={"email": "out@example.com", "password": "hunter2"})

    signout_response = client.post("/api/auth/signout")
    assert signout_response.status_code == 204

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 401
