# Reactory Client Utilities.
There are several shell scripts you can use with the reactory client. Some are stil experimental.

## start.sh / debug.sh
The [start](start.sh) script is a Bash script that starts the Reactory Web Client. It takes two optional arguments: the first argument is the name of the Reactory Web Client key (defaulting to "reactory"), and the second argument is the target environment (defaulting to "local").

The script starts by printing a message to the console indicating the Reactory Web Client that is being started and the target environment.

The second line of the script runs the env-cmd command, which loads environment variables from a file specified by the -f option. The environment file is located at ./config/env/${1:-reactory}/.env.${2:-local}, which means it looks for a file named .env.local in the ./config/env/reactory/ folder. If the file is not found, it falls back to a default environment file .env.local.

After loading the environment variables, the script uses npx babel-node to run the start.ts script with the following options: --presets @babel/env --extensions ".js,.ts" --max_old_space_size=2000000. These options enable the script to use ES6 syntax and increase the memory limit to 2GB.

The last line of the script is commented out, but it is an alternative command that can be used to start the script using Node.js directly. It sets the memory limit to 4GB.

Once the application is started, you can access it by navigating to http://localhost:3000 in your browser and you should see a screen similar to the following:

![Reactory Client](/branding/default-client-login.png)

Login with the default reactory user and password to get the reactory dashboard screen.

![Reactory Client](/branding/default-client.png)


** debug.sh just starts the client with the debugging enabled. This is for debugging the node process, debugging your application you can do using chrome debugger or similar with react-devtools extions enabled.

## build.sh 
This script sets the environment variable NODE_PATH to the ./src directory, then runs the command `env-cmd -f ./config/env/${1:-reactory}/.env.${2:-local} node --max_old_space_size=4096 scripts/build.js.` this will create a production build of the application.

env-cmd -f sets the environment variables to the ones specified in the .env.${2:-local} file in the ./config/env/${1:-reactory}/ directory.
node runs the build.js file using Node.js.
--max_old_space_size=4096 sets the maximum heap size for the Node.js process.
The :${1:-reactory} and ${2:-local} syntax sets default values of reactory and local respectively if no arguments are passed to the script.

## deploy.sh
The deploys a specific build of the application to the configured reactory-server backend instance. The server will deploy the client to the folder on the system as provided by the environment variable `REACT_APP_WEBROOT` set in your .env.<target> file. The server does not act as the HTTP proxy for the application and it is advised you configure a static site using nginx.   
## builddeploy.sh
Builds and deploys in the same pipeline.

## test.sh
Runs all unit tests (there aren't many at this stage, we're working on)

## analyze.sh
Analyzes the built output (experimental)