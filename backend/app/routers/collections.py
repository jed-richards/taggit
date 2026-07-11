from fastapi import APIRouter
from sqlalchemy import func, select

from app import schemas
from app.auth import CurrentUser
from app.models import Collection, CollectionMember, Item
from app.routers.deps import DbSession

router = APIRouter(prefix="/api/collections", tags=["collections"])

RECENT_IMAGES_PER_COLLECTION = 4


@router.get("")
def list_collections(user: CurrentUser, db: DbSession) -> list[schemas.Collection]:
    rows = db.execute(
        select(Collection, CollectionMember.role)
        .join(CollectionMember, CollectionMember.collection_id == Collection.id)
        .where(CollectionMember.user_id == user.id)
        .order_by(Collection.updated_at.desc())
    ).all()
    if not rows:
        return []
    ids = [coll.id for coll, _ in rows]

    counts = dict(
        db.execute(
            select(Item.collection_id, func.count())
            .where(Item.collection_id.in_(ids))
            .group_by(Item.collection_id)
        ).all()
    )

    rn = (
        func.row_number()
        .over(partition_by=Item.collection_id, order_by=Item.created_at.desc())
        .label("rn")
    )
    recent_sq = (
        select(Item.collection_id, Item.image_url, rn)
        .where(Item.collection_id.in_(ids), Item.image_url.is_not(None))
        .subquery()
    )
    recent: dict[int, list[str]] = {}
    for cid, image_url in db.execute(
        select(recent_sq.c.collection_id, recent_sq.c.image_url)
        .where(recent_sq.c.rn <= RECENT_IMAGES_PER_COLLECTION)
        .order_by(recent_sq.c.collection_id, recent_sq.c.rn)
    ):
        recent.setdefault(cid, []).append(image_url)

    return [
        schemas.Collection(
            id=coll.id,
            name=coll.name,
            description=coll.description,
            item_count=counts.get(coll.id, 0),
            updated_at=coll.updated_at,
            recent_image_urls=recent.get(coll.id, []),
            role=role,
        )
        for coll, role in rows
    ]


@router.post("", status_code=201)
def create_collection(
    data: schemas.CreateCollectionData, user: CurrentUser, db: DbSession
) -> schemas.Collection:
    coll = Collection(owner_id=user.id, name=data.name.strip(), description=data.description)
    db.add(coll)
    db.flush()
    db.add(CollectionMember(collection_id=coll.id, user_id=user.id, role="owner"))
    db.commit()
    db.refresh(coll)
    return schemas.Collection(
        id=coll.id,
        name=coll.name,
        description=coll.description,
        item_count=0,
        updated_at=coll.updated_at,
        recent_image_urls=[],
        role="owner",
    )
