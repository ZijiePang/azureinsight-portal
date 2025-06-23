# src/clients/table_client.py
import os
from azure.data.tables import TableServiceClient, TableClient

from azure.core.exceptions import ResourceNotFoundError
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone

import logging
from src.models.entities import KeyVaultObjectEntity
from src.models.schemas import QueryFilters

logger = logging.getLogger(__name__)

class AzureTableClient:
    def __init__(self, credential, table_name: str = "keyvaultobjects"):
        
        self.table_name = table_name
        self.table_service = TableServiceClient(endpoint=os.getenv('AZURE_TABLE_ENDPOINT'), credential=credential)
        self.table_client = self.table_service.get_table_client(table_name)
        self._ensure_table_exists()
        
    def _ensure_table_exists(self):
        """Create table if it doesn't exist"""
        try:
            self.table_service.create_table(self.table_name)
        except Exception:
            pass  # Table already exists
            
    async def upsert_entity(self, entity: KeyVaultObjectEntity) -> None:
        """Insert or update an entity"""
        try:
            entity['updated_at'] = datetime.now(timezone.utc)
            self.table_client.upsert_entity(entity)
        except Exception as e:
            logger.error(f"Failed to upsert entity {entity.get('RowKey', 'unknown')}: {e}")
            raise
            
    async def batch_upsert(self, entities: List[KeyVaultObjectEntity]) -> None:
        """
        Batch upsert entities to Azure Table Storage using submit_transaction().
        New SDK requires same PartitionKey and max 100 entities per batch.
        """
        try:
            batch_size = 100
            partitions = {}

            # Group entities by PartitionKey
            for entity in entities:
                pk = entity["PartitionKey"]
                partitions.setdefault(pk, []).append(entity)

            # Process each partition
            for partition_key, partition_entities in partitions.items():
                for i in range(0, len(partition_entities), batch_size):
                    batch = partition_entities[i:i + batch_size]

                    # Update timestamps
                    for entity in batch:
                        entity["updated_at"] = datetime.now(timezone.utc)

                    # Build transaction actions
                    actions = [
                        TableTransactionAction(
                            operation="upsert_merge",  # or "upsert_replace"
                            entity=entity
                        )
                        for entity in batch
                    ]

                    # Submit to Azure Table
                    self.table_client.submit_transaction(actions)

        except Exception as e:
            logger.error(f"Failed to batch upsert entities: {e}")
            raise

    async def query_entities(self, 
                           filters: Optional[QueryFilters] = None,
                           page: int = 1,
                           page_size: int = 50) -> Dict[str, Any]:
        """Query entities with filters and pagination"""
        try:
            query_filter = self._build_query_filter(filters)
            
            # Get all matching entities first (for total count)
            all_entities = list(self.table_client.query_entities(query_filter))
            total_count = len(all_entities)
            
            # Apply pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            page_entities = all_entities[start_index:end_index]
            
            return {
                "entities": page_entities,
                "total_count": total_count,
                "page": page,
                "page_size": page_size,
                "has_next": end_index < total_count
            }
            
        except Exception as e:
            logger.error(f"Failed to query entities: {e}")
            raise

    def _build_query_filter(self, filters: Optional[QueryFilters]) -> str:
        """Build OData query filter from QueryFilters"""
        conditions = []
        
        if not filters:
            return ""
            
        if filters.expiration_window:
            days = int(filters.expiration_window.value)
            cutoff_date = datetime.now(timezone.utc) + timedelta(days=days)
            conditions.append(f"expiration_date le datetime'{cutoff_date.isoformat()}Z'")
            
        if filters.owner:
            conditions.append(f"owner eq '{filters.owner}'")
            
        if filters.vault_name:
            conditions.append(f"PartitionKey eq '{filters.vault_name}'")
            
        if filters.object_type:
            conditions.append(f"object_type eq '{filters.object_type.value}'")
            
        if filters.search_text:
            # Substring search for object name
            conditions.append(f"contains(object_name, '{filters.search_text}')")
            
        return " and ".join(conditions)

    async def get_kpi_summary(self) -> Dict[str, int]:
        """Get KPI summary data"""
        try:
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Get all entities
            all_entities = list(self.table_client.query_entities(""))
            
            summary = {
                "total_secrets": 0,
                "total_certificates": 0,
                "expiring_30_days": 0,
                "expiring_60_days": 0,
                "alerts_sent_today": 0
            }
            
            for entity in all_entities:
                # Count by type
                if entity.get('object_type') == 'Secret':
                    summary["total_secrets"] += 1
                elif entity.get('object_type') == 'Certificate':
                    summary["total_certificates"] += 1
                
                # Count expiring items
                days_remaining = entity.get('days_remaining')
                if days_remaining is not None:
                    if days_remaining <= 30:
                        summary["expiring_30_days"] += 1
                    if days_remaining <= 60:
                        summary["expiring_60_days"] += 1
                
                # Count alerts sent today
                last_alert = entity.get('last_alert_sent')
                if last_alert and last_alert >= today_start:
                    summary["alerts_sent_today"] += 1
                    
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get KPI summary: {e}")
            raise
