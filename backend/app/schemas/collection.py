from datetime import datetime

from pydantic import BaseModel, Field


class CreateCollectionData(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=2000)


class Collection(BaseModel):
    id: int
    name: str
    description: str
    item_count: int
    updated_at: datetime
    recent_image_urls: list[str]
    role: str
