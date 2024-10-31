import { Theme } from "@rjsf/material-ui";

export type ApiStatusQueryScope = 'application' | 'loggedIn' | 'theme' | 'server' | 'colorSchemes' | 'routes' | 'menus' | 'messages' | 'navigationComponents' | 'plugins';

const FRAGMENTS = {
  application: `
    id
    applicationName
    applicationAvatar
    applicationRoles
    when
    status
  `,
  loggedIn: `
    loggedIn {
      user {
        id
        firstName
        lastName
        avatar
      }
      organization {
        id
        name
        logo
      }
      team {
        id
        name
      }
      businessUnit {
        id
        name
        avatar
      }
      roles
      altRoles
      memberships {
        id
        client {
          id
          name
        }
        organization {
          id
          name
          logo
        }
        businessUnit {
          id
          name
          avatar
        }
        roles
      }
    }
  `,
  theme: `
    theme
    activeTheme(mode: $mode) {
      id
      type
      name
      nameSpace
      version
      description
      modes {
        id
        name
        description
        icon
      }
      options
      assets {
        id
        name
        assetType
        url
        loader
        options
        data
      }        
    }
    themes {
      id
      type
      name
      nameSpace
      version
      description        
    }
  `,
  server: `
    server {
      id
      version,
      started,
      clients {
        id
        clientKey
        name
        siteUrl
      }
    }
  `,
  colorSchemes: `
    colorSchemes
  `,
  routes: `
    routes {
      id
      path
      public
      roles
      componentFqn
      exact
      redirect
      componentProps
      args {
        key
        value
      }
      components {
        nameSpace
        name
        version
        args {
          key
          value
        }
        title
        description
        roles
      }
    }
  `,
  menus: `
    menus {
      id
      key
      name
      target
      roles
      entries {
        id
        ordinal
        title
        link
        external
        icon
        roles
        items {
          id
          ordinal
          title
          link
          external
          icon
          roles
        }
      }

    }
  `,
  messages: `
    messages {
      id
      title
      text
      data
      via
      icon
      image
      requireInteraction
      silent
      timestamp
      actions {
        id
        action
        icon
        componentFqn
        componentProps
        modal
        modalSize
        priority
      }
    }
  `,
  navigationComponents: `
    navigationComponents {
      componentFqn
      componentProps
      componentPropertyMap
      componentKey
      componentContext
      contextType
    }
  `,
  plugins: `
    plugins {
      id
      nameSpace
      name
      version
      description
      platform
      uri
      mimeType
      loader
      options
      enabled
      roles
    }
  `
};


const ApiStatus = (scope: ApiStatusQueryScope[]): string => { 
  return `
    query status($theme: String, $mode: String) {
        apiStatus(theme: $theme, mode: $mode) {
            ${scope.map(s => FRAGMENTS[s]).join('\n')}
        }
    }
  `;
};

export default ApiStatus;