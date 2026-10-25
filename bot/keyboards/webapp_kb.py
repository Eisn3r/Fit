from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)


def get_main_webapp_inline_kb(webapp_url: str) -> InlineKeyboardMarkup:
    """Inline keyboard with Telegram Mini App launch button."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🏋️ Открыть FitPulse (План тренировок)",
                    web_app=WebAppInfo(url=webapp_url),
                )
            ],
            [
                InlineKeyboardButton(
                    text="📊 Моя статистика",
                    callback_data="my_stats",
                ),
                InlineKeyboardButton(
                    text="ℹ️ Как тренироваться",
                    callback_data="how_it_works",
                ),
            ],
        ]
    )


def get_reply_webapp_kb(webapp_url: str) -> ReplyKeyboardMarkup:
    """Persistent bottom keyboard button that sends web_app_data back to bot if needed."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text="🔥 Запустить FitPulse Mini App",
                    web_app=WebAppInfo(url=webapp_url),
                )
            ]
        ],
        resize_keyboard=True,
    )
