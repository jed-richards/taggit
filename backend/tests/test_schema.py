import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.models import Collection, CollectionMember, Item, ItemTag, Tag
from tests.conftest import make_user


def make_collection(db, user, name="Snoopy Mugs"):
    coll = Collection(owner_id=user.id, name=name)
    db.add(coll)
    db.flush()
    db.add(CollectionMember(collection_id=coll.id, user_id=user.id, role="owner"))
    db.flush()
    return coll


def test_tag_name_unique_per_collection(db):
    user = make_user(db)
    coll = make_collection(db, user)
    db.add(Tag(collection_id=coll.id, name="red"))
    db.flush()
    db.add(Tag(collection_id=coll.id, name="red"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_same_tag_name_allowed_across_collections(db):
    user = make_user(db)
    a = make_collection(db, user, "A")
    b = make_collection(db, user, "B")
    db.add_all([Tag(collection_id=a.id, name="red"), Tag(collection_id=b.id, name="red")])
    db.flush()
    found = db.scalars(
        select(Tag).where(Tag.name == "red", Tag.collection_id.in_([a.id, b.id]))
    ).all()
    assert len(found) == 2


def test_item_tag_composite_pk_rejects_duplicates(db):
    user = make_user(db)
    coll = make_collection(db, user)
    item = Item(collection_id=coll.id, name="Joe Cool")
    tag = Tag(collection_id=coll.id, name="black")
    db.add_all([item, tag])
    db.flush()
    db.add(ItemTag(item_id=item.id, tag_id=tag.id))
    db.flush()
    db.add(ItemTag(item_id=item.id, tag_id=tag.id))
    with pytest.raises(IntegrityError):
        db.flush()


def test_deleting_tag_cascades_associations_but_keeps_items(db):
    user = make_user(db)
    coll = make_collection(db, user)
    item = Item(collection_id=coll.id, name="Joe Cool")
    tag = Tag(collection_id=coll.id, name="black")
    db.add_all([item, tag])
    db.flush()
    db.add(ItemTag(item_id=item.id, tag_id=tag.id))
    db.flush()

    db.delete(tag)
    db.flush()

    assert db.scalars(select(ItemTag).where(ItemTag.item_id == item.id)).all() == []
    assert db.get(Item, item.id) is not None


def test_deleting_collection_cascades_everything(db):
    user = make_user(db)
    coll = make_collection(db, user)
    item = Item(collection_id=coll.id, name="Joe Cool")
    tag = Tag(collection_id=coll.id, name="black")
    db.add_all([item, tag])
    db.flush()
    db.add(ItemTag(item_id=item.id, tag_id=tag.id))
    db.flush()
    item_id, tag_id, coll_id = item.id, tag.id, coll.id

    db.delete(coll)
    db.flush()

    assert db.scalars(select(Item).where(Item.collection_id == coll_id)).all() == []
    assert db.scalars(select(Tag).where(Tag.collection_id == coll_id)).all() == []
    assert db.scalars(select(ItemTag).where(ItemTag.item_id == item_id)).all() == []
    assert db.scalars(select(ItemTag).where(ItemTag.tag_id == tag_id)).all() == []
    assert (
        db.scalars(select(CollectionMember).where(CollectionMember.collection_id == coll_id)).all()
        == []
    )


def test_member_unique_per_collection(db):
    user = make_user(db)
    coll = make_collection(db, user)  # creates the owner membership
    db.add(CollectionMember(collection_id=coll.id, user_id=user.id, role="member"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_migrations_match_models(engine):
    """`alembic upgrade head` must produce exactly Base.metadata (empty autogen diff)."""
    from alembic.autogenerate import compare_metadata
    from alembic.config import Config
    from alembic.runtime.migration import MigrationContext

    from alembic import command
    from app.db import Base

    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()

    from app.settings import get_settings

    get_settings.cache_clear()  # pick up the DATABASE_URL set in conftest
    command.upgrade(Config("alembic.ini"), "head")

    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        diff = compare_metadata(ctx, Base.metadata)
    assert diff == [], f"models and migrations diverged: {diff}"

    # leave tables in place for any tests that run after
    Base.metadata.create_all(engine)
