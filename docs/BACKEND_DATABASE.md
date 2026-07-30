# DigiStream backend data foundation

DigiStream uses PostgreSQL as its system of record. The API connects through `pg`, while Drizzle ORM provides typed table definitions and queries.

## Core tables

- `users` — account identity and password hashes
- `organisations` — tenant workspaces owned by users
- `organisation_memberships` — user roles inside an organisation
- `channels` — public or private audio channels owned by an organisation
- `broadcasts` — scheduled and live-event records for a channel

The first membership roles are `owner`, `admin`, `broadcaster`, `moderator`, and `analyst`.

## Migrations

Versioned SQL migrations live in `apps/api/migrations` and must never be edited after they have been applied to a shared database.

Run migrations from the repository root:

```bash
npm run db:migrate
```

The migration runner:

1. Applies files in filename order.
2. Wraps each migration in a transaction.
3. Stores a SHA-256 checksum in `digistream_schema_migrations`.
4. Rejects an applied migration if its file contents later change.

Create a new numbered SQL file for every schema change, for example:

```text
apps/api/migrations/0002_add_sessions.sql
```

## Local PostgreSQL in Termux

```bash
pkg update
pkg install postgresql
mkdir -p $PREFIX/var/lib/postgresql
test -f $PREFIX/var/lib/postgresql/PG_VERSION || initdb $PREFIX/var/lib/postgresql
pg_ctl -D $PREFIX/var/lib/postgresql start
createdb digistream
```

Create an application role and grant it access using `psql`, then copy `.env.example` to `.env` and update `DATABASE_URL` with the actual username, password, host, port, and database.

Do not commit `.env` or real database credentials.

## Health endpoint

`GET /health` reports one of these database states:

- `connected` — PostgreSQL responded successfully.
- `not-configured` — the API started without `DATABASE_URL`.
- `unavailable` — a configured database could not be reached; the endpoint returns HTTP 503.

## Continuous integration

GitHub Actions starts a clean PostgreSQL service for every Node.js 22 and Node.js 24 test job. It applies migrations, runs the integration tests, type-checks the monorepo, and builds the API and web application.

## Next backend slice

After this data foundation is merged, the next feature is identity and authentication:

1. Registration request validation
2. Email normalisation and uniqueness
3. Password hashing
4. Login and refresh-session storage
5. Logout and session revocation
6. Authentication and tenant-isolation tests
