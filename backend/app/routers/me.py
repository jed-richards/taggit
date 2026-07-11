from fastapi import APIRouter

from app.auth import CurrentUser

router = APIRouter(prefix="/api", tags=["me"])


@router.get("/me")
def get_me(user: CurrentUser) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
    }
