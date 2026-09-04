# Judge demo script

1. Open the portal and switch dark/light mode.
2. Login as `authority.demo`.
3. Show Examinations and the CRITICAL / offline-resilient policy.
4. Show People and Audit Trail; explain separation of duties.
5. Sign out; login as `student01`.
6. Open My Exam and launch the secure session.
7. Grant camera permission. Explain: **no secondary mobile camera**.
8. On Q1 toggle “Looking down: normal solving” for a few seconds. Point to the telemetry. Show that Policy violations remains 0.
9. Answer questions and move between them. Per-question time accumulates independently.
10. Click “Simulate centre network outage.” Show Offline resilient state.
11. Click “Sync checkpoint” after restoring network. Show server-side session persistence.
12. Submit. Show “Pending evaluation”, not an immediate result.
13. Sign out; login as `evaluator.demo`.
14. Select the submitted attempt, enter a score, save evaluation, then publish the result.
15. Sign out; login as `student01` again and open Result.
16. Download the PDF result and show its verification ID.
17. Login as `proctor.demo` and open Monitoring / Review Queue. Show technical events separately from violations.

## Talking point

“Looking down is normal exam behaviour. We therefore do not use gaze direction as a cheating verdict. The platform exposes observation telemetry by question and separates technical/anomaly events from policy violations. Consequential integrity decisions require evidence and human review.”
