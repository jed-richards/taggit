"""S3-shaped upload stub for E2E runs.

Accepts presigned-style PUTs (signature query params ignored) and serves the
objects back on GET, standing in for Cloudflare R2 so the browser exercises
the real presign → PUT → image_url path shape.

Run: uv run uvicorn upload_stub:app --port 9999   (from e2e/, using backend venv)
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# The browser PUTs cross-origin (app on :5173, stub on :9999) — mirror the
# CORS policy a real R2 bucket needs (docs/r2-setup.md).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["PUT", "GET"],
    allow_headers=["content-type"],
)

_objects: dict[str, tuple[bytes, str]] = {}


@app.put("/{path:path}")
async def put_object(path: str, request: Request) -> Response:
    body = await request.body()
    _objects[path] = (body, request.headers.get("content-type", "application/octet-stream"))
    return Response(status_code=200)


@app.get("/{path:path}")
async def get_object(path: str) -> Response:
    if path not in _objects:
        return Response(status_code=404)
    body, content_type = _objects[path]
    return Response(content=body, media_type=content_type)
