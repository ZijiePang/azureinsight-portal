# src/clients/keyvault_client.py

from azure.keyvault.secrets import SecretClient
from azure.keyvault.certificates import CertificateClient
from azure.mgmt.keyvault import KeyVaultManagementClient
from azure.mgmt.resource import SubscriptionClient
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class KeyVaultClient:
    def __init__(self, credential):
        self.credential = credential
        self.subscription_client = SubscriptionClient(self.credential)
        
    async def list_subscriptions(self) -> List[Dict[str, Any]]:
        """List all available Azure subscriptions"""
        try:
            subscriptions = []
            for sub in self.subscription_client.subscriptions.list():
                subscriptions.append({
                    "subscription_id": sub.subscription_id,
                    "display_name": sub.display_name,
                    "state": sub.state
                })
            return subscriptions
        except Exception as e:
            logger.error(f"Failed to list subscriptions: {e}")
            raise

    async def list_key_vaults(self, subscription_id: str) -> List[Dict[str, Any]]:
        """List all Key Vaults in a subscription"""
        try:
            kv_client = KeyVaultManagementClient(self.credential, subscription_id)
            vaults = []
            
            for vault in kv_client.vaults.list_by_subscription():
                vaults.append({
                    "name": vault.name,
                    "vault_uri": vault.properties.vault_uri,
                    "resource_group": vault.id.split('/')[4],
                    "location": vault.location,
                    "subscription_id": subscription_id
                })
            return vaults
        except Exception as e:
            logger.error(f"Failed to list Key Vaults for subscription {subscription_id}: {e}")
            raise

    async def get_secrets(self, vault_url: str) -> List[Dict[str, Any]]:
        """Get all secrets from a Key Vault"""
        try:
            client = SecretClient(vault_url=vault_url, credential=self.credential)
            secrets = []
            
            for secret_properties in client.list_properties_of_secrets():
                secret_data = {
                    "object_name": secret_properties.name,
                    "object_type": "Secret",
                    "expiration_date": secret_properties.expires_on,
                    "created_date": secret_properties.created_on,
                    "updated_date": secret_properties.updated_on,
                    "enabled": secret_properties.enabled,
                    "tags": secret_properties.tags or {}
                }
                secrets.append(secret_data)
                
            return secrets
        except Exception as e:
            logger.error(f"Failed to get secrets from {vault_url}: {e}")
            raise

    async def get_certificates(self, vault_url: str) -> List[Dict[str, Any]]:
        """Get all certificates from a Key Vault"""
        try:
            client = CertificateClient(vault_url=vault_url, credential=self.credential)
            certificates = []
            
            for cert_properties in client.list_properties_of_certificates():
                # Get certificate details
                certificate = client.get_certificate(cert_properties.name)
                
                cert_data = {
                    "object_name": cert_properties.name,
                    "object_type": "Certificate",
                    "expiration_date": cert_properties.expires_on,
                    "created_date": cert_properties.created_on,
                    "updated_date": cert_properties.updated_on,
                    "enabled": cert_properties.enabled,
                    "tags": cert_properties.tags or {},
                    "issuer": certificate.policy.issuer_name if certificate.policy else None,
                    "thumbprint": cert_properties.x509_thumbprint.hex() if cert_properties.x509_thumbprint else None
                }
                certificates.append(cert_data)
                
            return certificates
        except Exception as e:
            logger.error(f"Failed to get certificates from {vault_url}: {e}")
            raise

