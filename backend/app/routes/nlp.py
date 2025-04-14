from fastapi import APIRouter
from app.services.nlp_utils import parse_natural_query

router = APIRouter()

@router.get("/search")
def nlp_query(q: str):
    return parse_natural_query(q)