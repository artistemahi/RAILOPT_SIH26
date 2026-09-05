# RAILOPT architecture

## Integration flow

~~~
React web application
        |
        v
Node.js / Express REST API
        |----------------------|
        v                      v
Python ML service       Python optimizer service
        |                      |
        -------- future database --------
~~~

## Layer responsibilities

### React and Vite TypeScript web application

The React, Vite, and TypeScript frontend provides the future operator experience. It communicates only with the Node/Express REST API through VITE_API_BASE_URL; it must not call Python services directly. Browser-facing API types live under apps/web/src/types.

### Node.js / Express TypeScript REST API

The API is the public application boundary and future orchestration layer. It owns browser-facing REST contracts, request validation, CORS, and composition of approved ML and optimizer operations. Route modules stay thin, controllers coordinate requests, and reusable behavior belongs in services or integrations. API response and configuration types live under services/api/src/types.

### Python ML service

The ML service is reserved for data-science work such as feature preparation, model inference, and model evaluation. It is not a browser API and contains no scheduling or block-planning logic.

### Python optimizer service

The optimizer service is reserved for conflict detection, simulation, and OR-Tools CP-SAT planning. It is not a browser API and does not own ML inference.

### Future database

A persistence layer may be introduced after data models and operational requirements are agreed. The API will own application-level access patterns; neither the frontend nor a service should establish an uncontrolled direct database dependency.

## Present boundary

Only health checks and configuration are implemented. No service-to-service requests, domain commands, persistence, models, or optimization constraints exist yet.
