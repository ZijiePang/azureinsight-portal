# src/api/endpoints/alert.py

from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
import logging

from src.services.alert_service import AlertService
from src.clients.table_client import AzureTableClient
from src.models.schemas import ManualAlertRequest
from src.dependencies import get_alert_service, get_table_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.post("/send", response_model=Dict[str, Any])
async def send_alerts(
    request: ManualAlertRequest,
    service: AlertService = Depends(get_alert_service)
):
    """
    Pipeline ②: Manual trigger for alert notifications
    Processes expiration rules and sends email alerts
    """
    try:
        result = await service.process_alerts(
            object_names=request.object_names,
            force_send=request.force_send
        )
        return result
    except Exception as e:
        logger.error(f"Send alerts failed: {e}")
        raise HTTPException(status_code=500, detail=f"Alert processing failed: {str(e)}")

@router.get("/history")
async def get_alert_history(
    days: int = Query(7, ge=1, le=90, description="Number of days to look back"),
    recipient: Optional[str] = Query(None, description="Filter by recipient email"),
    table_client: AzureTableClient = Depends(get_table_client)
):
    """Get alert sending history"""
    try:
        # This would require additional tracking in your table
        # For now, return recent objects that had alerts sent
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        # Build filter for recent alerts
        filter_conditions = [f"last_alert_sent ge datetime'{cutoff_date.isoformat()}Z'"]
        if recipient:
            filter_conditions.extend([
                f"distribution_email eq '{recipient}'",
                f"owner eq '{recipient}'"
            ])
            # Use OR logic for recipient filtering
            recipient_filter = f"({filter_conditions[-2]} or {filter_conditions[-1]})"
            filter_query = f"{filter_conditions[0]} and {recipient_filter}"
        else:
            filter_query = filter_conditions[0]
        
        entities = list(table_client.table_client.query_entities(filter_query))
        
        history = []
        for entity in entities:
            history.append({
                "object_name": entity.get("object_name"),
                "object_type": entity.get("object_type"),
                "vault_name": entity.get("vault_name"),
                "recipient": entity.get("distribution_email") or entity.get("owner"),
                "alert_sent_at": entity.get("last_alert_sent"),
                "days_remaining_when_sent": entity.get("days_remaining"),
                "expiration_date": entity.get("expiration_date")
            })
        
        return {"history": history, "total_count": len(history)}
        
    except Exception as e:
        logger.error(f"Get alert history failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get alert history: {str(e)}")

