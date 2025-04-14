from fastapi import APIRouter
from app.services.azure_keyvault import get_mock_secrets

router = APIRouter()

@router.get("/keyvault_expiry")
def read_keyvault_expiry():
    return get_mock_secrets()