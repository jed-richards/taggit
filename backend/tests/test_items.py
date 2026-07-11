import pytest


@pytest.fixture
def coll(make_auth_client):
    client, user = make_auth_client(display_name="Mary K")
    cid = client.post("/api/collections", json={"name": "Mugs"}).json()["id"]
    return client, cid


def seed_tags(client, cid, *names):
    return {
        name: client.post(f"/api/collections/{cid}/tags", json={"name": name}).json()["id"]
        for name in names
    }


def test_create_and_list(coll):
    client, cid = coll
    tags = seed_tags(client, cid, "red", "christmas")
    resp = client.post(
        f"/api/collections/{cid}/items",
        json={
            "name": "Red Christmas Snoopy",
            "notes": "1972 Determined Productions.",
            "image_url": "https://img.example/m2.jpg",
            "tag_ids": [tags["red"], tags["christmas"]],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["added_by"] == "Mary K"
    assert [t["name"] for t in body["tags"]] == ["christmas", "red"]

    items = client.get(f"/api/collections/{cid}/items").json()
    assert len(items) == 1
    assert items[0]["name"] == "Red Christmas Snoopy"


def test_and_filtering_is_default(coll):
    client, cid = coll
    tags = seed_tags(client, cid, "red", "christmas", "vintage")
    client.post(
        f"/api/collections/{cid}/items",
        json={"name": "both", "tag_ids": [tags["red"], tags["christmas"]]},
    )
    client.post(
        f"/api/collections/{cid}/items", json={"name": "red only", "tag_ids": [tags["red"]]}
    )
    client.post(
        f"/api/collections/{cid}/items", json={"name": "xmas only", "tag_ids": [tags["christmas"]]}
    )

    both = client.get(f"/api/collections/{cid}/items", params={"tags": "red,christmas"}).json()
    assert [i["name"] for i in both] == ["both"]

    any_ = client.get(
        f"/api/collections/{cid}/items", params={"tags": "red,christmas", "match": "any"}
    ).json()
    assert sorted(i["name"] for i in any_) == ["both", "red only", "xmas only"]


def test_unknown_tag_name_matches_nothing(coll):
    client, cid = coll
    tags = seed_tags(client, cid, "red")
    client.post(f"/api/collections/{cid}/items", json={"name": "m", "tag_ids": [tags["red"]]})
    assert client.get(f"/api/collections/{cid}/items", params={"tags": "red,nope"}).json() == []


def test_pagination(coll):
    client, cid = coll
    for i in range(7):
        client.post(f"/api/collections/{cid}/items", json={"name": f"mug {i}"})
    page1 = client.get(f"/api/collections/{cid}/items", params={"limit": 5}).json()
    page2 = client.get(f"/api/collections/{cid}/items", params={"limit": 5, "offset": 5}).json()
    assert len(page1) == 5
    assert len(page2) == 2
    assert page1[0]["name"] == "mug 6"  # newest first


def test_create_with_foreign_tag_is_400_and_atomic(coll, make_auth_client):
    client, cid = coll
    other_client, _ = make_auth_client()
    other_cid = other_client.post("/api/collections", json={"name": "Other"}).json()["id"]
    foreign_tag = other_client.post(
        f"/api/collections/{other_cid}/tags", json={"name": "sneaky"}
    ).json()["id"]

    own = seed_tags(client, cid, "red")
    resp = client.post(
        f"/api/collections/{cid}/items",
        json={"name": "bad", "tag_ids": [own["red"], foreign_tag]},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["missing_tag_ids"] == [foreign_tag]
    # nothing persisted
    assert client.get(f"/api/collections/{cid}/items").json() == []


def test_delete_item(coll):
    client, cid = coll
    tags = seed_tags(client, cid, "red")
    item = client.post(
        f"/api/collections/{cid}/items", json={"name": "m", "tag_ids": [tags["red"]]}
    ).json()
    assert client.delete(f"/api/collections/{cid}/items/{item['id']}").status_code == 204
    assert client.get(f"/api/collections/{cid}/items").json() == []
    # tag survives with count back to 0
    (tag,) = client.get(f"/api/collections/{cid}/tags").json()
    assert tag["count"] == 0


def test_delete_unknown_item_is_404(coll):
    client, cid = coll
    assert client.delete(f"/api/collections/{cid}/items/999999").status_code == 404


def test_cross_collection_isolation(make_auth_client):
    client_a, _ = make_auth_client()
    client_b, _ = make_auth_client()
    cid_a = client_a.post("/api/collections", json={"name": "A"}).json()["id"]
    item = client_a.post(f"/api/collections/{cid_a}/items", json={"name": "m"}).json()

    assert client_b.get(f"/api/collections/{cid_a}/items").status_code == 404
    assert client_b.delete(f"/api/collections/{cid_a}/items/{item['id']}").status_code == 404


def test_item_changes_touch_collection_updated_at(coll):
    client, cid = coll
    before = client.get("/api/collections").json()[0]["updated_at"]
    client.post(f"/api/collections/{cid}/items", json={"name": "m"})
    after = client.get("/api/collections").json()[0]["updated_at"]
    assert after >= before
