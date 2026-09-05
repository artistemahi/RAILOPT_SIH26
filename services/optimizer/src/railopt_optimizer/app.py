"""ASGI application for the RAILOPT optimizer service foundation."""

from fastapi import FastAPI

from railopt_optimizer.api.routes.router import router

app = FastAPI(title="RAILOPT Optimizer Service", version="0.1.0")
app.include_router(router)
