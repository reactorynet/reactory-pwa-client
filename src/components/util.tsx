import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import { map } from 'lodash';
import {
  Paper,
  Grid
} from '@material-ui/core';

const DefaultProfile = {
  id: 'default',
  name: 'Guest',
};
/** Either returns a reference to, or creates (if necessary), 
 * the element with the given tag name and ID */
export const getElement = (elementName, id, append = true) => {
  let el = document.getElementById(id)
  if (!el) {
      el = document.createElement(elementName)
      el.id = id
      if(append === true)
          document.body.appendChild( el )
      else 
          document.body.insertBefore( el, document.body.childNodes[0])
  }
  return el
};

export const attachComponent = (ComponentToMount, props, element) => {
  //console.log('Attaching component with props to element', { ComponentToMount, props, element });
  if(element instanceof Array) {
    element.map(e => { 
      ReactDOM.render(<ComponentToMount {...props} />, e) 
    })
  } else ReactDOM.render(<ComponentToMount />, element);
};


export const nil = ( input ) => { return input === null || input === undefined };
export const nilStr = ( input ) => { 
  if(nil(input)) return true;
  if(input instanceof String && nil(input.trim) === false){
    return input.trim() === '';
  } else {
    return false;
  }
};

export const isEmail = (input) => {
  const rgx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return rgx.test(input);
};

export const isValidPassword = (input = '') => {
  //const rgx = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
  //return rgx.test(input);
  return input.length >= 8
};

export const paperStyles = {  
    maxWidth: 900,
    margin: '25px 5px 25px 5px',  
    padding: 20,
    textAlign: 'center',
    display: 'inline-block',  
  };
  
export const textStyle = {
    width: '100%',
    marginTop: '10px'
  }
  
export const centered = {
    width:'100%',
    height:'auto',
    display: 'flex',
    justifyContent: 'center'
  };


  
  
export  const CenteredContainer = ( props ) => {
    let attrs = {...props};
    attrs['children'] = undefined;
  
    return (
      <Grid container {...attrs} alignItems="center">
        <Grid item xs={12} lg={12}>
          {props.children}
        </Grid>
      </Grid>
    )
  };
  
  export const BasicContainer = ( props ) => {
  
    let attrs = {...props};
    if(attrs.style) attrs.style = {...paperStyles, ...attrs.style};
    else attrs.style = {...paperStyles};
    attrs['children'] = undefined;
  
    return (
      <Paper {...attrs}>
        {props.children}
      </Paper>
    )
  
  };

  export const omitDeep = (obj, key = '__typename') => {
    if(nil(obj)) return null;
    if (Array.isArray(obj)) return omitDeepArrayWalk(obj, key)    
    const keys = Object.keys(obj)
    const newObj = {}
    keys.forEach((i) => {
      if (i !== key) {
        const val = obj[i]
        if (Array.isArray(val)) newObj[i] = omitDeepArrayWalk(val, key)
        else if (typeof val === 'object' && val !== null) newObj[i] = omitDeep(val, key)
        else newObj[i] = val
      }
    })
    return newObj
  }
  
  export const omitDeepArrayWalk = (arr, key = '__typename') => {
    return arr.map((val) => {
      if (Array.isArray(val)) return omitDeepArrayWalk(val, key)
      else if (typeof val === 'object') return omitDeep(val, key)
      return val
    })
  }

  export const CDNOrganizationResource = (organizationId, file) => {
    if(organizationId === null || file.startsWith('data:image')) return file;
    const seconds = Math.floor(new Date().valueOf() / 7777); 
    return CDNResource(`organization/${organizationId}/${file}?t=${seconds}`);
  };

  export const CDNProfileResource = (profileId = 'default', file = 'default.png') => {
    const seconds = Math.floor(new Date().valueOf() / 7777); 
    return CDNResource(`profiles/${profileId}/${file}?t=${seconds}`);
  };

  export const CDNResource = ( path ) => {
    return `${process.env.REACT_APP_CDN}/${path}`;
  };

  export const ThemeResource = ( path = 'images/avatar.png' ) => {
    const partnerThemeRoute = CDNResource(`themes/${process.env.REACT_APP_CLIENT_KEY}/`);
    return `${partnerThemeRoute}${path}`;
  }

  export const getAvatar = (profile, alt) => {
    if(nil(profile)) return CDNProfileResource();
    if(nil(profile.avatar)) return CDNProfileResource();
    if(profile.anon === true) return CDNProfileResource();
    return alt || CDNProfileResource(profile.id, profile.avatar);    
    //return profile.avatar
  };

  export const getOrganizationLogo = (organizationId, file) => {
    return CDNOrganizationResource(organizationId, file);
  }

  export const getUserFullName = (user) => {  
    return `${user.firstName} ${user.lastName}`.trim()
  }

  export const DateHelpers = {
    today: moment().startOf('day'),
    tomorrow: moment().startOf('day').add(1, 'day'),
    weekStart: moment().startOf('week').startOf('day'),
    weekEnd: moment().endOf('week').endOf('day'),
    monthStart: moment().startOf('month').startOf('day'),
    monthEnd: moment().endOf('month').endOf('day'),
    nextMonth: moment(moment().startOf('month')).add(1, 'month'),
    defaultDateDropDownOptions: [
        {key: "today", value: moment().startOf('day').format(), text: "Today", ordinal: 0},
        {key: "tomorrow", value: moment().startOf('day').add(1, 'day').format(), text: "Tomorrow", ordinal: 1},
        {key: "thisWeek", value: moment().startOf('week').format(), text: "This week", ordinal: 2},
        {key: "nextWeek", value: moment().startOf('week').add(1, 'week').format(), text: "Next week", ordinal: 3},
        {key: "thisMonth", value: moment().startOf('month').format(), text: "This month", ordinal: 4},
        {key: "nextMonth", value: moment().startOf('month').add(1, 'month').format(), text: "Next month", ordinal: 5},
        {key: "custom", value: "custom", text: "Custom", ordinal: 6}
    ],
    periodDropDownOptions: [
        {key: 1, value: 1, text: "One Month", ordinal: 0},
        {key: 2, value: 3, text: "Three Months", ordinal: 1},
        {key: 3, value: 6, text: "Six Months", ordinal: 2},
        {key: 4, value: 9, text: "Nine Months", ordinal: 3},
        {key: 5, value: 12, text: "Twelve Months", ordinal: 4}
    ],
    getDateForDropDownOption: function (key) {
        if (key === "custom") return null;

        map(this.defaultDateDropDownOptions, (option, index) => {
            if (option.key === key) return moment(option.value);
        });

        return null;
    }
};

export const injectResources = (sources = []) => {  
  sources.forEach((resource) => {    
    //console.log(`Installing Application Resource`, resource);
    const resourceId = `${resource.id}_res_${resource.type}_${resource.name}`;
    if (document.getElementById(resourceId) === null) {
      //console.log(`Adding Resource ${resourceId}`);
      switch (resource.type) {
        case 'style': {
          let styleLink = document.createElement('link');
          styleLink.id = resourceId;
          styleLink.href = resource.uri;
          styleLink.rel = 'stylesheet';
          setTimeout(()=>{
            document.head.append(styleLink)
          }, 0);
          
          break;
        }
        case 'script': {
          let scriptLink = document.createElement('script');
          scriptLink.id = resourceId;
          scriptLink.src = resource.uri;
          scriptLink.type = 'text/javascript';
          setTimeout(()=>{
            document.body.append(scriptLink)
          }, 0);
          break;
        }
        default: {
          // console.warn(`Resource Type ${resource.type}, not supported.`);
          break;
        }
      }
    }
  })
}
