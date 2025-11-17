'use strict';


import Server, { Middleware, Configuration as WebpackDevServerConfiguration } from "webpack-dev-server";
import { paths } from '../config/paths';

const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware');
const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware');
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');
const ignoredFiles = require('react-dev-utils/ignoredFiles');
const fs = require('fs');
const webpackConfig = require('./webpack.config.ts');
const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
const host = process.env.HOST || '0.0.0.0';

export const getWebpackDevServerConfiguration = (proxy, allowedHost): WebpackDevServerConfiguration => {  

  const config: WebpackDevServerConfiguration = {
    allowedHosts: 'auto',
    bonjour: false,
    historyApiFallback: true,
    client: {
      logging: process.env.WEBPACK_LOGGING_LEVEL ? 'none' : process.env.WEBPACK_LOGGING_LEVEL as any,
      overlay: {
        errors: true,
        warnings: true,        
      },
      progress: true,
      reconnect: true,
      webSocketTransport: 'ws',
      webSocketURL: 'auto://0.0.0.0:0/ws',
    },
    compress: true,
    // devMiddleware: {      
    //   publicPath: paths.appPublic      
    // },
    // https: protocol === 'https',
    host: 'localhost',
    port: process.env.PORT || 3000,
    setupMiddlewares: (middlewares: Middleware[], server: Server): Middleware[] => { 
      if(!server) throw new Error('Server is not defined');
      if(!middlewares) throw new Error('Middlewares are not defined');

      const { app } = server;
      if(!app) throw new Error('App is not defined');

      if (fs.existsSync(paths.proxySetup)) {
        // This registers user provided middleware for proxy reasons
        require(paths.proxySetup)(app);
      }
      // This lets us fetch source contents from webpack for the error overlay      
      app.use(evalSourceMapMiddleware(server.server));
      // This lets us open files from the runtime error overlay.
      app.use(errorOverlayMiddleware(server.server));

      // This service worker file is effectively a 'no-op' that will reset any
      // previous service worker registered for the same host:port combination.
      // We do this in development to avoid hitting the production cache if
      // it used the same host and port.
      // https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432
      app.use(noopServiceWorkerMiddleware(paths.appPath));
      return middlewares;
    },
    // onBeforeSetupMiddleware: (server) => {
    //   if(!server) throw new Error('Server is not defined');

    //   const { app } = server;
    //   if (fs.existsSync(paths.proxySetup)) {
    //     // This registers user provided middleware for proxy reasons
    //     require(paths.proxySetup)(app);
    //   }
    //   // This lets us fetch source contents from webpack for the error overlay      
    //   app.use(evalSourceMapMiddleware(server.server));
    //   // This lets us open files from the runtime error overlay.
    //   app.use(errorOverlayMiddleware(server.server));

    //   // This service worker file is effectively a 'no-op' that will reset any
    //   // previous service worker registered for the same host:port combination.
    //   // We do this in development to avoid hitting the production cache if
    //   // it used the same host and port.
    //   // https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432
    //   app.use(noopServiceWorkerMiddleware(paths.appPath));
    // },
    onListening: (server) => {
      if(!server) throw new Error('Server is not defined');

      console.debug(`Reactory Development Server running at ${server.server?.address().address}:${server.server?.address().port}`);
    }
  }

  return config;
}