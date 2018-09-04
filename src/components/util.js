import React from 'react';
import moment from 'moment';
import { map } from 'lodash';

import DefaultAvatar from '../assets/images/profile/default.png';

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
  const rgx = /.+\@.+\..+/;
  return rgx.test(input);
};

export const isValidPassword = (input) => {
  const rgx = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
  return rgx.test(input);
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
    textAlign: 'center'
  };
  
  
export  const CenteredContainer = ( props ) => {
    let attrs = {...props};
    if(attrs.style) attrs.style = {...centered, ...attrs.style};
    else attrs.style = {...centered};
    attrs['children'] = undefined;
  
    return (
      <div {...attrs}>
        {props.children}
      </div>
    )
  };
  
  export const BasicContainer = ( props ) => {
  
    let attrs = {...props};
    if(attrs.style) attrs.style = {...paperStyles, ...attrs.style};
    else attrs.style = {...paperStyles};
    attrs['children'] = undefined;
  
    return (
      <div {...attrs}>
        {props.children}
      </div>
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
    return CDNResource(`organization/${organizationId}/${file}`);
  };

  export const CDNProfileResource = (profileId, file) => {
    return CDNResource(`profiles/${profileId}/${file}`);
  };

  export const CDNResource = ( path ) => {
    return `${process.env.REACT_APP_CDN}/${path}`;
  };

  export const getAvatar = (profile) => {
    if(nil(profile)) return DefaultAvatar;
    if(nil(profile.avatar)) return DefaultAvatar;
    
    if(profile.avatar.endsWith('.jpeg')) return CDNProfileResource(profile.id, profile.avatar);
    
    return profile.avatar
  };

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
