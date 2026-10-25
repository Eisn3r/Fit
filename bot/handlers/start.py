import json
import logging
from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, Message

from backend.database import get_user_summary, upsert_user_profile
from bot.config import load_settings
from bot.keyboards.webapp_kb import get_main_webapp_inline_kb, get_reply_webapp_kb

logger = logging.getLogger(__name__)
router = Router(name="start_router")


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    settings = load_settings()
    user = message.from_user
    if user:
        await upsert_user_profile(
            tg_id=user.id,
            username=user.username or "",
            first_name=user.first_name or "Атлет",
        )

    welcome_text = (
        f"Привет, <b>{user.first_name if user else 'Атлет'}</b>! 👋\n\n"
        "Добро пожаловать в <b>FitPulse</b> — твой персональный фитнес-планер в формате Telegram Mini App.\n\n"
        "<b>Что внутри приложения:</b>\n"
        "• <b>Циклический сплит по дням</b> (как в FitnessOnline):\n"
        "  — <i>ПН:</i> Спина + Бицепс\n"
        "  — <i>СР:</i> Ноги + Плечи\n"
        "  — <i>ПТ:</i> Грудь + Трицепс\n"
        "  — <i>СБ:</i> Ягодицы + Пресс и Функционал\n"
        "• <b>8-недельная периодизация</b> с разгрузочной 4-й неделей (Deload 🌿)\n"
        "• <b>Умная замена упражнений</b>, если тренажер занят в зале\n"
        "• <b>Пошаговая фото-анимация</b> (Старт ↔ Пик усилия) и блок растяжки в конце тренировки.\n\n"
        "Нажми кнопку ниже, чтобы открыть приложение 👇"
    )
    await message.answer(
        welcome_text,
        reply_markup=get_main_webapp_inline_kb(settings.webapp_url),
        parse_mode="HTML",
    )


@router.message(Command("app"))
async def cmd_app(message: Message) -> None:
    settings = load_settings()
    await message.answer(
        "Кнопка быстрого запуска добавлена в нижнее меню:",
        reply_markup=get_reply_webapp_kb(settings.webapp_url),
    )


@router.callback_query(F.data == "my_stats")
async def cb_my_stats(callback: CallbackQuery) -> None:
    user_id = callback.from_user.id
    summary = await get_user_summary(user_id)
    text = (
        "📊 <b>Твой текущий профиль в FitPulse:</b>\n\n"
        f"• Уровень: <b>{summary['level']}</b>\n"
        f"• Текущая неделя цикла: <b>Неделя {summary['week']} из 8</b>\n"
        f"• Программа: <b>{summary['focus']}</b>\n"
        f"• Выполнено рабочих подходов: <b>{summary['completed_sets_count']}</b>\n"
        f"• Завершено блоков растяжки: <b>{summary['completed_stretches_count']}</b>"
    )
    if callback.message:
        await callback.message.answer(text, parse_mode="HTML")
    await callback.answer()


@router.callback_query(F.data == "how_it_works")
async def cb_how_it_works(callback: CallbackQuery) -> None:
    text = (
        "🧬 <b>Принципы эффективного тренинга в FitPulse:</b>\n\n"
        "1. <b>Разделение мышечных групп по дням:</b> вместо поверхностной нагрузки на всё тело сразу, "
        "каждый тренировочный день прицельно прорабатывает 2 синергичные группы (6 упражнений за тренировку), "
        "давая мышцам 72 часа на рост и суперкомпенсацию.\n"
        "2. <b>Волновая периодизация (8 недель):</b> Недели 1–3 плавно увеличивают рабочий объем, "
        "Неделя 4 (Deload 🌿) снижает нагрузку на 10% для отдыха ЦНС и связок, а Недели 5–8 выводят на пик.\n"
        "3. <b>Обязательная заминка:</b> в конце каждого дня выполняй 3 целевых упражнения на растяжку (5–7 минут)."
    )
    if callback.message:
        await callback.message.answer(text, parse_mode="HTML")
    await callback.answer()


@router.message(F.web_app_data)
async def handle_web_app_data(message: Message) -> None:
    """Handles data sent via Telegram.WebApp.sendData() from the Mini App."""
    if not message.web_app_data or not message.from_user:
        return
    try:
        payload = json.loads(message.web_app_data.data)
        sets_done = payload.get("completedSetsCount", 0)
        tonnage = payload.get("totalVolume", 0)
        week = payload.get("week", 1)
        await message.answer(
            f"✅ <b>Тренировка синхронизирована!</b>\n"
            f"• Неделя мезоцикла: <b>{week}/8</b>\n"
            f"• Выполнено сетов: <b>{sets_done}</b>\n"
            f"• Общий тоннаж: <b>{tonnage} кг</b>",
            parse_mode="HTML",
        )
    except Exception as exc:
        logger.exception("Failed to parse web_app_data: %s", exc)
