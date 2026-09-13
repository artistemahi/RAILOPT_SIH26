"""Top-level API router."""

from fastapi import APIRouter

from railopt_optimizer.api.routes.health import router as health_router
from railopt_optimizer.api.routes.optimize import router as optimize_router
from railopt_optimizer.api.routes.block_optimize import router as block_optimize_router

router = APIRouter()
router.include_router(health_router)
router.include_router(optimize_router)
router.include_router(block_optimize_router)
