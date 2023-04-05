#!/usr/bin/env bash
set -euo pipefail

image="restake/sui-rgp"

docker buildx build -t "${image}" -f docker/Dockerfile .
