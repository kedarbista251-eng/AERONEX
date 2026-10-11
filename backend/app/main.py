from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.endpoints import router as api_router
from app.services.seed import seed_database
from app.models.models import Resource

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AeroSync AI — Intelligent Air Operations Decision Support Platform (Non-combat planning demonstrator)",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local Vite development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed initial synthetic dataset if DB is empty
    db = SessionLocal()
    try:
        count = db.query(Resource).count()
        if count == 0:
            seed_database(db, force_reset=False)
    finally:
        db.close()

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to AeroSync AI — Intelligent Air Operations Decision Support Platform",
        "docs": "/docs",
        "health": "/api/health"
    }
