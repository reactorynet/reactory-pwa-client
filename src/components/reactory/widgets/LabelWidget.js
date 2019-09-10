import React,  { Component, Fragment } from 'react';
import { Button, Typography } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme } from '@material-ui/styles';
import { template } from 'lodash';

class LabelWidget extends Component {


  render(){
    const { props } = this;

    let labelText = template('${formData}')({...props});
    let labelTitle = props.uiSchema.title;
    let labelIcon = null;          
    let _iconPosition = 'right';
    let _variant = 'h6';
    let theme = props.theme;

    if(props.uiSchema && props.uiSchema["ui:options"]){
      const { format, title, icon, iconType, iconPosition, variant = "h6", iconProps = { } } = props.uiSchema["ui:options"];
      if(format) labelText = template(format)(props);      
      if(title) labelTitle = template(title)(props);
      if(variant) _variant = variant;
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
          labelIcon = <IconComponent {...iconProps} />
        } else {
          labelIcon = <Icon {...iconProps}>{props.uiSchema["ui:options"].icon}</Icon>
        }
      }                
    }
   
    return (
      <Typography variant={_variant}>{_iconPosition === 'left' ? labelIcon : null}{labelTitle} {labelText}{_iconPosition === 'right' ? labelIcon : null}</Typography>
    )
  }
}

const LabelFieldComponent = compose(withTheme)(LabelWidget)

export default LabelFieldComponent;