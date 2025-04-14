from fastapi import APIRouter
from app.services.cost_api import get_mock_cost_data

router = APIRouter()

@router.get("/cost")
def read_cost():
    return get_mock_cost_data()