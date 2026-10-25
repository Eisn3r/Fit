import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    bot_token: str
    webapp_url: str
    app_host: str
    app_port: int
    db_path: str


def load_settings() -> Settings:
    token = os.getenv("BOT_TOKEN", "").strip()
    webapp_url = os.getenv("WEBAPP_URL", "https://localhost:8000").strip().rstrip("/")
    app_host = os.getenv("APP_HOST", "0.0.0.0").strip()
    app_port = int(os.getenv("APP_PORT", "8000"))
    db_path = os.getenv("DB_PATH", "./fitpulse.db").strip()
    return Settings(
        bot_token=token,
        webapp_url=webapp_url,
        app_host=app_host,
        app_port=app_port,
        db_path=db_path,
    )
