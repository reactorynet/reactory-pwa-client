import React from 'react';
import { Icon } from '@mui/material';
import { template } from 'lodash';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';

interface ExtendedTheme extends Theme {
  extensions?: {
    [key: string]: {
      icons: {
        [key: string]: React.ComponentType<any>;
      };
    };
  };
}
import { Link } from 'react-router-dom';

const LinkComponent = (props: any) => {
  const theme = useTheme() as ExtendedTheme;



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

export default LinkComponent;