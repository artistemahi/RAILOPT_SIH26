"""Top-level API router."""

from fastapi import APIRouter
from railopt_ml.api.routes.predict import router as predict_router
from railopt_ml.api.routes.health import router as health_router

router = APIRouter()
router.include_router(health_router)
router.include_router(predict_router)