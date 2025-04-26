# app/routes/keyvault.py
from fastapi import APIRouter, Query
from typing import Dict, List, Optional
from app.services.azure_keyvault import get_keyvault_service

router = APIRouter()

@router.get("/secrets")
async def get_secrets():
    """Get all secrets and certificates from Key Vault"""
    service = get_keyvault_service()
    return await service.get_secrets()

@router.get("/secrets/expiring/{days}")
async def get_expiring_secrets(days: int):
    """Get secrets that will expire within the specified number of days"""
    service = get_keyvault_service()
    return await service.get_secrets_by_expiry_range(days)

@router.get("/search")
async def search_secrets(query: str = Query(..., description="Natural language query")):
    """Search secrets using natural language query"""
    service = get_keyvault_service()
    return await service.search_secrets(query)