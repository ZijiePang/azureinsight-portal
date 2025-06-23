# src/services/keyvault_service.py

from typing import List, Optional
from datetime import datetime, timedelta, timezone
import logging

from typing import List, Optional, Dict, Any
from src.models.entities import KeyVaultObjectEntity
from src.clients.keyvault_client import KeyVaultClient
from src.clients.table_client import AzureTableClient


logger = logging.getLogger(__name__)

class KeyVaultService:
    def __init__(self, kv_client: KeyVaultClient, table_client: AzureTableClient):
        self.kv_client = kv_client
        self.table_client = table_client
        
    async def sync_inventory(self, subscription_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Execute Pipeline ① - Inventory Sync"""
        try:
            sync_stats = {
                "subscriptions_processed": 0,
                "vaults_processed": 0,
                "secrets_synced": 0,
                "certificates_synced": 0,
                "errors": []
            }
            
            # Get subscriptions to process
            all_subscriptions = await self.kv_client.list_subscriptions()
            target_subscriptions = [
                sub for sub in all_subscriptions 
                if not subscription_ids or sub["subscription_id"] in subscription_ids
            ]
            
            entities_to_upsert = []
            
            for subscription in target_subscriptions:
                try:
                    sub_id = subscription["subscription_id"]
                    logger.info(f"Processing subscription: {sub_id}")
                    
                    # Get all Key Vaults in subscription
                    vaults = await self.kv_client.list_key_vaults(sub_id)
                    
                    for vault in vaults:
                        try:
                            vault_name = vault["name"]
                            vault_url = vault["vault_uri"]
                            
                            logger.info(f"Processing vault: {vault_name}")
                            
                            # Get secrets and certificates
                            secrets = await self.kv_client.get_secrets(vault_url)
                            certificates = await self.kv_client.get_certificates(vault_url)
                            
                            # Process secrets
                            for secret in secrets:
                                entity = self._create_entity(secret, vault_name, sub_id)
                                entities_to_upsert.append(entity)
                                sync_stats["secrets_synced"] += 1
                            
                            # Process certificates
                            for cert in certificates:
                                entity = self._create_entity(cert, vault_name, sub_id)
                                entities_to_upsert.append(entity)
                                sync_stats["certificates_synced"] += 1
                                
                            sync_stats["vaults_processed"] += 1
                            
                        except Exception as e:
                            error_msg = f"Failed to process vault {vault['name']}: {e}"
                            logger.error(error_msg)
                            sync_stats["errors"].append(error_msg)
                    
                    sync_stats["subscriptions_processed"] += 1
                    
                except Exception as e:
                    error_msg = f"Failed to process subscription {subscription['subscription_id']}: {e}"
                    logger.error(error_msg)
                    sync_stats["errors"].append(error_msg)
            
            # Batch upsert all entities
            if entities_to_upsert:
                await self.table_client.batch_upsert(entities_to_upsert)
            
            sync_stats["sync_completed_at"] = datetime.now(timezone.utc).isoformat()
            return sync_stats
            
        except Exception as e:
            logger.error(f"Inventory sync failed: {e}")
            raise

    def _create_entity(self, obj_data: Dict[str, Any], vault_name: str, subscription_id: str) -> KeyVaultObjectEntity:
        """Create table entity from Key Vault object data"""
        now = datetime.now(timezone.utc)
        
        # Calculate days remaining
        days_remaining = None
        if obj_data.get("expiration_date"):
            expiration = obj_data["expiration_date"]
            if isinstance(expiration, datetime):
                delta = expiration - now
                days_remaining = delta.days
        
        # Extract owner and distribution email from tags
        tags = obj_data.get("tags", {})
        owner = tags.get("owner") or tags.get("Owner")
        distribution_email = tags.get("distribution_email") or tags.get("DistributionEmail")
        
        # Create entity
        entity = KeyVaultObjectEntity(
            PartitionKey=vault_name,  # Partition by vault for efficient queries
            RowKey=f"{obj_data['object_name']}_{obj_data['object_type']}",  # Unique identifier
            object_name=obj_data["object_name"],
            object_type=obj_data["object_type"],
            vault_name=vault_name,
            subscription_id=subscription_id,
            expiration_date=obj_data.get("expiration_date"),
            days_remaining=days_remaining,
            owner=owner,
            distribution_email=distribution_email,
            issuer=obj_data.get("issuer"),
            thumbprint=obj_data.get("thumbprint"),
            created_at=obj_data.get("created_date", now),
            updated_at=now
        )
        
        return entity
