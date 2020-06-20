
/**
 * IMPORTANT - do not use imports in this file!
 * It will break global definition.
 **/

export {}

declare global {
  interface Window {
      reactory: ReactoryApi;
  }
}

declare module 'object-mapper';
/// <reference path="../node_modules/@types/googlemaps/index.d.ts" />
declare module 'googlemaps';