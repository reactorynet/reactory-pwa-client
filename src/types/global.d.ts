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
// declare module 'googlemaps';