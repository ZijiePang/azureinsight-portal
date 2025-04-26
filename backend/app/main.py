# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import keyvault, cost, nlp, mode

app = FastAPI(
    title="AzureInsight API",
    description="Backend API for the AzureInsight Portal",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(keyvault.router, prefix="/api/keyvault", tags=["Key Vault"])
app.include_router(cost.router, prefix="/api/cost", tags=["Cost Management"])
app.include_router(nlp.router, prefix="/api/nlp", tags=["NLP"])
app.include_router(mode.router, prefix="/api/mode", tags=["Mode"])


@app.get("/")
async def root():
    return {"message": "Welcome to AzureInsight API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}