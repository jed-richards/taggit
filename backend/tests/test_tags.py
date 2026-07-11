import pytest


@pytest.fixture
def coll(auth_client):
    client, _ = auth_client
    cid = client.post("/api/collections", json={"name": "Mugs"}).json()["id"]
    return client, cid


def test_create_and_list_with_counts(coll):
    client, cid = coll
    red = client.post(f"/api/collections/{cid}/tags", json={"name": "Red"}).json()
    assert red["name"] == "red"  # normalized

    christmas = client.post(f"/api/collections/{cid}/tags", json={"name": " christmas "}).json()
    client.post(
        f"/api/collections/{cid}/items",
        json={"name": "Xmas mug", "tag_ids": [red["id"], christmas["id"]]},
    )
    client.post(f"/api/collections/{cid}/items", json={"name": "Plain red", "tag_ids": [red["id"]]})

    tags = client.get(f"/api/collections/{cid}/tags").json()
    assert [(t["name"], t["count"]) for t in tags] == [("red", 2), ("christmas", 1)]


def test_prefix_search(coll):
    client, cid = coll
    for name in ["christmas", "charlie brown", "red"]:
        client.post(f"/api/collections/{cid}/tags", json={"name": name})
    found = client.get(f"/api/collections/{cid}/tags", params={"q": "ch"}).json()
    assert sorted(t["name"] for t in found) == ["charlie brown", "christmas"]


def test_duplicate_create_is_409_with_existing_tag(coll):
    client, cid = coll
    first = client.post(f"/api/collections/{cid}/tags", json={"name": "red"}).json()
    resp = client.post(f"/api/collections/{cid}/tags", json={"name": " RED "})
    assert resp.status_code == 409
    assert resp.json()["detail"]["tag"]["id"] == first["id"]


def test_same_name_ok_across_collections(auth_client):
    client, _ = auth_client
    cid1 = client.post("/api/collections", json={"name": "A"}).json()["id"]
    cid2 = client.post("/api/collections", json={"name": "B"}).json()["id"]
    assert client.post(f"/api/collections/{cid1}/tags", json={"name": "red"}).status_code == 201
    assert client.post(f"/api/collections/{cid2}/tags", json={"name": "red"}).status_code == 201


def test_rename(coll):
    client, cid = coll
    tag = client.post(f"/api/collections/{cid}/tags", json={"name": "xmas"}).json()
    resp = client.patch(f"/api/collections/{cid}/tags/{tag['id']}", json={"name": "Christmas"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "christmas"


def test_rename_to_taken_name_is_409(coll):
    client, cid = coll
    client.post(f"/api/collections/{cid}/tags", json={"name": "red"})
    tag = client.post(f"/api/collections/{cid}/tags", json={"name": "xmas"}).json()
    resp = client.patch(f"/api/collections/{cid}/tags/{tag['id']}", json={"name": "red"})
    assert resp.status_code == 409


def test_delete_cascades_associations_but_keeps_items(coll):
    client, cid = coll
    tag = client.post(f"/api/collections/{cid}/tags", json={"name": "red"}).json()
    item = client.post(
        f"/api/collections/{cid}/items", json={"name": "Mug", "tag_ids": [tag["id"]]}
    ).json()

    assert client.delete(f"/api/collections/{cid}/tags/{tag['id']}").status_code == 204

    items = client.get(f"/api/collections/{cid}/items").json()
    assert [i["id"] for i in items] == [item["id"]]
    assert items[0]["tags"] == []
    assert client.get(f"/api/collections/{cid}/tags").json() == []


def test_non_member_gets_404(make_auth_client):
    client_a, _ = make_auth_client()
    client_b, _ = make_auth_client()
    cid = client_a.post("/api/collections", json={"name": "A"}).json()["id"]
    assert client_b.get(f"/api/collections/{cid}/tags").status_code == 404
    assert client_b.post(f"/api/collections/{cid}/tags", json={"name": "x"}).status_code == 404


def test_unknown_tag_is_404(coll):
    client, cid = coll
    assert client.delete(f"/api/collections/{cid}/tags/999999").status_code == 404
    assert (
        client.patch(f"/api/collections/{cid}/tags/999999", json={"name": "x"}).status_code == 404
    )
