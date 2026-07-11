from fastapi import FastAPI

from app.routers import collections, items, me, tags, uploads


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

    return app


app = create_app()
