from fastapi import FastAPI
from app.routes import keyvault, cost, nlp
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AzureInsight Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(keyvault.router, prefix="/api")
app.include_router(cost.router, prefix="/api")
app.include_router(nlp.router, prefix="/api")