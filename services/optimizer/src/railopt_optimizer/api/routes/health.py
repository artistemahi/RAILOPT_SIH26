"""Health-check route."""

from fastapi import APIRouter

from railopt_optimizer.api.controllers.health_controller import get_health

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Expose a lightweight liveness endpoint."""
    return get_health()
