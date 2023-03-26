![Build Anything Fast](/branding/reactory-logo.png)
# Reactory Client

The Reactory Client is a progressive web app built on Material UI using the [Mui kit](https://mui.com). It acts as a runtime for Reactory-configured components, which are any valid React component. The client has a microkernel/component proxy that allows schema-defined interfaces to be invoked as components.

Users are provided with a list of server-side forms that are available based on their role. 

The client is an open-source application built for the Reactory server and cannot be used in isolation without the server.

## Install and Configuration

The configuration for the Reactory client is much simpler than the server. After cloning the code from GitHub or Bitbucket, run `npm i` to install dependencies. Then, configure your client by creating a folder for your application in the `config/env` folder. For example, if your application key/code is "acme", create the following folder structure: `config/env/acme`. Check the [`config/env/README.MD`](config/env/README.MD) for sample configuration setup and options.

## Develop

You can make changes to the Reactory Client as you see fit, but it is advised to keep your client in line with the master build and do all customisation in your own plugin. Note that v1 of the application is mostly complete in terms of components, but there has been an upgrade from the BETA v0.9x that was built on v4 of the MUI components. So, some components may not be fully functional, but they are updated weekly. MaterialTableWidget has basic search, paging, and grid binding ability, but more advanced features are being added for remote sorting, column reordering, etc.

## Plugins

The client allows for components to be installed on a per-component level or as part of a dependency. Plugins are installed when they are first required, meaning the first form that includes the plugin in its resource dependency will inject and load the remote resource into the browser. If you want a plugin to be installed when the application loads, define a form with `$GLOBAL$` prefix in the form name and add your plugin to the resource dependency. 

i.e. 

```typescript
{
  id: "acme.plugin.form",
  nameSpace: "acme",
  name: "$GLOBAL$AcmePluginForm"
  version: "1.0.0",
  resources: [{
    id: "some_script_id",
    type: "script",
    uri: "https://somecomponent.com/file.min.js"
  }]
  schema: {}
  uiSchema: {}
}
```

## Pull Requests

Pull requests are accepted and appreciated where components are updated, cleaned up, refactored, and in line with the direction of the application development.

## Build and Deployment

The Reactory Client has several utilities in the `bin/` folder that you can use to build and deploy your application. Refer to the readme file for more details.

For more information on the schema forms and components, see the `docs/development/schema` folder.
