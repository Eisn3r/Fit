import asyncio
import logging
import os
import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.types import MenuButtonWebApp, WebAppInfo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import init_db
from backend.routes.api import api_router
from bot.config import load_settings
from bot.handlers.start import router as start_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("fitpulse_main")


def create_fastapi_app() -> FastAPI:
    app = FastAPI(title="FitPulse Telegram Mini App Backend", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    webapp_dir = os.path.join(os.path.dirname(__file__), "webapp")
    if os.path.isdir(webapp_dir):
        app.mount("/", StaticFiles(directory=webapp_dir, html=True), name="webapp")

    return app


async def start_bot(bot: Bot, dp: Dispatcher, webapp_url: str) -> None:
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🏋️ План тренировок",
                web_app=WebAppInfo(url=webapp_url),
            )
        )
        logger.info("Telegram MenuButtonWebApp configured: %s", webapp_url)
    except Exception as exc:
        logger.warning("Could not set MenuButtonWebApp (check HTTPS URL): %s", exc)

    await dp.start_polling(bot)


async def main() -> None:
    settings = load_settings()
    await init_db()

    fastapi_app = create_fastapi_app()
    config = uvicorn.Config(
        fastapi_app,
        host=settings.app_host,
        port=settings.app_port,
        log_level="info",
    )
    server = uvicorn.Server(config)

    if not settings.bot_token or settings.bot_token.startswith("123456"):
        logger.warning(
            "BOT_TOKEN is not set in .env! Running FastAPI + WebApp server only on http://%s:%s",
            settings.app_host,
            settings.app_port,
        )
        await server.serve()
        return

    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()
    dp.include_router(start_router)

    await asyncio.gather(
        server.serve(),
        start_bot(bot, dp, settings.webapp_url),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("FitPulse stopped.")
