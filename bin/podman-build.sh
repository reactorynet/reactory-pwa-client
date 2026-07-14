#!/bin/bash
#$0 - The name of the Bash script.
#$1 - $9 - The first 9 arguments to the Bash script. (As mentioned above.)
#$# - How many arguments were passed to the Bash script.
#$@ - All the arguments supplied to the Bash script.
#$? - The exit status of the most recently run process.
#$$ - The process ID of the current script.
#$USER - The username of the user running the script.
#$HOSTNAME - The hostname of the machine the script is running on.
#$SECONDS - The number of seconds since the script was started.
#$RANDOM - Returns a different random number each time is it referred to.
#$LINENO - Returns the current line number in the Bash script.
echo "📓 Loading Environment ./config/env/${1:-reactory}/${2:-local} "
START=$(date +%s)
export REACTORY_CONFIG_ID=${1:-reactory}
export REACTORY_ENV_ID=${2:-local}

BUILD_VERSION=$(node -p "require('./package.json').version")
IMAGE_ORG=reactory
IMAGE_TAG=$IMAGE_ORG/${1:-reactory}-pwa-client:$BUILD_VERSION
BUILD_OPTIONS=./config/env/${1:-reactory}/.env.build.${2:-local}
TARFILE="./build/${1:-reactory}/${2:-local}/pwa-client-image.tar"

# Check if the BUILD_OPTIONS file exists, if it does, source it
if [ -f $BUILD_OPTIONS ]; then
  source $BUILD_OPTIONS
fi
# delete the old image if it exists
if podman images | grep -q $IMAGE_TAG; then
  echo "🚀 Image $IMAGE_TAG already exists"
  # delete the image
  echo "🗑️ Deleting Image $IMAGE_TAG"
  podman rmi $IMAGE_TAG
fi
echo "💿 Building Image $IMAGE_TAG"
podman build \
  --build-arg REACTORY_CONFIG_ID=${REACTORY_CONFIG_ID} \
  --build-arg REACTORY_ENV_ID=${REACTORY_ENV_ID} \
  -t $IMAGE_TAG \
  -f ./config/env/${1:-reactory}/${3:-Dockerfile} .

if [ $? -ne 0 ]; then
  echo "❌ Error building image $IMAGE_TAG"
  exit 1
fi

# Export the image from podman to a tar file
echo "📦 Exporting Image $IMAGE_TAG to $TARFILE"

# Check if the TARFILE exists, if it does, remove it
if [ -f $TARFILE ]; then
  rm $TARFILE
fi

podman save -o $TARFILE $IMAGE_TAG

# check if image exported successfully
if [ $? -ne 0 ]; then
  echo "❌ Error exporting image $IMAGE_TAG to $TARFILE"
  exit 1
fi

echo "🚀 Image $IMAGE_TAG exported to $TARFILE"
DONE=$(date +%s)
echo "🕒 $0 $(($DONE - $START)) seconds"
exit 0