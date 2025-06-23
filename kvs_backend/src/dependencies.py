# src/dependencies.py
from src.services.keyvault_service import KeyVaultService
from src.services.alert_service import AlertService
from src.clients.table_client import AzureTableClient

keyvault_service: KeyVaultService = None
alert_service: AlertService = None
table_client: AzureTableClient = None

async def get_keyvault_service() -> KeyVaultService:
    return keyvault_service

async def get_alert_service() -> AlertService:
    return alert_service

async def get_table_client() -> AzureTableClient:
    return table_client
