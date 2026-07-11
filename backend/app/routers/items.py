from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app import schemas
from app.auth import CurrentUser
from app.models import Collection, Item, ItemTag, Tag, User
from app.routers.deps import DbSession, Membership
from app.routers.tags import normalize

router = APIRouter(prefix="/api/collections/{collection_id}/items", tags=["items"])


def _added_by(creator: User | None) -> str:
    if creator is None:
        return ""
    return creator.display_name or creator.email.split("@")[0]


def _to_schema(item: Item) -> schemas.Item:
    return schemas.Item(
        id=item.id,
        name=item.name,
        notes=item.notes,
        image_url=item.image_url,
        created_at=item.created_at,
        updated_at=item.updated_at,
        added_by=_added_by(item.creator),
        tags=[
            schemas.ItemTagRef(id=t.id, name=t.name)
            for t in sorted(item.tags, key=lambda t: t.name)
        ],
    )


def _touch_collection(db, collection_id: int) -> None:
    coll = db.get(Collection, collection_id)
    if coll is not None:
        coll.updated_at = func.now()


@router.get("")
def list_items(
    collection_id: int,
    member: Membership,
    db: DbSession,
    query: Annotated[schemas.ListItemQuery, Depends()],
) -> list[schemas.Item]:
    stmt = (
        select(Item)
        .where(Item.collection_id == collection_id)
        .options(selectinload(Item.tags), selectinload(Item.creator))
    )

    names = [normalize(t) for t in query.tags.split(",") if normalize(t)]
    if names:
        wanted = sorted(set(names))
        stmt = (
            stmt.join(ItemTag, ItemTag.item_id == Item.id)
            .join(Tag, Tag.id == ItemTag.tag_id)
            .where(Tag.name.in_(wanted))
            .group_by(Item.id)
        )
        if query.match == "all":
            stmt = stmt.having(func.count(func.distinct(Tag.name)) == len(wanted))

    stmt = stmt.order_by(Item.created_at.desc(), Item.id.desc())
    stmt = stmt.limit(query.limit).offset(query.offset)
    return [_to_schema(item) for item in db.scalars(stmt).unique()]


@router.post("", status_code=201)
def create_item(
    collection_id: int,
    data: schemas.CreateItemData,
    user: CurrentUser,
    member: Membership,
    db: DbSession,
) -> schemas.Item:
    tag_ids = sorted(set(data.tag_ids))
    if tag_ids:
        found = set(
            db.scalars(
                select(Tag.id).where(Tag.id.in_(tag_ids), Tag.collection_id == collection_id)
            ).all()
        )
        missing = [tid for tid in tag_ids if tid not in found]
        if missing:
            # Nothing has been written yet — the item is never half-created.
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "tags do not belong to this collection — create them first",
                    "missing_tag_ids": missing,
                },
            )

    item = Item(
        collection_id=collection_id,
        created_by=user.id,
        name=data.name.strip(),
        image_url=data.image_url,
        notes=data.notes,
    )
    db.add(item)
    db.flush()
    for tid in tag_ids:
        db.add(ItemTag(item_id=item.id, tag_id=tid))
    _touch_collection(db, collection_id)
    db.commit()

    item = db.scalar(
        select(Item)
        .where(Item.id == item.id)
        .options(selectinload(Item.tags), selectinload(Item.creator))
    )
    assert item is not None
    return _to_schema(item)


@router.delete("/{item_id}", status_code=204)
def delete_item(collection_id: int, item_id: int, member: Membership, db: DbSession) -> None:
    item = db.scalar(select(Item).where(Item.id == item_id, Item.collection_id == collection_id))
    if item is None:
        raise HTTPException(status_code=404, detail="item not found")
    db.delete(item)
    _touch_collection(db, collection_id)
    db.commit()
