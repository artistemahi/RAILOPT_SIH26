"""Service-level health status."""


def get_health_status(service: str) -> dict[str, str]:
    """Return a stable service health payload."""
    return {"service": "railopt-" + service, "status": "ok"}
