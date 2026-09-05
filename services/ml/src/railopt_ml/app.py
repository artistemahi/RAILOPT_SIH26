"""ASGI application for the RAILOPT ML service foundation."""

from fastapi import FastAPI

from railopt_ml.api.routes.router import router

app = FastAPI(title="RAILOPT ML Service", version="0.1.0")
app.include_router(router)
