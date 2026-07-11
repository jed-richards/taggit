from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse

from app.routers import collections, items, me, tags, uploads
from app.settings import get_settings


def create_app() -> FastAPI:
    app = FastAPI(title="Taggit API")

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(me.router)
    app.include_router(collections.router)
    app.include_router(tags.router)
    app.include_router(items.router)
    app.include_router(uploads.router)

    _mount_frontend(app)

    return app


def _mount_frontend(app: FastAPI) -> None:
    """Serve the built SPA (production monolith mode).

    API routes are registered first, so this catch-all only sees non-API
    paths: real files are served as-is, everything else falls back to
    index.html for client-side routing.
    """
    static_dir = get_settings().static_dir
    if not static_dir:
        return
    root = Path(static_dir).resolve()
    index = root / "index.html"
    if not index.is_file():
        return

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        candidate = (root / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(candidate)
        return FileResponse(index)


app = create_app()
