
![Build Anything Fast](/branding/reactory-logo.png)

# Configuring Reactory Client
Configuring the Reactory Client involves setting up the connection between the client and server, along with additional settings that help the client to function properly.

## Configuration Settings
The configuration settings listed below are used in deployment of the client app, as well as in running the app using the bin/start.sh or bin/debug.sh command.
These settings are also used in deployment of the client app.
## Configuration Sample 

Below is a configuration sample for the environment files when running 
`bin/start.sh <client-key> <environment>` or `bin/debug.sh <client-key> <environment>`

```text
# The base URL for the Reactory API
REACT_APP_API_ENDPOINT=http://localhost:4000

# The base URL for the Reactory CDN
REACT_APP_CDN=http://localhost:4000/cdn

# The title of the Reactory Launchpad
REACT_APP_TITLE='Reactory Launchpad'

# The name of the Reactory theme
REACT_APP_THEME=reactory

# The client key
REACT_APP_CLIENT_KEY=reactory

# The short name of the Reactory app
REACT_APP_SHORTNAME=Reactory

# The client password
REACT_APP_CLIENT_PASSWORD=xxxxxxxxxxxxxxxxx

# The primary color for the Reactory theme
REACT_APP_THEME_PRIMARY=#1a2049

# The background color for the Reactory theme
REACT_APP_THEME_BG=#464775

# The web root for the Reactory app
REACT_APP_WEBROOT=/www/reactory/www/html

# The user account to use to upload the built app to the client
REACT_APP_UPLOAD_BTOA=username:password 

# Disables CI-specific features during build
CI=false

# The port to use for the local development server
PORT=3000

# The Node.js environment to use
NODE_ENV=development

# The Babel environment to use
BABEL_ENV=development

````

