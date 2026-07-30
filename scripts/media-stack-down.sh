#!/bin/sh
set -eu

COMPOSE_FILE="${DIGISTREAM_MEDIA_COMPOSE:-compose.media.yml}"

if [ "${1:-}" = "--volumes" ]; then
  docker compose -f "$COMPOSE_FILE" down --remove-orphans --volumes
else
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
fi
