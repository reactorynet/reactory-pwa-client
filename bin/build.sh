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
REACTORY_CONFIG_ID=${1:-reactory}
REACTORY_ENV_ID=${2:-local}

WORKING_FOLDER=$(pwd)
BUILD_VERSION=$(node -p "require('./package.json').version")

export REACTORY_CONFIG_ID
export REACTORY_ENV_ID

NODE_PATH=./src env-cmd -f ./config/env/$REACTORY_CONFIG_ID/.env.$REACTORY_ENV_ID npx babel-node scripts/build.ts --presets @babel/env --extensions ".js,.ts" --max_old_space_size=2000000