import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.core.config import settings
from backend.app.core.database import engine, Base
from backend.app.services.redis_service import redis_service
from backend.app.services.simulation_manager import simulation_manager
from backend.app.api.v1.endpoints import router as endpoints_router
from backend.app.api.v1.websockets import router as websockets_router

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup Lifecycle ──
    logger.info("Initializing database schema...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database bootstrap completed successfully.")
    except Exception as e:
        logger.error(f"Failed to bootstrap database: {e}. Ensure PostgreSQL is running.")

    logger.info("Connecting to Redis...")
    try:
        await redis_service.connect()
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}. Ensure Redis is running.")

    logger.info("Starting traffic simulation manager...")
    await simulation_manager.start()
    
    yield
    
    # ── Shutdown Lifecycle ──
    logger.info("Stopping traffic simulation manager...")
    await simulation_manager.stop()
    logger.info("Disconnecting from Redis...")
    await redis_service.disconnect()
    logger.info("Cleanup complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to Vite frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(endpoints_router, prefix=settings.API_V1_STR)
app.include_router(websockets_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"status": "online", "service": settings.PROJECT_NAME}
