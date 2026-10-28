#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE=mcr.microsoft.com/playwright:v1.64.1-noble
# Source-only mount: never mount the user's DSH home or credentials.
exec docker run --rm --network host --ipc host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$ROOT:/work" -w /work "$IMAGE" \
  npx playwright test "$@"
