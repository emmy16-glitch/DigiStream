# Phase 6A public delivery recovery slice

This slice separates private Studio contribution health from public listener delivery health. A LiveKit microphone room must not be destroyed merely because LiveKit Egress or OvenMediaEngine fails to start or temporarily loses delivery.

## Backend behaviour

- Delivery start, status and stop operations use a PostgreSQL advisory lock keyed by broadcast ID.
- A concurrent operation receives `DELIVERY_OPERATION_IN_PROGRESS` instead of launching a duplicate Egress or delivery request.
- A failed Egress relay remains a recoverable delivery problem and no longer moves a healthy contribution broadcast directly to terminal `failed`.
- When delivery is lost after a broadcast was live, the lifecycle moves to `reconnecting` while contribution remains available.
- A later start request replaces a failed relay with a new Egress job.
- Delivery responses include a safe problem code, checked time, retryability and whether the private Studio can remain connected. Provider credentials and external job IDs remain private.

## Creator Studio behaviour

- The original bounded verification loop still checks delivery automatically.
- Relay failure or verification timeout returns the Studio to a recoverable connected state instead of disconnecting the LiveKit room.
- The creator receives one action group with **Retry public delivery**, **Check delivery status** and **Leave private studio**.
- Retry attempts use stable attempt keys, while the server-side advisory lock remains the independent duplicate-operation boundary.
- A successful status check or retry clears recovery and moves the Studio to verified live state.
- Technical codes remain secondary diagnostics; the primary message explains that private Studio audio remains connected.

## Automated coverage

API integration tests prove that a failed relay does not terminate the broadcast, a second start creates a replacement relay, verified delivery reaches `live`, and overlapping operations receive a conflict.

Browser tests cover recoverable snapshots, successful verification, timeout guidance and stable retry attempt references.

## Deliberate boundary

Automated tests cannot prove a real Egress process, OvenMediaEngine ingest, physical microphone continuity or production network recovery. Those remain manual checks with the complete media stack running.
