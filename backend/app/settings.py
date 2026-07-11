from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/taggit"

    # Supabase Auth (identity only) — see docs/auth-setup.md
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    # Cloudflare R2 — see docs/r2-setup.md
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    r2_public_base_url: str = ""
    # Optional S3 endpoint override (MinIO / local stub in tests). Empty means
    # the real R2 endpoint derived from the account id.
    r2_endpoint_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
