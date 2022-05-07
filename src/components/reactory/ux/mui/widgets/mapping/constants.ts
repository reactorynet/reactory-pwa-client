const DEFAULT_MAP_CENTER_STATIC = { lat: parseFloat(process.env.MAPPING_DEFAULT_LAT) || -33.93264, lng: parseFloat(process.env.MAPPING_DEFAULT_LNG) || 18.4911213 };

/**
 * @param error The default error handle, in the even that none is passed
 */
const DEFAULT_ERROR_HANDLER: PositionErrorCallback = (error: GeolocationPositionError) => {
  if (window && window.reactory) {
    window.reactory.api.log(`Could not get position "${error.message}"`, { error }, 'warning');
  }
};

/**
 * The default position updated handler.  If none is passed to the map center
 * then we set the current reactory.$position value to the current geoLocation value. 
 * @param position 
 */
const DEFAULT_POSITION_UPDATED_HANDLER: PositionCallback = (position) => {
  if (window && window.reactory) {
    window.reactory.$position = position;
  }
};

const DEFAULT_MAP_CENTER_BROWSER = (onSuccess: PositionCallback, onError: PositionErrorCallback = DEFAULT_ERROR_HANDLER) => {

  if (navigator && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(onSuccess, onError);
  }

}

export default {
  DEFAULT_MAP_CENTER_STATIC,
  DEFAULT_MAP_CENTER_BROWSER,
}