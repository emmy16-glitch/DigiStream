# Organisation invitations and memberships

DigiStream separates platform capabilities from organisation roles. A user needs the platform `broadcaster` or `platform_admin` capability to create an organisation, then receives the organisation `owner` role.

## Roles

- `owner`: full organisation control, including promoting another member to owner
- `admin`: can invite and manage broadcasters, moderators and analysts
- `broadcaster`: can later create and operate broadcasts
- `moderator`: can later moderate chat and reports
- `analyst`: read-only access to organisation analytics and permitted records

Owners are the only members allowed to appoint owners or administrators. An organisation must always retain at least one owner. Role changes and removals use a PostgreSQL transaction-level advisory lock so concurrent requests cannot both remove the final owner.

## Invitation flow

1. An owner or administrator creates an invitation for an email address.
2. DigiStream generates a random single-use token and stores only its SHA-256 hash.
3. The raw acceptance token is returned once. This is temporary until an email-delivery adapter is added.
4. The signed-in accepting account must have the same normalized email address.
5. Accepted, revoked and expired invitations cannot be reused.
6. A pending invitation is unique per organisation and email address.

Owners may invite administrators, broadcasters, moderators and analysts. Administrators may invite only broadcasters, moderators and analysts. Invitations cannot directly create owners.

## Endpoints

```text
GET    /api/v1/organisations/:organisationId/members
POST   /api/v1/organisations/:organisationId/invitations
GET    /api/v1/organisations/:organisationId/invitations
DELETE /api/v1/organisations/:organisationId/invitations/:invitationId
POST   /api/v1/organisation-invitations/:token/accept
PATCH  /api/v1/organisations/:organisationId/members/:userId
DELETE /api/v1/organisations/:organisationId/members/:userId
```

Cross-tenant access returns the same private not-found response used by other organisation APIs. Any member may leave voluntarily, except when that member is the final owner. Owners can manage every role. Administrators cannot manage owners or other administrators.

## Environment

`ORGANISATION_INVITATION_TTL_SECONDS` controls invitation lifetime. The default is seven days, with accepted values from 15 minutes to 30 days.

## Next work

- email delivery for invitation links
- organisation audit events
- invitation resend and throttling
- member pagination for large organisations
- channel and broadcast authorization using the shared role policies
