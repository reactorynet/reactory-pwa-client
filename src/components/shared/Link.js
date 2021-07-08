import React from 'react';
import { Icon } from '@material-ui/core';
import { template } from 'lodash';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Link, withRouter, useHistory } from 'react-router-dom';

const LinkComponent = (props) => {


  let linkText = template('${link}')({ ...props });
  let linkTitle = props.linkTitle;
  let linkIcon = null;

  if (props.uiSchema && props.uiSchema["ui:options"]) {
    if (props.uiSchema["ui:options"].format) {
      linkText = template(props.uiSchema["ui:options"].format)(props)
    }
    if (props.uiSchema["ui:options"].title) {
      linkTitle = template(props.uiSchema["ui:options"].title)(props)
    }

    if (props.uiSchema["ui:options"].icon) {
      const iconProps = { styles: { marginLeft: theme.spacing(1) } };
      const custom = props.uiSchema["ui:options"].iconType
      let IconComponent = custom !== undefined ? theme.extensions[custom].icons[props.uiSchema["ui:options"].icon] : null;
      if (IconComponent) {
        linkIcon = <IconComponent {...iconProps} />
      } else {
        linkIcon = <Icon {...iconProps}>{props.uiSchema["ui:options"].icon}</Icon>
      }
    }
  }


  return (
    <Link to={linkText}>{linkTitle}{linkIcon}</Link>
  )

};

const ThemeLinkComponent = compose(withRouter, withTheme)(LinkComponent);
export default ThemeLinkComponent;