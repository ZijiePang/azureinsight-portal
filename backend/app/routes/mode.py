# app/routes/mode.py
from fastapi import APIRouter, Query

router = APIRouter()

# Start in mock mode
USE_MOCK = True

@router.get("/status")
async def get_mode_status():
    return {"useMock": USE_MOCK}

@router.post("/switch")
async def switch_mode(mode: str = Query(..., description="Mode to switch to (mock or live)")):
    global USE_MOCK
    if mode == "mock":
        USE_MOCK = True
        return {"success": True, "useMock": USE_MOCK}
    elif mode == "live":
        USE_MOCK = False
        return {"success": True, "useMock": USE_MOCK}
    else:
        return {"success": False, "message": "Invalid mode. Use 'mock' or 'live'"}