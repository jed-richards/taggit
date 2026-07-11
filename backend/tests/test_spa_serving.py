from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import get_settings


def make_spa_client(tmp_path, monkeypatch) -> TestClient:
    (tmp_path / "index.html").write_text("<html>SPA SHELL</html>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('hi')")
    monkeypatch.setenv("STATIC_DIR", str(tmp_path))
    get_settings.cache_clear()
    client = TestClient(create_app())
    return client


def test_serves_real_files_and_spa_fallback(tmp_path, monkeypatch):
    client = make_spa_client(tmp_path, monkeypatch)

    assert client.get("/assets/app.js").text == "console.log('hi')"
    # client-side routes fall back to the shell
    for path in ["/", "/collections", "/collections/5/items/7", "/login"]:
        resp = client.get(path)
        assert resp.status_code == 200
        assert "SPA SHELL" in resp.text
    get_settings.cache_clear()


def test_api_routes_win_over_spa(tmp_path, monkeypatch):
    client = make_spa_client(tmp_path, monkeypatch)
    assert client.get("/healthz").json() == {"status": "ok"}
    assert client.get("/api/collections").status_code == 401  # API, not SPA shell
    get_settings.cache_clear()


def test_no_static_dir_means_no_catch_all(client):
    assert client.get("/collections").status_code == 404
