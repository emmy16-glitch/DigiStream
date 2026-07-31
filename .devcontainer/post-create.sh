#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "[DigiStream] Installing PostgreSQL development services..."
sudo -n apt-get update
sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-client
sudo -n service postgresql start

echo "[DigiStream] Preparing the local development database..."
sudo -n -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'digistream') THEN
    ALTER ROLE digistream WITH LOGIN PASSWORD 'digistream';
  ELSE
    CREATE ROLE digistream WITH LOGIN PASSWORD 'digistream';
  END IF;
END
$$;
SQL

if ! sudo -n -u postgres psql -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'digistream'" | grep -q 1; then
  sudo -n -u postgres createdb --owner=digistream digistream
fi

sudo -n -u postgres psql -v ON_ERROR_STOP=1 -c \
  "ALTER DATABASE digistream OWNER TO digistream;"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

echo "[DigiStream] Installing locked workspace dependencies..."
npm install

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "[DigiStream] Applying database migrations..."
npm run db:migrate

echo "[DigiStream] Codespace setup is complete."
