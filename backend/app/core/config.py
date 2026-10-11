import os

try:
    from pydantic_settings import BaseSettings
except ImportError:
    BaseSettings = object

class Settings:
    PROJECT_NAME: str = "AeroSync AI — Intelligent Air Operations Decision Support"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./aerosync.db")
    STALE_DATA_THRESHOLD_HOURS: int = int(os.getenv("STALE_DATA_THRESHOLD_HOURS", "24"))
    USE_LLM_EXPLANATIONS: bool = os.getenv("USE_LLM_EXPLANATIONS", "false").lower() == "true"
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

settings = Settings()

