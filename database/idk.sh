#!/usr/bin/env bash
set -euo pipefail

docker run -d \
  --name soundy-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=soundy \
  -p 5432:5432 \
  postgres:16