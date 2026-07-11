from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app import schemas
from app.models import ItemTag, Tag
from app.routers.deps import DbSession, Membership

router = APIRouter(prefix="/api/collections/{collection_id}/tags", tags=["tags"])


def normalize(name: str) -> str:
    return name.strip().lower()


def _get_tag(db, collection_id: int, tag_id: int) -> Tag:
    tag = db.scalar(select(Tag).where(Tag.id == tag_id, Tag.collection_id == collection_id))
    if tag is None:
        raise HTTPException(status_code=404, detail="tag not found")
    return tag


def _find_by_name(db, collection_id: int, name: str) -> Tag | None:
    return db.scalar(select(Tag).where(Tag.collection_id == collection_id, Tag.name == name))


@router.get("")
def list_tags(
    collection_id: int, member: Membership, db: DbSession, q: str = ""
) -> list[schemas.Tag]:
    query = (
        select(Tag.id, Tag.name, func.count(ItemTag.tag_id).label("count"))
        .outerjoin(ItemTag, ItemTag.tag_id == Tag.id)
        .where(Tag.collection_id == collection_id)
        .group_by(Tag.id, Tag.name)
        .order_by(func.count(ItemTag.tag_id).desc(), Tag.name.asc())
    )
    if q:
        query = query.where(Tag.name.like(f"{normalize(q)}%"))
    return [schemas.Tag(id=id_, name=name, count=count) for id_, name, count in db.execute(query)]


@router.post("", status_code=201)
def create_tag(
    collection_id: int, data: schemas.CreateTagData, member: Membership, db: DbSession
) -> schemas.Tag:
    name = normalize(data.name)
    if not name:
        raise HTTPException(status_code=422, detail="tag name is empty")
    existing = _find_by_name(db, collection_id, name)
    if existing is not None:
        # Idempotent create-on-select: report the existing tag.
        raise HTTPException(
            status_code=409,
            detail={
                "message": "tag already exists",
                "tag": {"id": existing.id, "name": existing.name},
            },
        )
    tag = Tag(collection_id=collection_id, name=name)
    db.add(tag)
    db.commit()
    return schemas.Tag(id=tag.id, name=tag.name, count=0)


@router.patch("/{tag_id}")
def rename_tag(
    collection_id: int,
    tag_id: int,
    data: schemas.UpdateTagData,
    member: Membership,
    db: DbSession,
) -> schemas.Tag:
    tag = _get_tag(db, collection_id, tag_id)
    name = normalize(data.name)
    if not name:
        raise HTTPException(status_code=422, detail="tag name is empty")
    clash = _find_by_name(db, collection_id, name)
    if clash is not None and clash.id != tag.id:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "a tag with that name already exists",
                "tag": {"id": clash.id, "name": clash.name},
            },
        )
    tag.name = name
    db.commit()
    count = db.scalar(select(func.count()).where(ItemTag.tag_id == tag.id)) or 0
    return schemas.Tag(id=tag.id, name=tag.name, count=count)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(collection_id: int, tag_id: int, member: Membership, db: DbSession) -> None:
    tag = _get_tag(db, collection_id, tag_id)
    db.delete(tag)  # item_tags rows removed by DB-level ON DELETE CASCADE
    db.commit()
