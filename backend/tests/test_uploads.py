import pytest

from app.routers import uploads
from app.settings import get_settings


@pytest.fixture
def r2_configured(monkeypatch):
    monkeypatch.setenv("R2_ACCOUNT_ID", "acct123")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_BUCKET", "taggit-images")
    monkeypatch.setenv("R2_PUBLIC_BASE_URL", "https://images.taggit.example")
    get_settings.cache_clear()

    class FakeS3:
        def generate_presigned_url(self, op, Params, ExpiresIn):  # noqa: N803
            assert op == "put_object"
            return (
                f"https://acct123.r2.cloudflarestorage.com/{Params['Bucket']}/{Params['Key']}"
                f"?X-Amz-Signature=fake&expires={ExpiresIn}"
            )

    monkeypatch.setattr(uploads, "make_s3_client", lambda settings: FakeS3())
    yield
    get_settings.cache_clear()


@pytest.fixture
def coll(auth_client):
    client, _ = auth_client
    cid = client.post("/api/collections", json={"name": "Mugs"}).json()["id"]
    return client, cid


def test_presigned_upload_url(coll, r2_configured):
    client, cid = coll
    resp = client.get(
        f"/api/collections/{cid}/items/upload-url", params={"content_type": "image/jpeg"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["upload_url"].startswith("https://acct123.r2.cloudflarestorage.com/taggit-images/")
    assert body["image_url"].startswith(f"https://images.taggit.example/collections/{cid}/items/")
    assert body["image_url"].endswith(".jpg")
    assert body["expires_in"] == 600


def test_server_generates_the_key(coll, r2_configured):
    client, cid = coll
    a = client.get(
        f"/api/collections/{cid}/items/upload-url", params={"content_type": "image/png"}
    ).json()
    b = client.get(
        f"/api/collections/{cid}/items/upload-url", params={"content_type": "image/png"}
    ).json()
    assert a["image_url"] != b["image_url"]  # uuid keys, never client-chosen


def test_bad_content_type_is_400(coll, r2_configured):
    client, cid = coll
    resp = client.get(
        f"/api/collections/{cid}/items/upload-url", params={"content_type": "application/pdf"}
    )
    assert resp.status_code == 400


def test_unconfigured_r2_is_503(coll, monkeypatch):
    monkeypatch.delenv("R2_ACCOUNT_ID", raising=False)
    get_settings.cache_clear()
    client, cid = coll
    resp = client.get(
        f"/api/collections/{cid}/items/upload-url", params={"content_type": "image/jpeg"}
    )
    assert resp.status_code == 503


def test_non_member_gets_404(make_auth_client, r2_configured):
    client_a, _ = make_auth_client()
    client_b, _ = make_auth_client()
    cid = client_a.post("/api/collections", json={"name": "A"}).json()["id"]
    resp = client_b.get(
        f"/api/collections/{cid}/items/upload-url", params={"content_type": "image/jpeg"}
    )
    assert resp.status_code == 404
