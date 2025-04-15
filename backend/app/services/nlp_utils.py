# app/services/nlp_utils.py
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

class SimpleNLPParser:
    """Simple rule-based NLP parser for handling natural language queries"""
    
    def __init__(self):
        self.patterns = {
            "expiry": re.compile(r"expir(?:ing|e|es|ed|ation)", re.IGNORECASE),
            "soon": re.compile(r"soon", re.IGNORECASE),
            "days": re.compile(r"(\d+)\s*days?", re.IGNORECASE),
            "weeks": re.compile(r"(\d+)\s*weeks?", re.IGNORECASE),
            "months": re.compile(r"(\d+)\s*months?", re.IGNORECASE),
            "secrets": re.compile(r"secrets?", re.IGNORECASE),
            "certificates": re.compile(r"cert(?:ificates?)?", re.IGNORECASE),
            "this_month": re.compile(r"this\s+month", re.IGNORECASE),
            "next_month": re.compile(r"next\s+month", re.IGNORECASE),
            "month_names": re.compile(r"(january|february|march|april|may|june|july|august|september|october|november|december)", re.IGNORECASE),
        }
    
    def parse_query(self, query: str) -> Dict:
        """Parse a natural language query and extract key parameters"""
        result = {
            "has_expiry_filter": False,
            "days": None,
            "type": None,
            "month": None,
            "expiry_window": None
        }
        
        # Check for expiry related terms
        if self.patterns["expiry"].search(query):
            result["has_expiry_filter"] = True
            
            # Check for "soon" or specific timeframes
            if self.patterns["soon"].search(query):
                result["expiry_window"] = 7  # Default "soon" is 7 days
            
            # Check for X days pattern
            days_match = self.patterns["days"].search(query)
            if days_match:
                result["expiry_window"] = int(days_match.group(1))
            
            # Check for X weeks pattern
            weeks_match = self.patterns["weeks"].search(query)
            if weeks_match:
                result["expiry_window"] = int(weeks_match.group(1)) * 7
            
            # Check for X months pattern
            months_match = self.patterns["months"].search(query)
            if months_match:
                result["expiry_window"] = int(months_match.group(1)) * 30
        
        # Check for this month or next month
        if self.patterns["this_month"].search(query):
            current_month = datetime.now().month
            result["month"] = current_month
        elif self.patterns["next_month"].search(query):
            next_month = (datetime.now().replace(day=1) + timedelta(days=32)).month
            result["month"] = next_month
        
        # Check for specific month names
        month_match = self.patterns["month_names"].search(query)
        if month_match:
            month_name = month_match.group(1).lower()
            month_dict = {
                "january": 1, "february": 2, "march": 3, "april": 4,
                "may": 5, "june": 6, "july": 7, "august": 8, 
                "september": 9, "october": 10, "november": 11, "december": 12
            }
            result["month"] = month_dict.get(month_name)
        
        # Check for secret/certificate type filters
        if self.patterns["secrets"].search(query) and not self.patterns["certificates"].search(query):
            result["type"] = "Secret"
        elif self.patterns["certificates"].search(query) and not self.patterns["secrets"].search(query):
            result["type"] = "Certificate"
        
        return result
    
    def generate_filter_description(self, parsed_query: Dict) -> str:
        """Generate a human-readable description of the parsed query"""
        parts = []
        
        if parsed_query["type"]:
            parts.append(f"{parsed_query['type']}s")
        else:
            parts.append("All items")
        
        if parsed_query["has_expiry_filter"]:
            if parsed_query["expiry_window"]:
                parts.append(f"expiring in the next {parsed_query['expiry_window']} days")
            elif parsed_query["month"]:
                month_name = datetime(2000, parsed_query["month"], 1).strftime("%B")
                parts.append(f"expiring in {month_name}")
        
        return " ".join(parts)

# Create a singleton instance
nlp_parser = SimpleNLPParser()