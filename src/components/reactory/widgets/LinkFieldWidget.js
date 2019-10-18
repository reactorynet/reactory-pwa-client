import React,  { Component, Fragment } from 'react';
import { Button, Icon } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme } from '@material-ui/styles';
import { template } from 'lodash';

class LinkFieldWidget extends Component {


  render(){
    const { props } = this;

    let linkText = template('/${formData}')({...props});
    let linkTitle = props.formData;
    let linkIcon = null;          
    let _iconPosition = 'right';
    let theme = props.theme;
    let variant = "text";

    if(props.uiSchema && props.uiSchema["ui:options"]){
      const { format, title, icon, iconType, iconPosition, variant, iconProps = { } } = props.uiSchema["ui:options"];
      if(format) linkText = template(format)(props)      
      if(title) linkTitle = template(title)(props)
      if(variant) _variant = variant
      if(iconPosition) _iconPosition = iconPosition;

      if(icon){        
        const _iconProps = { 
          styles: 
          { 
            marginLeft: _iconPosition === 'right' ? theme.spacing(1) : 'unset', 
            marginRight: _iconPosition === 'left' ? theme.spacing(1) : 'unset'
          }, 
          ...iconProps 
        };

        const _custom = iconType        
        let IconComponent = _custom !== undefined ? theme.extensions[_custom].icons[icon] : null;
        if(IconComponent) {
          linkIcon = <IconComponent {...iconProps} />
        } else {
          linkIcon = <Icon {...iconProps}>{props.uiSchema["ui:options"].icon}</Icon>
        }
      }                
    }

    const goto = () => { 
      if(props.uiSchema["ui:options"].userouter === false) window.location.assign(linkText);
      else history.replace(linkText); 
    };

    return (
      <Fragment><Button onClick={goto} variant={variant}>{_iconPosition === 'left' ? linkIcon : null}{linkTitle}{_iconPosition === 'right' ? linkIcon : null}</Button></Fragment>
    )
  }
}

const LinkFieldComponent = compose(withTheme)(LinkFieldWidget)

export default LinkFieldComponent;