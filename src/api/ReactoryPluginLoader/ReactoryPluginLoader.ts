import { ReactoryApiEventNames } from "api";

export const ReactoryPluginLoader = async (options: Reactory.Platform.IPluginLoaderOptions): Promise<void> => {
  const {
    plugin,
    reactory
  } = options;

  if(!reactory) throw new Error('Reactory instance is required to load resources');
  if(!plugin) throw new Error('Plugin is required to load');

  const {
    utils,
    warning,
    error,
    debug,
  } = reactory;

  const {
    nil,
    nilStr
  } = utils;

  if(nil(plugin)) { 
    warning('Resource is nil');
    return;
  }

  const {
    id,
    name,
    nameSpace,
    description,
    version = '1.0.0',
    platform = 'web',
    uri,
    enabled = true,
    events = [],
    icon = 'default',
    mimeType,
  } = plugin;

  if(nilStr(id)) { 
    error('Plugin id is required');
    return;
  }

  if(nilStr(name)) {
    error('Resource name is required');
    return;
  }

  if(nilStr(nameSpace)) { 
    error('Plugin namespace is required');
    return;
  }

  if(nilStr(uri)) {
    error('Resource uri is required');
    return;
  }

  debug(`Loading plugin ${name} from ${uri}`);
  
  const resourceId = `${id}`; 
  if (nil(document.getElementById(resourceId)) === false) {
    const existingResource = document.getElementById(resourceId);
    if (existingResource.attributes['data-plugin-version'] === version) {
      const lastUpdate = new Date(existingResource.attributes['data-plugin-last-update']);
      if (new Date().getTime() - lastUpdate.getTime() < 1000 * 60 * 15) {
        debug(`Plugin ${name} already loaded. Skipping...`);
        return;
      } else {
        debug(`Plugin ${name} timeout expired. Reloading...`);
        document.getElementById(resourceId).remove();
      }
    }
  }

  switch (mimeType.toLowerCase()) {  
    case 'script':
    case 'application/javascript': 
    case 'text/javascript': {
      let scriptLink = document.createElement('script');
      scriptLink.id = resourceId;
      scriptLink.src = uri;
      scriptLink.attributes['data-plugin-id'] = id;
      scriptLink.attributes['data-plugin-name'] = name;
      scriptLink.attributes['data-plugin-namespace'] = nameSpace;
      scriptLink.attributes['data-plugin-version'] = version;
      scriptLink.attributes['data-plugin-platform'] = platform;
      scriptLink.attributes['data-plugin-last-update'] = new Date().toISOString();
      scriptLink.type = 'text/javascript';
      scriptLink.onload = () => { 
        debug(`Plugin ${name} injected. Waiting for components to be loaded...`);
      }
      document.body.append(scriptLink)
      debug(`Plugin ${name} script injected successfully`);
      break;
    }
    default: {
      // do nothing for now.
      break;
    }
  }
};