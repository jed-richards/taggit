import uuid

import boto3
from fastapi import APIRouter, HTTPException

from app.routers.deps import Membership
from app.settings import Settings, get_settings

router = APIRouter(prefix="/api/collections/{collection_id}/items", tags=["uploads"])

UPLOAD_URL_TTL_SECONDS = 600

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
}


def make_s3_client(settings: Settings):
    """Separated for test stubbing."""
    endpoint = (
        settings.r2_endpoint_url
        or f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
    )
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


@router.get("/upload-url")
def get_upload_url(collection_id: int, content_type: str, member: Membership) -> dict:
    settings = get_settings()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "unsupported image type",
                "allowed": sorted(ALLOWED_CONTENT_TYPES),
            },
        )
    if not (settings.r2_account_id and settings.r2_bucket and settings.r2_public_base_url):
        raise HTTPException(status_code=503, detail="image uploads are not configured")

    ext = ALLOWED_CONTENT_TYPES[content_type]
    key = f"collections/{collection_id}/items/{uuid.uuid4()}.{ext}"

    upload_url = make_s3_client(settings).generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.r2_bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=UPLOAD_URL_TTL_SECONDS,
    )
    return {
        "upload_url": upload_url,
        "image_url": f"{settings.r2_public_base_url.rstrip('/')}/{key}",
        "expires_in": UPLOAD_URL_TTL_SECONDS,
    }
