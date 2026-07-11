from pydantic import BaseModel, Field


class CreateTagData(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class UpdateTagData(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class Tag(BaseModel):
    id: int
    name: str
    count: int = 0
