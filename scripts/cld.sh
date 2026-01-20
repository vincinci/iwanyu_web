#!/usr/bin/env bash
set -euo pipefail

# Loads local env (gitignored) and runs the Cloudinary CLI (cld) without putting
# secrets on the command line.

# Load env files if present
set -a
if [[ -f ".env.local" ]]; then
  # shellcheck disable=SC1091
  source .env.local
fi
if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  source .env
fi
set +a

# Prefer CLOUDINARY_URL if provided; otherwise assemble it from key/secret/name.
if [[ -z "${CLOUDINARY_URL:-}" ]]; then
  if [[ -n "${CLOUDINARY_API_KEY:-}" && -n "${CLOUDINARY_API_SECRET:-}" && -n "${CLOUDINARY_CLOUD_NAME:-}" ]]; then
    export CLOUDINARY_URL="cloudinary://${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}@${CLOUDINARY_CLOUD_NAME}"
  fi
fi

if [[ -z "${CLOUDINARY_URL:-}" ]]; then
  echo "Missing Cloudinary credentials. Set CLOUDINARY_URL or CLOUDINARY_* env vars in .env.local (recommended)." >&2
  exit 1
fi

exec "$HOME/.local/bin/cld" "$@"
