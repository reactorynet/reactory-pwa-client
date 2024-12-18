import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import { map } from 'lodash';
import {
  Paper,
  Grid
} from '@mui/material';

const DefaultProfile = {
  id: 'default',
  name: 'Guest',
};

function isArguments(object) {
  return Object.prototype.toString.call(object) === "[object Arguments]";
}

export function deepEquals(a, b, ca = [], cb = []) {
  // Partially extracted from node-deeper and adapted to exclude comparison
  // checks for functions.
  // https://github.com/othiym23/node-deeper
  if (a === b) {
    return true;
  } else if (typeof a === "function" || typeof b === "function") {
    // Assume all functions are equivalent
    // see https://github.com/mozilla-services/react-jsonschema-form/issues/255
    return true;
  } else if (typeof a !== "object" || typeof b !== "object") {
    return false;
  } else if (a === null || b === null) {
    return false;
  } else if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  } else if (a instanceof RegExp && b instanceof RegExp) {
    return (
      a.source === b.source &&
      a.global === b.global &&
      a.multiline === b.multiline &&
      a.lastIndex === b.lastIndex &&
      a.ignoreCase === b.ignoreCase
    );
  } else if (isArguments(a) || isArguments(b)) {
    if (!(isArguments(a) && isArguments(b))) {
      return false;
    }
    let slice = Array.prototype.slice;
    return deepEquals(slice.call(a), slice.call(b), ca, cb);
  } else {
    if (a.constructor !== b.constructor) {
      return false;
    }

    let ka = Object.keys(a);
    let kb = Object.keys(b);
    // don't bother with stack acrobatics if there's nothing there
    if (ka.length === 0 && kb.length === 0) {
      return true;
    }
    if (ka.length !== kb.length) {
      return false;
    }

    let cal = ca.length;
    while (cal--) {
      if (ca[cal] === a) {
        return cb[cal] === b;
      }
    }
    ca.push(a);
    cb.push(b);

    ka.sort();
    kb.sort();
    for (var j = ka.length - 1; j >= 0; j--) {
      if (ka[j] !== kb[j]) {
        return false;
      }
    }

    let key;
    for (let k = ka.length - 1; k >= 0; k--) {
      key = ka[k];
      if (!deepEquals(a[key], b[key], ca, cb)) {
        return false;
      }
    }

    ca.pop();
    cb.pop();

    return true;
  }
}

/** Either returns a reference to, or creates (if necessary), 
 * the element with the given tag name and ID */
export const getElement = (elementName, id, append = true) => {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement(elementName)
    el.id = id
    if (append === true)
      document.body.appendChild(el)
    else
      document.body.insertBefore(el, document.body.childNodes[0])
  }
  return el
};

export const attachComponent = (ComponentToMount, props, element) => {
  //console.log('Attaching component with props to element', { ComponentToMount, props, element });
  if (element instanceof Array) {
    element.map(e => {
      ReactDOM.render(<ComponentToMount {...props} />, e)
    })
  } else ReactDOM.render(<ComponentToMount />, element);
};


export const nil = (input) => { return input === null || input === undefined };
export const nilStr = (input) => {
  if (nil(input)) return true;
  if (input instanceof String && nil(input.trim) === false) {
    return input.trim() === '';
  } else {
    return false;
  }
};

export const isEmail = (input) => {
  const rgx = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/igm;
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
  width: '100%',
  height: 'auto',
  display: 'flex',
  justifyContent: 'center'
};




export const CenteredContainer = (props) => {
  let attrs = { ...props };
  attrs['children'] = undefined;

  return (
    <Grid container {...attrs} alignItems="center">
      <Grid item xs={12} lg={12}>
        {props.children}
      </Grid>
    </Grid>
  )
};

export const BasicContainer = (props) => {

  let attrs = { ...props };
  if (attrs.style) attrs.style = { ...paperStyles, ...attrs.style };
  else attrs.style = { ...paperStyles };
  attrs['children'] = undefined;

  return (
    <Paper {...attrs}>
      {props.children}
    </Paper>
  )

};

/**
 * Function that iterates over an object and it's properties iterativly 
 * strip out properties from an object. The default key is the __typename
 * key, as often objects are copied from the results and posted back to the 
 * graphql server. When it contains the typename it often leads to failures 
 * in the graph mutation / query.
 * @param obj - the object to inspect and clean
 * @param key - the property name that needs to be removed
 * @returns a cleaned object.
 */
