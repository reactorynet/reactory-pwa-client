import React from 'react';


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