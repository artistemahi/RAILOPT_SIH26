from fastapi import FastAPI

from railopt_ml.api.routes.priority_predict import router as priority_router


app = FastAPI(
    title="RAILOPT Priority ML Service",
    description="AI-powered maintenance priority prediction service",
    version="1.0.0",
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "railopt-priority-ml",
    }


app.include_router(priority_router)