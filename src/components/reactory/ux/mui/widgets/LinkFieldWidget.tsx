import React, { Component, Fragment } from 'react';
import { Button, Icon, Fab } from '@mui/material';
import { compose } from 'redux';
import { withTheme } from '@mui/styles';
import { template } from 'lodash';
import { useNavigate } from 'react-router';

const LinkFieldWidget: React.FunctionComponent = (props: any) => {

  let linkText = template('/${formData}')({ ...props });
  let linkTitle = props.formData;
  let linkIcon = null;
  let _iconPosition = 'right';
  let theme = props.theme;
  let _variant: any = "text";
  let _component = 'button';
  let uioptions = props.uiSchema && props.uiSchema["ui:options"] ? props.uiSchema["ui:options"] : null;

  const navigate = useNavigate();

  if (uioptions) {
    const {
      format,
      title,
      icon,
      iconType,
      iconPosition,
      variant,
      iconProps = {},
      component = 'button',
    } = uioptions;
    if (format) linkText = template(format)(props)
    if (title) linkTitle = template(title)(props)
    if (variant) _variant = variant
    if (iconPosition) _iconPosition = iconPosition;
    _component = component;
    if (icon) {
      const _iconProps = {
        styles:
        {
          marginLeft: _iconPosition === 'right' ? theme.spacing(1) : 'unset',
          marginRight: _iconPosition === 'left' ? theme.spacing(1) : 'unset'
        },
        ...iconProps
      };

      const _custom = iconType

      let IconComponent = _custom !== undefined && theme.extensions ? theme.extensions[_custom].icons[icon] : null;
      if (IconComponent) {
        linkIcon = <IconComponent {...iconProps} />
      } else {
        linkIcon = <Icon {...iconProps}>{props.uiSchema["ui:options"].icon}</Icon>
      }
    }
  }

  if (uioptions === null) {
    uioptions = {
      name: props.name,
      id: props.idSchema.$id
    }
  }

  const goto = () => {
    if (props.uiSchema["ui:options"].userouter === false) window.location.assign(linkText);
    else navigate(linkText);
  };


  let $component = null;
  switch (_component.toLowerCase()) {
    case 'fab': {
      $component = (<Fab 
        id={uioptions.id} 
        name={uioptions.name} 
        size={uioptions.size || 'small'}
        onClick={goto}>{linkIcon}</Fab>);
      break;
    }
    case 'button':
    default: {
      $component = (<Button 
        id={uioptions.id} 
        name={uioptions.name} 
        onClick={goto} 
        size={uioptions.size || 'small'}
        variant={_variant}>
          {_iconPosition === 'left' ? linkIcon : null}{linkTitle}{_iconPosition === 'right' ? linkIcon : null}
      </Button>)
      break;
    }
  }

  return $component;
}

const LinkFieldComponent = compose(withTheme)(LinkFieldWidget)

export default LinkFieldComponent;
