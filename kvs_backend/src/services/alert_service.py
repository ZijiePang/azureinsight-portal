# src/services/alert_service.py

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import logging

from src.clients.table_client import AzureTableClient
from src.clients.email_client import EmailClient

logger = logging.getLogger(__name__)

class AlertService:
    def __init__(self, table_client: AzureTableClient, email_client: EmailClient):
        self.table_client = table_client
        self.email_client = email_client
        
    async def process_alerts(self, 
                           object_names: Optional[List[str]] = None,
                           force_send: bool = False) -> Dict[str, Any]:
        """Execute Pipeline ② - Alert Notification"""
        try:
            alert_stats = {
                "objects_checked": 0,
                "alerts_sent": 0,
                "errors": [],
                "recipients_notified": set()
            }
            
            # Get all entities that might need alerts
            query_result = await self.table_client.query_entities(
                filters=None,  # Get all to check expiration rules
                page_size=1000  # Large page size to get most entities
            )
            
            entities = query_result["entities"]
            
            # Filter entities that need alerts
            entities_needing_alerts = []
            for entity in entities:
                if object_names and entity.get("object_name") not in object_names:
                    continue
                    
                if self._should_send_alert(entity, force_send):
                    entities_needing_alerts.append(entity)
                    
                alert_stats["objects_checked"] += 1
            
            # Group by recipient for batch emails
            alerts_by_recipient = {}
            for entity in entities_needing_alerts:
                recipient = entity.get("distribution_email")
                if not recipient:
                    recipient = entity.get("owner")
                    
                if recipient:
                    if recipient not in alerts_by_recipient:
                        alerts_by_recipient[recipient] = []
                    alerts_by_recipient[recipient].append(entity)
            
            # Send alerts
            for recipient, recipient_entities in alerts_by_recipient.items():
                try:
                    success = await self._send_alert_email(recipient, recipient_entities)
                    if success:
                        alert_stats["alerts_sent"] += len(recipient_entities)
                        alert_stats["recipients_notified"].add(recipient)
                        
                        # Update last_alert_sent timestamp
                        await self._update_alert_timestamps(recipient_entities)
                    else:
                        alert_stats["errors"].append(f"Failed to send email to {recipient}")
                        
                except Exception as e:
                    error_msg = f"Failed to process alerts for {recipient}: {e}"
                    logger.error(error_msg)
                    alert_stats["errors"].append(error_msg)
            
            alert_stats["recipients_notified"] = list(alert_stats["recipients_notified"])
            alert_stats["alert_processed_at"] = datetime.now(timezone.utc).isoformat()
            
            return alert_stats
            
        except Exception as e:
            logger.error(f"Alert processing failed: {e}")
            raise

    def _should_send_alert(self, entity: Dict[str, Any], force_send: bool) -> bool:
        """Determine if an alert should be sent for this entity"""
        days_remaining = entity.get("days_remaining")
        
        if days_remaining is None:
            return False
            
        # Check expiration rules
        should_alert = False
        
        # 60 days warning
        if days_remaining <= 60 and days_remaining > 30:
            should_alert = True
            
        # 30 days daily reminder
        elif days_remaining <= 30:
            should_alert = True
        
        if not should_alert:
            return False
            
        # Check if we've sent an alert recently (unless forced)
        if not force_send:
            last_alert = entity.get("last_alert_sent")
            if last_alert:
                # For 30-day reminders, send daily
                if days_remaining <= 30:
                    one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
                    if last_alert > one_day_ago:
                        return False
                # For 60-day warning, send once
                else:
                    return False
                    
        return True

    async def _send_alert_email(self, recipient: str, entities: List[Dict[str, Any]]) -> bool:
        """Send alert email to recipient"""
        try:
            # Prepare email data
            objects_data = []
            for entity in entities:
                objects_data.append({
                    "object_name": entity.get("object_name"),
                    "object_type": entity.get("object_type"),
                    "vault_name": entity.get("vault_name"),
                    "expiration_date": entity.get("expiration_date"),
                    "days_remaining": entity.get("days_remaining"),
                    "issuer": entity.get("issuer"),
                    "thumbprint": entity.get("thumbprint")
                })
            
            return await self.email_client.send_alert_email(recipient, objects_data)
            
        except Exception as e:
            logger.error(f"Failed to send alert email to {recipient}: {e}")
            return False

    async def _update_alert_timestamps(self, entities: List[Dict[str, Any]]) -> None:
        """Update last_alert_sent timestamp for entities"""
        try:
            now = datetime.now(timezone.utc)
            for entity in entities:
                entity["last_alert_sent"] = now
                await self.table_client.upsert_entity(entity)
        except Exception as e:
            logger.error(f"Failed to update alert timestamps: {e}")

