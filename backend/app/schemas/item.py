from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ItemTagRef(BaseModel):
    id: int
    name: str


class CreateItemData(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    image_url: str | None = None
    notes: str = Field(default="", max_length=10_000)
    tag_ids: list[int] = Field(default_factory=list)


class ListItemQuery(BaseModel):
    tags: str = ""  # comma-separated tag names
    match: Literal["all", "any"] = "all"
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class Item(BaseModel):
    id: int
    name: str
    notes: str
    image_url: str | None
    created_at: datetime
    updated_at: datetime
    added_by: str
    tags: list[ItemTagRef]
