from fastapi import FastAPI

from app.routers import me


def create_app() -> FastAPI:
    app = FastAPI(title="Taggit API")

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(me.router)

    return app


app = create_app()
