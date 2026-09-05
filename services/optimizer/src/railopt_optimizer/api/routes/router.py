"""Top-level API router."""

from fastapi import APIRouter

from railopt_optimizer.api.routes.health import router as health_router

router = APIRouter()
router.include_router(health_router)
