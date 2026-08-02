# Phase 6A API authorization boundary

The listener interface may choose a role-aware action, but it is never the security boundary. Every creator-facing backstage and call-in request is independently authenticated and authorized by the Fastify API.

## Verified boundary

The integration test `apps/api/test/phase-6a-authorization-boundary.integration.test.ts` verifies that:

- anonymous listeners may create a call-in only through the public broadcast route;
- unauthenticated requests cannot access creator call-in management;
- owners may create secure guest invitations;
- moderators may operate the call-in desk but may not create invitations reserved for owner, admin and broadcaster roles;
- analysts receive an explicit forbidden response for backstage and call-in management;
- non-members receive a private not-found response so organisation and broadcast membership cannot be enumerated;
- the API returns stable authorization error codes independently of which controls the web client renders.

These checks preserve the existing role matrix and cross-tenant privacy behaviour. They do not add new permissions or move authorization into the web client.
