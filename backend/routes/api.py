from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.database import load_user_workout_state, save_user_workout_state

api_router = APIRouter(prefix="/api", tags=["workout_api"])


class SyncStateRequest(BaseModel):
    tg_id: int = Field(..., description="Telegram user ID")
    gender: str = "male"
    level: str = "beginner"
    week: int = 1
    focus: str = "fullbody"
    completedSets: Dict[str, bool] = Field(default_factory=dict)
    completedStretches: Dict[str, bool] = Field(default_factory=dict)
    customWeights: Dict[str, float] = Field(default_factory=dict)
    swappedExercises: Dict[str, str] = Field(default_factory=dict)
    customMediaUrls: Dict[str, str] = Field(default_factory=dict)


@api_router.get("/state/{tg_id}")
async def get_state(tg_id: int) -> Dict[str, Any]:
    if tg_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid tg_id")
    state = await load_user_workout_state(tg_id)
    return {"status": "ok", "data": state}


@api_router.post("/state")
async def post_state(req: SyncStateRequest) -> Dict[str, Any]:
    if req.tg_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid tg_id")
    await save_user_workout_state(req.tg_id, req.model_dump())
    return {"status": "saved"}
