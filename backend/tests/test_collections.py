def test_list_is_empty_for_new_user(auth_client):
    client, _ = auth_client
    resp = client.get("/api/collections")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_then_list(auth_client):
    client, _ = auth_client
    resp = client.post("/api/collections", json={"name": "Snoopy Mugs"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Snoopy Mugs"
    assert body["item_count"] == 0
    assert body["role"] == "owner"
    assert body["recent_image_urls"] == []

    listed = client.get("/api/collections").json()
    assert [c["name"] for c in listed] == ["Snoopy Mugs"]


def test_create_requires_name(auth_client):
    client, _ = auth_client
    assert client.post("/api/collections", json={"name": ""}).status_code == 422


def test_list_scoped_to_membership(make_auth_client):
    client_a, _ = make_auth_client()
    client_b, _ = make_auth_client()
    client_a.post("/api/collections", json={"name": "A's mugs"})

    assert [c["name"] for c in client_a.get("/api/collections").json()] == ["A's mugs"]
    assert client_b.get("/api/collections").json() == []


def test_item_count_and_recent_images(auth_client):
    client, _ = auth_client
    cid = client.post("/api/collections", json={"name": "Mugs"}).json()["id"]
    for i in range(6):
        image = f"https://img.example/{i}.jpg" if i < 5 else None
        client.post(
            f"/api/collections/{cid}/items",
            json={"name": f"mug {i}", "image_url": image},
        )

    (coll,) = client.get("/api/collections").json()
    assert coll["item_count"] == 6
    # 4 most recent items that have an image (item 5 has none)
    assert coll["recent_image_urls"] == [
        "https://img.example/4.jpg",
        "https://img.example/3.jpg",
        "https://img.example/2.jpg",
        "https://img.example/1.jpg",
    ]


def test_unauthenticated_is_401(client):
    assert client.get("/api/collections").status_code == 401
