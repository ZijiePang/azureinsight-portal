# src/models/schemas.py

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Literal
from enum import Enum

class ObjectType(str, Enum):
    SECRET = "Secret"
    CERTIFICATE = "Certificate"

class ExpirationWindow(str, Enum):
    DAYS_30 = "30"
    DAYS_60 = "60" 
    DAYS_90 = "90"

# Response Models
class KeyVaultObjectResponse(BaseModel):
    object_name: str
    object_type: ObjectType
    vault_name: str
    subscription_id: str
    expiration_date: Optional[datetime]
    days_remaining: Optional[int]
    owner: Optional[EmailStr]
    distribution_email: Optional[EmailStr]
    issuer: Optional[str] = None
    thumbprint: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class KPISummaryResponse(BaseModel):
    total_secrets: int
    total_certificates: int
    expiring_30_days: int
    expiring_60_days: int
    alerts_sent_today: int

class QueryFilters(BaseModel):
    expiration_window: Optional[ExpirationWindow] = None
    owner: Optional[str] = None
    vault_name: Optional[str] = None
    search_text: Optional[str] = None
    object_type: Optional[ObjectType] = None

class PaginatedResponse(BaseModel):
    items: List[KeyVaultObjectResponse]
    total_count: int
    page: int
    page_size: int
    has_next: bool

# Request Models
class ManualSyncRequest(BaseModel):
    subscription_ids: Optional[List[str]] = None  # If empty, sync all
    force_refresh: bool = False

class ManualAlertRequest(BaseModel):
    object_names: Optional[List[str]] = None  # If empty, process all eligible
    force_send: bool = False  # Skip last_alert_sent check

