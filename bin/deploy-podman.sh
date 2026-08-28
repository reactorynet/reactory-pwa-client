#!/bin/bash
# ============================================================================
# Reactory PWA Client Podman Deployment Automation
#
# Compiles the client from source, builds the Nginx Podman container image,
# and deploys/restarts the container on the target environment.
#
# Usage:
#   bin/deploy-podman.sh [config-id] [env-id] [port] [options]
#
# Examples:
#   bin/deploy-podman.sh reactory podman 9000
#   bin/deploy-podman.sh reactory podman 9000 --no-pull
# ============================================================================
set -e

CONFIG_ID=${1:-reactory}
ENV_ID=${2:-podman}
PORT=${3:-9000}
DO_PULL=true

# Parse flags
for arg in "$@"; do
  case $arg in
    --no-pull)
      DO_PULL=false
      ;;
    --help|-h)
      echo "Usage: bin/deploy-podman.sh [config-id] [env-id] [port] [--no-pull]"
      exit 0
      ;;
  esac
done

START_TIME=$(date +%s)
echo "🚀 Starting Reactory PWA Client Podman Deployment"
echo "📦 Config: ${CONFIG_ID} | Env: ${ENV_ID} | Port: ${PORT}"

# 1. Git pull latest if requested
if [ "$DO_PULL" = true ]; then
  echo "📥 Pulling latest changes from git..."
  git pull origin master || echo "⚠️  Git pull had warnings/skipped"
fi

# 2. Build client bundle from source
echo "🔨 Compiling React/PWA client bundle..."
sh bin/build.sh "${CONFIG_ID}" "${ENV_ID}"

# 3. Build container image in Podman
echo "🐳 Building Podman container image..."
sh bin/podman-build.sh "${CONFIG_ID}" "${ENV_ID}"

BUILD_VERSION=$(node -p "require('./package.json').version")

# 4. Ensure tags exist
podman tag "localhost/reactory/${CONFIG_ID}-pwa-client:${BUILD_VERSION}" "localhost/reactory/${CONFIG_ID}-pwa-client:latest" 2>/dev/null || true

# 5. Ensure infra network exists
NETWORK_NAME="reactory-develop_reactory-network"
if ! podman network exists "${NETWORK_NAME}" 2>/dev/null; then
  echo "🌐 Creating podman network: ${NETWORK_NAME}"
  podman network create "${NETWORK_NAME}"
fi

# 6. Remove old container
CONTAINER_NAME="${CONFIG_ID}-pwa-client"
echo "♻️  Restarting container: ${CONTAINER_NAME}"
podman rm -f "${CONTAINER_NAME}" 2>/dev/null || true

# 7. Run new container
BUILD_DIR="$(pwd)/build/${CONFIG_ID}/${ENV_ID}"
podman run -d \
  --name "${CONTAINER_NAME}" \
  --network "${NETWORK_NAME}" \
  --restart unless-stopped \
  -p "${PORT}":80 \
  -v "${BUILD_DIR}":/usr/share/nginx/html:z \
  "localhost/reactory/${CONFIG_ID}-pwa-client:${BUILD_VERSION}"

# 8. Health check verification
echo "⏳ Waiting for client to serve..."
HEALTHY=false
for i in $(seq 1 6); do
  sleep 2
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    HEALTHY=true
    break
  fi
  echo "   [attempt $i/6] HTTP code: $HTTP_CODE (waiting...)"
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$HEALTHY" = true ]; then
  echo "✅ Reactory PWA Client successfully deployed in ${DURATION}s!"
  echo "🌐 Client URL: http://localhost:${PORT}"
else
  echo "⚠️  Client deployed but returned HTTP code: ${HTTP_CODE}"
  exit 1
fi
