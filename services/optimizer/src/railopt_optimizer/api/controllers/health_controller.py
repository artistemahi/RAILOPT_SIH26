"""Health endpoint controller."""

from railopt_optimizer.services.health_service import get_health_status


def get_health() -> dict[str, str]:
    """Return the optimizer service readiness status."""
    return get_health_status("optimizer")
