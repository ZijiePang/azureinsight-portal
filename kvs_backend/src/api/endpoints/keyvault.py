
# src/api/endpoints/keyvault.py
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends
import logging

from src.services.keyvault_service import KeyVaultService
from src.clients.table_client import AzureTableClient
from src.models.schemas import (
    ManualSyncRequest,
    PaginatedResponse,
    KPISummaryResponse,
    KeyVaultObjectResponse,
    ExpirationWindow,
    ObjectType,
    QueryFilters
)
from src.dependencies import get_table_client, get_keyvault_service


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/keyvault", tags=["keyvault"])


@router.post("/sync", response_model=Dict[str, Any])
async def sync_inventory(
    request: ManualSyncRequest,
    service: KeyVaultService = Depends(get_keyvault_service)
):
    """
    Pipeline ①: Manual trigger for inventory sync
    Pulls latest Key Vault data and updates Azure Table Storage
    """
    try:
        result = await service.sync_inventory(
            subscription_ids=request.subscription_ids
        )
        return result
    except Exception as e:
        logger.error(f"Sync inventory failed: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@router.get("/objects", response_model=PaginatedResponse)
async def query_objects(
    # Pipeline ③: Query parameters
    expiration_window: Optional[ExpirationWindow] = Query(None, description="Filter by expiration window"),
    owner: Optional[str] = Query(None, description="Filter by owner email"),
    vault_name: Optional[str] = Query(None, description="Filter by vault name"),
    search_text: Optional[str] = Query(None, description="Free text search in object names"),
    object_type: Optional[ObjectType] = Query(None, description="Filter by object type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
    table_client: AzureTableClient = Depends(get_table_client)
):
    """
    Pipeline ③: Query Key Vault objects with filters and pagination
    """
    try:
        filters = QueryFilters(
            expiration_window=expiration_window,
            owner=owner,
            vault_name=vault_name,
            search_text=search_text,
            object_type=object_type
        )
        
        result = await table_client.query_entities(filters, page, page_size)
        
        # Convert entities to response models
        items = [
            KeyVaultObjectResponse(
                object_name=entity.get("object_name"),
                object_type=entity.get("object_type"),
                vault_name=entity.get("vault_name"),
                subscription_id=entity.get("subscription_id"),
                expiration_date=entity.get("expiration_date"),
                days_remaining=entity.get("days_remaining"),
                owner=entity.get("owner"),
                distribution_email=entity.get("distribution_email"),
                issuer=entity.get("issuer"),
                thumbprint=entity.get("thumbprint"),
                created_at=entity.get("created_at"),
                updated_at=entity.get("updated_at")
            )
            for entity in result["entities"]
        ]
        
        return PaginatedResponse(
            items=items,
            total_count=result["total_count"],
            page=result["page"],
            page_size=result["page_size"],
            has_next=result["has_next"]
        )
        
    except Exception as e:
        logger.error(f"Query objects failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@router.get("/kpi", response_model=KPISummaryResponse)
async def get_kpi_summary(
    table_client: AzureTableClient = Depends(get_table_client)
):
    """
    Pipeline ④: Get KPI Summary / Health Overview
    """
    try:
        summary = await table_client.get_kpi_summary()
        return KPISummaryResponse(**summary)
    except Exception as e:
        logger.error(f"Get KPI summary failed: {e}")
        raise HTTPException(status_code=500, detail=f"KPI summary failed: {str(e)}")

@router.get("/subscriptions")
async def list_subscriptions(
    service: KeyVaultService = Depends(get_keyvault_service)
):
    """Get list of available Azure subscriptions"""
    try:
        subscriptions = await service.kv_client.list_subscriptions()
        return {"subscriptions": subscriptions}
    except Exception as e:
        logger.error(f"List subscriptions failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list subscriptions: {str(e)}")
