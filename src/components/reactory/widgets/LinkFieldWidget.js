import React,  { Component, Fragment } from 'react';
import { withRouter } from 'react-router-dom';
import { Button, Icon, Fab } from '@material-ui/core';
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
    let _component = 'button';
    let uioptions = props.uiSchema && props.uiSchema["ui:options"] ? props.uiSchema["ui:options"] : null;
    if(uioptions){
      const {
        format,
        title,
        icon,
        iconType,
        iconPosition,
        variant,
        iconProps = { },
        component = 'button',
       } = uioptions;
      if(format) linkText = template(format)(props)
      if(title) linkTitle = template(title)(props)
      if(variant) _variant = variant
      if(iconPosition) _iconPosition = iconPosition;
       _component = component;
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

    if(uioptions === null) {
      uioptions = {
        name: props.name,
        id: props.idSchema.$id
      }
    }

    const goto = () => {
      if(props.uiSchema["ui:options"].userouter === false) window.location.assign(linkText);
      else props.history.push(linkText);
    };


    let $component = null;
    switch(_component.toLowerCase()){
      case 'fab': {
        $component = (<Fragment><Fab  id={uioptions.id} name={uioptions.name} onClick={goto}>{linkIcon}</Fab></Fragment>);
        break;
      }
      case 'button':
      default: {
        $component=(<Fragment><Button id={uioptions.id} name={uioptions.name} onClick={goto} variant={variant}>{_iconPosition === 'left' ? linkIcon : null}{linkTitle}{_iconPosition === 'right' ? linkIcon : null}</Button></Fragment>)
        break;
      }
    }

    return $component;
  }
}

const LinkFieldComponent = compose(withTheme, withRouter)(LinkFieldWidget)

export default LinkFieldComponent;
