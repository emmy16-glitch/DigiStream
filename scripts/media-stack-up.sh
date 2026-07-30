#!/bin/sh
set -eu

COMPOSE_FILE="${DIGISTREAM_MEDIA_COMPOSE:-compose.media.yml}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run the DigiStream media stack." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (docker compose)." >&2
  exit 1
fi

echo "Validating ${COMPOSE_FILE}..."
docker compose -f "$COMPOSE_FILE" config --quiet

echo "Building and starting DigiStream media services..."
docker compose -f "$COMPOSE_FILE" up -d --build --wait

cat <<'EOF'

DigiStream local media stack is ready:
  API:             http://localhost:3000
  API health:      http://localhost:3000/health
  LiveKit:         ws://localhost:7880
  OME LL-HLS:      http://localhost:3333
  OME WebRTC:      ws://localhost:3333
  PostgreSQL:      localhost:5432

Run the end-to-end media check with:
  npm run media:smoke

Stop the stack with:
  npm run media:down
EOF
