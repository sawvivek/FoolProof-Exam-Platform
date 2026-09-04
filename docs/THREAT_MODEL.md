# Threat model and product boundaries

## Candidate integrity
- Impersonation: account verification + future passkey/identity integration.
- Unauthorized applications: secure desktop shell in critical mode; full OS lockdown requires production hardening.
- Extra physical resources: centre rules + local invigilation are authoritative; normal laptop software cannot prove the physical room is empty.
- Normal behaviour: looking down/away while solving is expected and is telemetry, not a violation.

## Exam content
- Versioned exam records.
- Question approval workflow.
- Server-side answer key in MySQL.
- Exam version lock policy in application design.

## Platform / insider
- Role separation.
- Audit history.
- No direct score editing UI.
- Critical operations should be dual-authorized in production.

## Availability
- Local answer checkpoints.
- Offline-resilient session state.
- Replay/sync path when network returns.

## Integrity
- Submission SHA-256 hash in prototype.
- Hash-linked integrity events and audit records.

## Fairness
- Technical events are separate from integrity violations.
- AI/anomaly signals, if added, must create review evidence rather than automatic guilt.
- Appeals should be supported in production.
