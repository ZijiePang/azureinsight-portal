# app/routes/nlp.py
from fastapi import APIRouter, Query
from typing import Dict
from app.services.nlp_utils import nlp_parser

router = APIRouter()

@router.get("/parse")
async def parse_query(query: str = Query(..., description="Natural language query to parse")):
    """Parse a natural language query and return structured parameters"""
    parsed = nlp_parser.parse_query(query)
    description = nlp_parser.generate_filter_description(parsed)
    
    return {
        "parsed": parsed,
        "description": description,
        "original_query": query
    }