# app/services/azure_keyvault.py
from datetime import datetime, timedelta
import random
from typing import Dict, List, Optional, Union
import os
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.keyvault.certificates import CertificateClient
from app.routes import mode

load_dotenv()

VAULT_URL = os.getenv("AZURE_VAULT_URL")

class KeyVaultServiceProxy:
    def __init__(self):
        self.mock_service = MockKeyVaultService()
        self.real_service = RealKeyVaultService()

    async def get_secrets(self):
        if mode.USE_MOCK:
            return await self.mock_service.get_secrets()
        else:
            return await self.real_service.get_secrets()

    async def get_secrets_by_expiry_range(self, days: int):
        if mode.USE_MOCK:
            return await self.mock_service.get_secrets_by_expiry_range(days)
        else:
            return await self.real_service.get_secrets_by_expiry_range(days)

    async def search_secrets(self, query: str):
        if mode.USE_MOCK:
            return await self.mock_service.search_secrets(query)
        else:
            return await self.real_service.search_secrets(query)


class RealKeyVaultService:
    def __init__(self):
        self.credential = DefaultAzureCredential()
        self.secret_client = SecretClient(vault_url=VAULT_URL, credential=self.credential)
        self.cert_client = CertificateClient(vault_url=VAULT_URL, credential=self.credential)

    async def get_secrets(self):
        secrets = []
        secret_names = set()
        

        for prop in self.secret_client.list_properties_of_secrets():
            secret_names.add(prop.name)
            secret = self.secret_client.get_secret(prop.name)
            secrets.append({
                "id": f"secret-{prop.name}",
                "name": prop.name,
                "type": "Secret",
                "expirationDate": prop.expires_on.strftime("%Y-%m-%d") if prop.expires_on else "N/A",
                "createdOn": prop.created_on.strftime("%Y-%m-%d"),
                "enabled": prop.enabled,
                "tags": prop.tags or {}
            })
        for prop in self.cert_client.list_properties_of_certificates():
            cert = self.cert_client.get_certificate(prop.name)

            # Certificate usually auto-generate a duplicate secret, deduplicate for less confusion
            if cert.name in secret_names:
                secrets = [s for s in secrets if s["name"] != cert.name]

            secrets.append({
                "id": f"cert-{prop.name}",
                "name": prop.name,
                "type": "Certificate",
                "expirationDate": prop.expires_on.strftime("%Y-%m-%d") if prop.expires_on else "N/A",
                "createdOn": prop.created_on.strftime("%Y-%m-%d"),
                "enabled": prop.enabled,
                "tags": prop.tags or {}
            })
        return {"value": secrets}

    async def get_secrets_by_expiry_range(self, days: int):
        from datetime import datetime, timedelta
        today = datetime.utcnow()
        future = today + timedelta(days=days)
        all_secrets = await self.get_secrets()
        return {
            "value": [
                s for s in all_secrets["value"]
                if s["expirationDate"] != "N/A" and datetime.strptime(s["expirationDate"], "%Y-%m-%d") <= future
            ]
        }

    async def search_secrets(self, query: str):
        all_secrets = await self.get_secrets()
        query = query.lower()
        return {
            "value": [
                s for s in all_secrets["value"]
                if query in s["name"].lower()
            ]
        }

class MockKeyVaultService:
    def __init__(self):
        self.mock_data = self._generate_mock_data()
    
    def _generate_mock_data(self):
        """Generate mock Key Vault secrets and certificates data"""
        today = datetime.now()
        secrets = []
        
        # Create some secrets expiring soon (within 7 days)
        for i in range(1, 4):
            expires_on = today + timedelta(days=i)
            secrets.append({
                "id": f"secret-{i}",
                "name": f"api-key-{i}",
                "type": "Secret",
                "expirationDate": expires_on.strftime("%Y-%m-%d"),
                "createdOn": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
                "enabled": True,
                "tags": {
                    "application": f"app-{i}",
                    "environment": "production" if i % 2 == 0 else "development"
                }
            })
        
        # Create some secrets expiring in 15-30 days
        for i in range(4, 9):
            expires_on = today + timedelta(days=15 + i)
            secrets.append({
                "id": f"secret-{i}",
                "name": f"db-password-{i}",
                "type": "Secret",
                "expirationDate": expires_on.strftime("%Y-%m-%d"),
                "createdOn": (today - timedelta(days=60)).strftime("%Y-%m-%d"),
                "enabled": True,
                "tags": {
                    "application": f"app-{i//2}",
                    "environment": "staging" if i % 2 == 0 else "production"
                }
            })
        
        # Create some certificates with various expiration dates
        for i in range(1, 6):
            days_to_expiry = 6 if i == 1 else (12 if i == 2 else 30 * i)
            expires_on = today + timedelta(days=days_to_expiry)
            secrets.append({
                "id": f"cert-{i}",
                "name": f"ssl-certificate-{i}",
                "type": "Certificate",
                "expirationDate": expires_on.strftime("%Y-%m-%d"),
                "createdOn": (today - timedelta(days=90)).strftime("%Y-%m-%d"),
                "enabled": True,
                "tags": {
                    "application": f"app-{i+3}",
                    "environment": "production" if i % 3 == 0 else ("staging" if i % 2 == 0 else "development")
                }
            })
        
        return secrets
    
    async def get_secrets(self):
        """Get all secrets and certificates"""
        return {"value": self.mock_data}
    
    async def get_secrets_by_expiry_range(self, days: int):
        """Get secrets expiring within specified days"""
        today = datetime.now()
        future_date = today + timedelta(days=days)
        
        filtered_secrets = [
            secret for secret in self.mock_data
            if datetime.strptime(secret["expirationDate"], "%Y-%m-%d") <= future_date
        ]
        
        return {"value": filtered_secrets}
    
    async def search_secrets(self, query: str):
        """Simple natural language search for secrets"""
        query = query.lower()
        filtered_secrets = self.mock_data.copy()
        
        if "expiring" in query:
            if "soon" in query or "7 day" in query:
                return await self.get_secrets_by_expiry_range(7)
            elif "30 day" in query or "month" in query:
                return await self.get_secrets_by_expiry_range(30)
            elif "may" in query:
                # Filter for May expiration
                filtered_secrets = [
                    s for s in filtered_secrets
                    if datetime.strptime(s["expirationDate"], "%Y-%m-%d").month == 5  # May is month 5
                ]
        
        if "cert" in query:
            filtered_secrets = [s for s in filtered_secrets if s["type"] == "Certificate"]
        elif "secret" in query:
            filtered_secrets = [s for s in filtered_secrets if s["type"] == "Secret"]
        
        return {"value": filtered_secrets}


def get_keyvault_service():
    return KeyVaultServiceProxy()

