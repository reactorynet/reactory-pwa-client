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

# # Get additional options from the command line arguments
additional_options="${@:3}"
project_key=${1:-reactory}
target=${2:-local}

echo "Starting Reactory Web Client key: [$project_key] target: $target with additional options: $additional_options"
env-cmd -f ./config/env/$project_key/.env.$target npx babel-node scripts/start.ts --presets @babel/env --extensions ".js,.ts" --max_old_space_size=2000000