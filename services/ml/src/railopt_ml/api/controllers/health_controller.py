"""Health endpoint controller."""

from railopt_ml.services.health_service import get_health_status


def get_health() -> dict[str, str]:
    """Return the ML service readiness status."""
    return get_health_status("ml")
