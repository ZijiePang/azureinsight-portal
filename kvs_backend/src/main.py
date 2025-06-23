# src/main.py

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from azure.identity import DefaultAzureCredential

from src.clients.keyvault_client import KeyVaultClient
from src.clients.table_client import AzureTableClient
from src.clients.email_client import EmailClient
from src.services.keyvault_service import KeyVaultService
from src.services.alert_service import AlertService
# from src.services.scheduler import ScheduledTasks

from dotenv import load_dotenv
load_dotenv()

from src import dependencies  # 中央依赖注入容器

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    await startup_event()
    yield
    await shutdown_event()

async def startup_event():
    """Initialize services and start scheduler"""
    try:
        credential = DefaultAzureCredential()

        # Initialize clients
        keyvault_client = KeyVaultClient(credential)
        table_client = AzureTableClient(
            connection_string=os.getenv("AZURE_STORAGE_CONNECTION_STRING"),
            table_name=os.getenv("TABLE_NAME", "keyvaultobjects")
        )
        email_client = EmailClient(
            smtp_server=os.getenv("SMTP_SERVER"),
            smtp_port=int(os.getenv("SMTP_PORT", "587"))
        )

        # Initialize services
        keyvault_service = KeyVaultService(keyvault_client, table_client)
        alert_service = AlertService(table_client, email_client)

        # Register into global dependency module
        dependencies.keyvault_client = keyvault_client
        dependencies.table_client = table_client
        dependencies.email_client = email_client
        dependencies.keyvault_service = keyvault_service
        dependencies.alert_service = alert_service

        # Optionally start scheduled tasks
        # dependencies.scheduled_tasks = ScheduledTasks(keyvault_service, alert_service)
        # dependencies.scheduled_tasks.start_scheduler()

        logging.info("Application startup completed")

    except Exception as e:
        logging.error(f"Application startup failed: {e}")
        raise

async def shutdown_event():
    """Cleanup on application shutdown"""
    try:
        if dependencies.scheduled_tasks:
            dependencies.scheduled_tasks.stop_scheduler()
        logging.info("Application shutdown completed")
    except Exception as e:
        logging.error(f"Application shutdown failed: {e}")

# Create app instance
app = FastAPI(
    title="Key Vault Monitor API",
    description="API for monitoring Azure Key Vault secrets and certificates expiration",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or use ["http://localhost:3000"] for stricter security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.api.endpoints import keyvault, alert
app.include_router(keyvault.router)
app.include_router(alert.router)

@app.get("/")
async def root():
    return {"message": "Key Vault Monitor API", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "keyvault_client": dependencies.keyvault_client is not None,
            "table_client": dependencies.table_client is not None,
            "email_client": dependencies.email_client is not None,
            "scheduler": dependencies.scheduled_tasks is not None,
        }
    }
