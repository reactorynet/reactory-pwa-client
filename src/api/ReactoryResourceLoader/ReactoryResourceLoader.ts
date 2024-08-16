const ValidResourceTypes = ['style', 'script'];

export const ReactoryResourceLoader = async (options: Reactory.Forms.IResourceLoaderOptions): Promise<void> => {
  const {
    resource,
    reactory
  } = options;

  if(!reactory) throw new Error('Reactory instance is required to load resources');
  if(!resource) throw new Error('Resource is required to load');

  const {
    utils,
    warning,
    error,
  } = reactory;

  const {
    nil,
    nilStr
  } = utils;

  if(nil(resource)) { 
    warning('Resource is nil');
    return;
  }

  if(nilStr(resource.type)) {
    error('Resource type is required');
    return;
  }

  if(nilStr(resource.uri)) {
    error('Resource uri is required');
    return;
  }
  
  if(ValidResourceTypes.includes(resource.type) === false) {
    error(`Invalid resource type: ${resource.type}`);
    return;
  }

  const resourceId = `${resource.type}_${resource.id}`; 
  if (nil(document.getElementById(resourceId)) === false) {
    document.getElementById(resourceId).remove();
  }

  switch (resource.type) {
    case 'style': {
      let styleLink = document.createElement('link');
      styleLink.id = resourceId;
      styleLink.href = resource.uri;
      styleLink.rel = 'stylesheet';
      document.head.append(styleLink)
      break;
    }
    case 'script': {
      let scriptLink = document.createElement('script');
      scriptLink.id = resourceId;
      scriptLink.src = resource.uri;
      scriptLink.type = 'text/javascript';
      document.body.append(scriptLink)
      break;
    }
    default: {
      // do nothing for now.
      break;
    }
  }
};

