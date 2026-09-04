# FoolProof Exam Integrity Platform — Hackathon Prototype

A centre-based, high-stakes examination platform with a web management portal, secure desktop exam shell, MySQL persistence, offline-resilient local checkpoints, per-question telemetry, technical-vs-integrity event separation, hash-linked audit events, delayed evaluation, result PDF generation and evidence-oriented review.

## Important demo boundary

This is a functional hackathon prototype, not a security-certified examination product. It intentionally avoids claiming that software can guarantee zero cheating. In centre mode, ordinary solving behaviour such as looking down at a question or writing is **not** a violation. The prototype records per-question `time_spent_seconds`, `screen_facing_seconds`, and `looking_down_seconds` as telemetry fields; only explicit policy events are classified as violations.

## Architecture

- `frontend/`: React/Vite web portal for Admin, Exam Authority, Candidate, Proctor, Reviewer and Evaluator flows.
- `backend/`: Express API with MySQL (`mysql2`) persistence and PDF result generation.
- `electron/`: desktop secure-exam shell for the candidate experience.
- `db/`: MySQL schema and demo seed data.
- `docs/`: product, workflow and security documents.

## Demo credentials

These are demo-only credentials and must be replaced for any deployment.

| Role | Username | Password |
|---|---|---|
| Platform Admin | `admin.demo` | `FoolProof@2026!` |
| Exam Conducting Body | `authority.demo` | `FoolProof@2026!` |
| Candidate 1 | `student01` | `Student@2026!` |
| Candidate 2 | `student02` | `Student@2026!` |
| Candidate 3 | `student03` | `Student@2026!` |
| Proctor | `proctor.demo` | `Proctor@2026!` |
| Reviewer | `reviewer.demo` | `Reviewer@2026!` |
| Evaluator | `evaluator.demo` | `Evaluator@2026!` |

## Requirements

- Node.js 22+
- npm 10+
- MySQL 8+
- Python 3.11+ (for future AI service integration)
- Git
- Optional: Docker Desktop

The provided prototype itself does not require Python or Docker to start the core web/API demo.

## Start

1. Install dependencies: `npm install --workspaces`
2. Create MySQL database by running `db/schema.sql`, then `db/seed.sql`.
3. Copy `backend/.env.example` to `backend/.env` and set your MySQL credentials.
4. Start backend: `npm run dev:backend`.
5. Start frontend: `npm run dev:frontend`.
6. Open the Vite URL shown by Vite.
7. Optional candidate shell: `FP_FRONTEND_URL=http://localhost:5173 npm run start:electron` (Windows PowerShell equivalent is shown in `scripts/start-demo.ps1`).

## Offline demo

During a candidate session, use **Simulate centre network outage**. The app transitions to offline-resilient UI and stores a local session snapshot. Re-enable the network and click **Sync checkpoint**. The backend verifies/persists answers and events. The implementation is designed so that production can replace localStorage with an encrypted local database / secure storage without changing the session state machine.

## Core workflow implemented

Admin/Authority → exam creation → scheduled exam → candidate enrollment → readiness screen → secure candidate session → camera permission check → per-question timing and telemetry → technical network event → offline continuation → synchronization → cryptographic submission hash → delayed evaluation → published result → PDF download → audit log.

## Production hardening still required

- OS-level secure client hardening and independent penetration testing
- enterprise authentication/SSO/WebAuthn
- production-grade secret/key management (KMS/HSM)
- encrypted evidence storage and retention/deletion policies
- tamper-evident timestamping infrastructure
- managed examination devices for highest assurance
- accessibility and accommodation validation
- formal privacy/legal assessment for each jurisdiction
- load testing and disaster recovery testing
- independently validated AI models (if/when enabled)
