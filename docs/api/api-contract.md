# Initial API contract skeleton

## Conventions

- Base URL: http://localhost:5000
- Format: JSON
- Public application API owner: Node/Express
- Browser clients call only this API

## Foundation endpoints

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | /api | API identity and foundation status | Implemented |
| GET | /health | API liveness | Implemented |

## Deferred endpoint groups

| Group | Future responsibility | Status |
| --- | --- | --- |
| Scenarios | Submit and retrieve synthetic planning scenarios | Deferred |
| Risk and priority | Request ML-backed risk or priority assessments | Deferred |
| Conflicts | Detect operational conflicts | Deferred |
| Block plans | Generate and inspect optimizer-produced plans | Deferred |
| What-if and emergency replanning | Evaluate changed operating conditions | Deferred |

## Contract placeholders

Before feature endpoints are added, specify:

- Request and response schemas
- Validation rules and error response format
- Idempotency and asynchronous-job behavior where applicable
- API versioning and pagination policy
- Authorization policy when authentication is in scope
