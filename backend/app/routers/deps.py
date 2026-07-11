from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.db import get_db
from app.models import CollectionMember

DbSession = Annotated[Session, Depends(get_db)]


def require_membership(db: Session, collection_id: int, user_id) -> CollectionMember:
    """Return the caller's membership row or 404.

    404 (not 403) so non-members can't probe which collection ids exist.
    """
    member = db.scalar(
        select(CollectionMember).where(
            CollectionMember.collection_id == collection_id,
            CollectionMember.user_id == user_id,
        )
    )
    if member is None:
        raise HTTPException(status_code=404, detail="collection not found")
    return member


def get_membership(collection_id: int, user: CurrentUser, db: DbSession) -> CollectionMember:
    """Path-parameter dependency form of require_membership."""
    return require_membership(db, collection_id, user.id)


Membership = Annotated[CollectionMember, Depends(get_membership)]
