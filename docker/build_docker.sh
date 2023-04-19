#!/usr/bin/env bash
set -euo pipefail

image="restake/gaspacho"

docker buildx build -t "${image}" -f docker/Dockerfile .
