# RAILOPT

RAILOPT is an internal prototype for SIH26027: AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways.

The foundation separates a TypeScript user-facing web application, a TypeScript orchestration API, and specialized Python services. It intentionally contains no railway business logic, machine-learning models, optimization models, database integration, authentication, or production UI.

## Repository structure

~~~
apps/web/                  React, Vite, TypeScript, and Tailwind frontend
services/api/              Node.js, Express, and TypeScript orchestration API
services/ml/               Python ML service foundation
services/optimizer/        Python OR-Tools / CP-SAT service foundation
data/                      Schemas, scenarios, and generated data
experiments/               Research and evaluation work
docs/                      Architecture, API, assumptions, research, and demo material
scripts/                   Project automation scripts
infra/                     Future deployment and infrastructure assets
~~~

## Local development

Install JavaScript dependencies:

~~~
npm.cmd install --prefix apps/web
npm.cmd install --prefix services/api
~~~

Create a virtual environment and install dependencies for each Python service:

~~~
py -m venv services/ml/.venv
services/ml/.venv/Scripts/python -m pip install -r services/ml/requirements.txt

py -m venv services/optimizer/.venv
services/optimizer/.venv/Scripts/python -m pip install -r services/optimizer/requirements.txt
~~~

Copy the applicable example environment files before overriding defaults:

~~~
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item services/api/.env.example services/api/.env
~~~

Start each service in a separate terminal:

~~~
npm.cmd run dev --prefix apps/web
npm.cmd run dev --prefix services/api
services/ml/.venv/Scripts/python -m uvicorn railopt_ml.app:app --app-dir services/ml/src --port 8001
services/optimizer/.venv/Scripts/python -m uvicorn railopt_optimizer.app:app --app-dir services/optimizer/src --port 8002
~~~

Verify TypeScript builds:

~~~
npm.cmd run build --prefix apps/web
npm.cmd run build --prefix services/api
~~~

## Service ports

| Component | Port | Health endpoint |
| --- | ---: | --- |
| React frontend | 5173 | Not applicable |
| Node/Express API | 5000 | GET /health |
| Python ML service | 8001 | GET /health |
| Python optimizer service | 8002 | GET /health |

The web app communicates only with the Node API. The Node API is the future orchestration layer for calls to the ML and optimizer services.

## Current implementation status

The repository is at the development-foundation stage. Health endpoints and service boundaries are present only to enable integration checks. Domain APIs, model inference, simulation, CP-SAT scheduling, persistence, authentication, and operational UI are deliberately deferred.
