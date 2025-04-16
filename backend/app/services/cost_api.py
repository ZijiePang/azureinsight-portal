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
        
        self.regions = [
            "East US",
            "West US",
            "Europe North",
            "Asia Southeast",
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
                region = random.choice(self.regions)
                creation_date = (start_date - timedelta(days=random.randint(10, 100))).strftime("%Y-%m-%d")
                
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
                
                # Calculate activity status (for inactive resources feature)
                is_active = random.random() > 0.1  # 10% chance of being inactive
                
                # Create the cost item with additional fields
                costs.append({
                    "id": f"resource-{i}-{date_string}",
                    "name": f"{resource_type.lower().replace(' ', '-')}-{i}",
                    "type": resource_type,
                    "cost": round(cost, 2),
                    "date": date_string,
                    "resourceGroup": resource_group,
                    "region": region,
                    "createdAt": creation_date,
                    "isActive": is_active,
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
        
        # Find inactive resources
        inactive_resources = [item for item in costs if not item["isActive"]]
        
        return {
            "costs": costs,
            "totalCost": round(total_cost, 2),
            "inactiveResourcesCount": len(set(item["name"] for item in inactive_resources))
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
        
        # Calculate total cost of untagged resources
        untagged_total_cost = sum(item["cost"] for item in untagged_resources)
        
        return {
            "resources": untagged_resources,
            "count": len(untagged_resources),
            "totalCost": round(untagged_total_cost, 2)
        }
    
    async def detect_anomalies(self, start_date: datetime, end_date: datetime):
        """Detect cost anomalies in the specified date range"""
        # Get cost data
        result = await self.get_cost_data(start_date, end_date)
        costs = result["costs"]
        
        # Group costs by date
        daily_costs = {}
        for item in costs:
            if item["date"] not in daily_costs:
                daily_costs[item["date"]] = 0
            daily_costs[item["date"]] += item["cost"]
        
        # Calculate average daily cost
        dates = list(daily_costs.keys())
        dates.sort()
        costs_list = [daily_costs[date] for date in dates]
        avg_cost = sum(costs_list) / len(costs_list) if costs_list else 0
        
        # Find anomalies (days with cost > 150% of average)
        anomalies = []
        anomaly_threshold = avg_cost * 1.5
        
        for date in dates:
            cost = daily_costs[date]
            if cost > anomaly_threshold:
                # Find the top contributors to this anomaly
                day_resources = [item for item in costs if item["date"] == date]
                day_resources.sort(key=lambda x: x["cost"], reverse=True)
                top_contributors = day_resources[:3]
                
                anomalies.append({
                    "date": date,
                    "normalCost": round(avg_cost, 2),
                    "anomalyCost": round(cost, 2),
                    "percentageIncrease": round(((cost / avg_cost) - 1) * 100),
                    "contributors": [
                        {
                            "resourceName": item["name"],
                            "resourceType": item["type"],
                            "cost": item["cost"]
                        } for item in top_contributors
                    ]
                })
        
        return {
            "anomalies": anomalies,
            "anomalyDaysCount": len(anomalies),
            "averageDailyCost": round(avg_cost, 2)
        }
    
    async def get_ai_insights(self, start_date: datetime, end_date: datetime):
        """Generate AI-powered insights from the cost data"""
        # Get required data
        cost_data = await self.get_cost_data(start_date, end_date)
        untagged_data = await self.get_untagged_resources()
        anomalies_data = await self.detect_anomalies(start_date, end_date)
        
        # Generate insights
        insights = []
        
        # Anomaly insight
        if anomalies_data["anomalyDaysCount"] > 0:
            max_increase = max(a["percentageIncrease"] for a in anomalies_data["anomalies"])
            top_type = next((a["contributors"][0]["resourceType"] for a in anomalies_data["anomalies"] if a["contributors"]), "resources")
            
            insights.append({
                "type": "anomaly",
                "severity": "warning",
                "message": f"⚠️ Detected {anomalies_data['anomalyDaysCount']} days of abnormal spending, with costs up to {max_increase}% above average. Consider reviewing {top_type.lower()} configurations."
            })
        
        # Untagged resources insight
        if untagged_data["count"] > 0:
            insights.append({
                "type": "tagging",
                "severity": "warning",
                "message": f"🛑 Found {untagged_data['count']} resources without application_id tags, costing a total of ${untagged_data['totalCost']}. Adding tags is recommended for better tracking."
            })
        
        # Inactive resources insight
        inactive_count = cost_data.get("inactiveResourcesCount", 0)
        if inactive_count > 0:
            insights.append({
                "type": "waste",
                "severity": "info",
                "message": f"🔍 Detected {inactive_count} inactive resources still incurring costs. Consider evaluating if these resources can be stopped or deleted to reduce costs."
            })
        
        return insights

# Create a singleton instance
cost_service = MockCostService()