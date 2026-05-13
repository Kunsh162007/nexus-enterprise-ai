from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # AI Providers
    veea_lobster_trap_key: str = ""
    gemini_api_key: str = ""
    featherless_api_key: str = ""
    speechmatics_api_key: str = ""

    # Model names
    featherless_scout_model: str = "mistralai/Mistral-7B-Instruct-v0.3"
    featherless_base_url: str = "https://api.featherless.ai/v1"
    gemini_flash_model: str = "gemini-1.5-flash"
    gemini_pro_model: str = "gemini-1.5-pro"

    # Backend
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Redis
    redis_url: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
