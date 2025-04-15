# app/services/cost_api.py
from datetime import datetime, timedelta
import random
from typing import Dict, List, Optional, Union

class MockCostService:
    def __init__(self):
        self.resource_types = [
            "Virtual Machine", 
            "Storage Account", 
            "Azure SQL", 
            "App Service", 
            "CosmosDB", 
            "Azure Functions"
        ]
        
        self.resource_groups = [
            "rg-production",
            "rg-staging",
            "rg-development",
            "rg-shared"
        ]
        
        self.application_ids = [
            "app-1",
            "app-2",
            "app-3",
            "app-4",
            ""  # For untagged resources
        ]
        
        self.environments = [
            "production",
            "staging",
            "development",
            ""  # For untagged resources
        ]
    
    async def get_cost_data(self, start_date: datetime, end_date: datetime, app_id: Optional[str] = None):
        """Generate mock cost data for the given date range"""
        costs = []
        current_date = start_date
        
        # Generate data for each day in the date range
        while current_date <= end_date:
            date_string = current_date.strftime("%Y-%m-%d")
            
            # Generate 20-30 resources per day
            resource_count = 20 + random.randint(0, 9)
            
            for i in range(resource_count):
                resource_type = random.choice(self.resource_types)
                resource_group = random.choice(self.resource_groups)
                application_id = random.choice(self.application_ids)
                environment = random.choice(self.environments)
                
                # If an app ID filter is provided, only include matching resources
                if app_id and application_id != app_id and app_id != "all":
                    continue
                
                # Generate a cost based on resource type
                cost = 0
                if resource_type == "Virtual Machine":
                    cost = 10 + random.random() * 90  # $10-$100
                elif resource_type == "Storage Account":
                    cost = 5 + random.random() * 15  # $5-$20
                elif resource_type == "Azure SQL":
                    cost = 15 + random.random() * 185  # $15-$200
                elif resource_type == "App Service":
                    cost = 5 + random.random() * 45  # $5-$50
                elif resource_type == "CosmosDB":
                    # Add a cost spike on a specific day for anomaly detection demo
                    if date_string == (start_date + timedelta(days=3)).strftime("%Y-%m-%d") and i % 5 == 0:
                        cost = 200 + random.random() * 300  # Spike to $200-$500
                    else:
                        cost = 20 + random.random() * 80  # $20-$100
                elif resource_type == "Azure Functions":
                    cost = 1 + random.random() * 9  # $1-$10
                else:
                    cost = 5 + random.random() * 15  # $5-$20
                
                # Create the cost item
                costs.append({
                    "id": f"resource-{i}-{date_string}",
                    "name": f"{resource_type.lower().replace(' ', '-')}-{i}",
                    "type": resource_type,
                    "cost": round(cost, 2),
                    "date": date_string,
                    "resourceGroup": resource_group,
                    "tags": {
                        "application_id": application_id,
                        "environment": environment,
                        **({"owner": f"user{random.randint(0, 4)}@company.com"} if random.random() > 0.7 else {})
                    }
                })
            
            # Move to next day
            current_date += timedelta(days=1)
        
        # Calculate total cost
        total_cost = sum(item["cost"] for item in costs)
        
        return {
            "costs": costs,
            "totalCost": round(total_cost, 2)
        }
    
    async def get_untagged_resources(self):
        """Get resources without application_id tag"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        result = await self.get_cost_data(start_date, end_date)
        
        # Filter resources without application_id tag
        untagged_resources = [
            item for item in result["costs"] 
            if not item["tags"].get("application_id")
        ]
        
        return untagged_resources
    
    async def detect_anomalies(self, start_date: datetime, end_date: datetime):
        """Generate predetermined anomalies for demo purposes"""
        anomaly_date = (start_date + timedelta(days=3)).strftime("%Y-%m-%d")
        
        return [{
            "resourceName": "cosmosdb-2",
            "date": anomaly_date,
            "normalCost": 85.20,
            "anomalyCost": 258.40,
            "percentageIncrease": 203,
            "resourceType": "CosmosDB"
        }]

# Create a singleton instance
cost_service = MockCostService()