# src/models/entities.py

from azure.data.tables import TableEntity
from datetime import datetime
from typing import Optional

class KeyVaultObjectEntity(TableEntity):
    """Azure Table Storage entity for Key Vault objects (secrets/certificates)"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
    # Partition Key: vault_name (for efficient querying by vault)
    # Row Key: object_name + object_type (unique identifier)
    
    # Required fields matching your metadata structure
    object_name: str           # Secret/Certificate name
    object_type: str          # "Secret" or "Certificate"
    vault_name: str           # Key Vault name
    subscription_id: str      # Azure subscription ID
    expiration_date: Optional[datetime]  # Expiration date
    days_remaining: Optional[int]        # Calculated field
    owner: Optional[str]      # Email from tags
    distribution_email: Optional[str]    # Email for notifications
    
    # Certificate-specific fields
    issuer: Optional[str]     # Certificate issuer
    thumbprint: Optional[str] # Certificate thumbprint
    
    # Metadata
    created_at: datetime      # When record was created
    updated_at: datetime      # Last update timestamp
    last_alert_sent: Optional[datetime]  # Last notification sent