# app/routes/cost.py
from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from app.services.cost_api import cost_service

router = APIRouter()

@router.get("/data")
async def get_cost_data(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    app_id: Optional[str] = Query(None, description="Filter by application ID")
):
    """Get cost data for the specified date range and optional app ID filter"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    # calling API to get the mock data
    return await cost_service.get_cost_data(start, end, app_id)

@router.get("/untagged")
async def get_untagged_resources():
    """Get resources without application_id tag"""
    return await cost_service.get_untagged_resources()

@router.get("/anomalies")
async def detect_anomalies(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format")
):
    """Detect cost anomalies in the specified date range"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    return await cost_service.detect_anomalies(start, end)

@router.get("/insights")
async def get_ai_insights(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format")
):
    """Get AI-powered insights from cost data"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    return await cost_service.get_ai_insights(start, end)