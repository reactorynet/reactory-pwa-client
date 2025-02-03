echo "📓 Loading Environment ./config/env/${1:-reactory}/${2:-local} "
BUILD_VERSION=$(node -p "require('./package.json').version")
IMAGE_ORG=reactory
IMAGE_TAG=$IMAGE_ORG/${1:-reactory}-pwa-client:$BUILD_VERSION
BUILD_OPTIONS=$REACTORY_SERVER/config/env/${1:-reactory}/.env.build.${2:-local}

# Check if the BUILD_OPTIONS file exists, if it does, source it
if [ -f $BUILD_OPTIONS ]; then
  source $BUILD_OPTIONS
fi

echo "💿 Building Image $IMAGE_TAG"
podman build -t $IMAGE_TAG -f ./config/env/${1:-reactory}/${3:-Dockerfile} .