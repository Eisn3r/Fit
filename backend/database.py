import json
import aiosqlite
from typing import Any, Dict
from bot.config import load_settings


async def init_db() -> None:
    settings = load_settings()
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                tg_id INTEGER PRIMARY KEY,
                username TEXT DEFAULT '',
                first_name TEXT DEFAULT '',
                gender TEXT DEFAULT 'male',
                level TEXT DEFAULT 'beginner',
                week INTEGER DEFAULT 1,
                focus TEXT DEFAULT 'fullbody',
                state_json TEXT DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        await db.commit()


async def upsert_user_profile(tg_id: int, username: str, first_name: str) -> None:
    settings = load_settings()
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute(
            """
            INSERT INTO users (tg_id, username, first_name)
            VALUES (?, ?, ?)
            ON CONFLICT(tg_id) DO UPDATE SET
                username = excluded.username,
                first_name = excluded.first_name,
                updated_at = CURRENT_TIMESTAMP
            """,
            (tg_id, username, first_name),
        )
        await db.commit()


async def save_user_workout_state(tg_id: int, payload: Dict[str, Any]) -> None:
    settings = load_settings()
    gender = str(payload.get("gender", "male"))
    level = str(payload.get("level", "beginner"))
    week = int(payload.get("week", 1))
    focus = str(payload.get("focus", "fullbody"))
    state_json = json.dumps(
        {
            "completedSets": payload.get("completedSets", {}),
            "completedStretches": payload.get("completedStretches", {}),
            "customWeights": payload.get("customWeights", {}),
            "swappedExercises": payload.get("swappedExercises", {}),
            "customMediaUrls": payload.get("customMediaUrls", {}),
        },
        ensure_ascii=False,
    )

    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute(
            """
            INSERT INTO users (tg_id, gender, level, week, focus, state_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(tg_id) DO UPDATE SET
                gender = excluded.gender,
                level = excluded.level,
                week = excluded.week,
                focus = excluded.focus,
                state_json = excluded.state_json,
                updated_at = CURRENT_TIMESTAMP
            """,
            (tg_id, gender, level, week, focus, state_json),
        )
        await db.commit()


async def load_user_workout_state(tg_id: int) -> Dict[str, Any]:
    settings = load_settings()
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT gender, level, week, focus, state_json FROM users WHERE tg_id = ?",
            (tg_id,),
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return {}
            extra = json.loads(row["state_json"] or "{}")
            return {
                "gender": row["gender"],
                "level": row["level"],
                "week": row["week"],
                "focus": row["focus"],
                **extra,
            }


async def get_user_summary(tg_id: int) -> Dict[str, Any]:
    data = await load_user_workout_state(tg_id)
    if not data:
        return {
            "level": "Новичок",
            "week": 1,
            "focus": "Фуллбади Сплит",
            "completed_sets_count": 0,
            "completed_stretches_count": 0,
        }
    completed_sets = data.get("completedSets", {})
    completed_stretches = data.get("completedStretches", {})
    sets_done = sum(1 for v in completed_sets.values() if v)
    stretches_done = sum(1 for v in completed_stretches.values() if v)
    return {
        "level": data.get("level", "beginner"),
        "week": data.get("week", 1),
        "focus": data.get("focus", "fullbody"),
        "completed_sets_count": sets_done,
        "completed_stretches_count": stretches_done,
    }