export const omitDeep = (obj: Object | Object[] | any | any[], key: string = '__typename') => {
  if (nil(obj)) return null;
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

/**
 * Function that iterates over an array and clears each element in the array
 * from any properties that match the given key.
 * @param arr - the array the inspect
 * @param key - the keyname to remove from each element.
 * @returns array with values properties removed matching the key
 */
export const omitDeepArrayWalk = (arr: any[], key = '__typename') => {
  return arr.map((val) => {
    if (Array.isArray(val)) return omitDeepArrayWalk(val, key)
    else if (typeof val === 'object') return omitDeep(val, key)
    return val
  })
}

export const CDNOrganizationResource = (organizationId, file) => {
  if (organizationId === null || file.startsWith('data:image')) return file;
  const seconds = Math.floor(new Date().valueOf() / 7777);
  return CDNResource(`organization/${organizationId}/${file}?t=${seconds}`);
};

export const CDNProfileResource = (profileId = 'default', file = 'default.png') => {
  const seconds = Math.floor(new Date().valueOf() / 7777);
  return CDNResource(`profiles/${profileId}/${file}?t=${seconds}`);
};

export const CDNResource = (path) => {
  return `${process.env.REACT_APP_CDN}/${path}`;
};

export const ThemeResource = (path = 'images/avatar.png') => {
  const partnerThemeRoute = CDNResource(`themes/${process.env.REACT_APP_CLIENT_KEY}/`);
  return `${partnerThemeRoute}${path}`;
}

export const getAvatar = (profile, alt?) => {
  if (nil(profile)) return CDNProfileResource();
  if (nil(profile.avatar)) return CDNProfileResource();
  if (profile.anon === true) return CDNProfileResource();
  if(profile.avatar.startsWith('data:image')) return profile.avatar;
  if(profile.avatar.startsWith('http')) return profile.avatar;
  
  return CDNProfileResource(profile.id, profile.avatar) || alt;
  //return profile.avatar
};

/**
 * Function that generates a slug from a string input
 * @param text 
 * @returns 
 */
export const makeSlug = (text: string = '', limit: number = 0) => {
  let slug: string = text
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');

  if(limit > 0 && slug.length > limit) {
    return slug.substring(0, limit);
  }

  return slug;
}

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
    { key: "today", value: moment().startOf('day').format(), text: "Today", ordinal: 0 },
    { key: "tomorrow", value: moment().startOf('day').add(1, 'day').format(), text: "Tomorrow", ordinal: 1 },
    { key: "thisWeek", value: moment().startOf('week').format(), text: "This week", ordinal: 2 },
    { key: "nextWeek", value: moment().startOf('week').add(1, 'week').format(), text: "Next week", ordinal: 3 },
    { key: "thisMonth", value: moment().startOf('month').format(), text: "This month", ordinal: 4 },
    { key: "nextMonth", value: moment().startOf('month').add(1, 'month').format(), text: "Next month", ordinal: 5 },
    { key: "custom", value: "custom", text: "Custom", ordinal: 6 }
  ],
  periodDropDownOptions: [
    { key: 1, value: 1, text: "One Month", ordinal: 0 },
    { key: 2, value: 3, text: "Three Months", ordinal: 1 },
    { key: 3, value: 6, text: "Six Months", ordinal: 2 },
    { key: 4, value: 9, text: "Nine Months", ordinal: 3 },
    { key: 5, value: 12, text: "Twelve Months", ordinal: 4 }
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
    const resourceId = `${resource.id}_res_${resource.type}_${resource.name}`;
    if (document.getElementById(resourceId) === null) {
      switch (resource.type) {
        case 'style': {
          let styleLink = document.createElement('link');
          styleLink.id = resourceId;
          styleLink.href = resource.uri || resource.src;
          styleLink.rel = 'stylesheet';
          setTimeout(() => {
            document.head.append(styleLink)
          }, 0);

          break;
        }
        case 'script': {
          let scriptLink = document.createElement('script');
          scriptLink.id = resourceId;
          scriptLink.src = resource.uri || resource.src;
          scriptLink.type = 'text/javascript';
          setTimeout(() => {
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

