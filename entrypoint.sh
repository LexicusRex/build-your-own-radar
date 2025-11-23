#!/bin/bash
set -e

# Determine repository directory (prefer devcontainer mount)
if [ -d "/workspaces/build-your-own-radar" ]; then
  REPO_DIR="/workspaces/build-your-own-radar"
elif [ -d "/src/build-your-own-radar" ]; then
  REPO_DIR="/src/build-your-own-radar"
else
  REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

# Load environment variables from .env if present (export them for child processes)
if [ -f "$REPO_DIR/.env" ]; then
  echo "Loading environment variables from $REPO_DIR/.env"
  set -a
  # shellcheck disable=SC1090
  . "$REPO_DIR/.env"
  set +a
fi

# Exec the passed command (start script) so it inherits exported envs
exec "$@"
