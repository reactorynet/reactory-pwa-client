import React, { Fragment } from 'react';
import { Button, Icon, Fab, IconButton, Typography, Link as MuiLink, Box, InputLabel, FormControl } from '@mui/material';
import { compose } from 'redux';
import { propsToClassKey, withTheme } from '@mui/styles';
import { template } from 'lodash';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { jsx } from '@emotion/react';

const LinkFieldWidget: React.FunctionComponent = (props: any) => {
  
  const { idSchema, formData, schema, uiSchema } = props;

  let linkText = template('/${formData}')({ ...props });
  let linkTitle = formData;
  let labelTitle = props.schema?.title || props.idSchema?.$id;
  let linkIcon = null;
  let _iconPosition = 'right';
  let theme = props.theme;
  let _variant: any = "text";
  let _component = 'button';
  let uioptions = props.uiSchema && props.uiSchema["ui:options"] ? props.uiSchema["ui:options"] : null;
  let iconOptions = {};
  let showLabel = true;
  let useRouterLink = true;

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
      iconOptions: _iconOptions = {},
      component = 'button',
      size = 'small',
      showLabel: _showLabel = true,
      showLinkTitle: _showLinkTitle = true,
      useRouter = true,
      sx = {},
      containerSx = {},
      containerType = 'Box', // can be 'Box' or 'FormControl'
    } = uioptions;
    if (format) linkText = template(format)(props)
    if (title) linkTitle = template(title)(props)
    if (variant) _variant = variant
    if (iconPosition) _iconPosition = iconPosition;
    _component = component;
    iconOptions = { ...iconProps, ..._iconOptions };
    showLabel = _showLabel !== false;
    useRouterLink = useRouter !== false;
    if (icon) {
      const _iconProps: any = {
        style: {
          marginLeft: _iconPosition === 'right' ? theme.spacing(1) : 'unset',
          marginRight: _iconPosition === 'left' ? theme.spacing(1) : 'unset',
          // @ts-ignore
          ...iconOptions.style,
        },
        // @ts-ignore
        color: iconOptions.color,
        // @ts-ignore
        fontSize: iconOptions.fontSize,
        ...iconOptions,
      };
      const _custom = iconType;
      let IconComponent = _custom !== undefined && theme.extensions ? theme.extensions[_custom].icons[icon] : null;
      if (IconComponent) {
        linkIcon = <IconComponent {...iconOptions} />
      } else {
        linkIcon = <Icon {..._iconProps}>{icon}</Icon>
      }
    }
  }

  if (uioptions === null) {
    uioptions = {
      name: props.name,
      id: props.idSchema.$id,
      sx: {}
    }
  }

  const goto = () => {
    // Helper function to detect if URL is external
    const isExternalUrl = (url: string): boolean => {
      if (!url) return false;
      // Check if it starts with http:// or https://
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return true;
      }
      // Check if it starts with // (protocol-relative URL)
      if (url.startsWith('//')) {
        return true;
      }
      // Check if it's a mailto:, tel:, or other external protocol
      if (url.includes('://')) {
        return true;
      }
      return false;
    };

    const isExternal = isExternalUrl(linkText);
    
    // If useRouter is false, always use window.location or window.open
    if (uioptions.useRouter === false) {
      if (uioptions.openInNewWindow === true) {
        window.open(linkText, '_blank');
        return;
      }
      window.location.assign(linkText);
      return;
    }
    
    // If useRouter is true (default), check if URL is external
    if (isExternal) {
      // For external URLs, use window.location or window.open regardless of useRouter setting
      if (uioptions.openInNewWindow === true) {
        window.open(linkText, '_blank');
        return;
      }
      window.location.assign(linkText);
      return;
    }
    
    // For internal URLs and useRouter is true, use React Router navigate
    navigate(linkText);
  };

  let $component = null;
  switch (_component.toLowerCase()) {
    case 'fab': {
      $component = (<Fab 
        id={uioptions.id} 
        name={uioptions.name} 
        size={uioptions.size || 'small'}
        onClick={goto}
        sx={uioptions.sx}
        >{linkIcon}</Fab>);
      break;
    }
    case 'iconbutton': {
      $component = (
        <IconButton
          id={uioptions.id}
          name={uioptions.name}
          onClick={goto}
          sx={uioptions.sx}
        >
          {linkIcon}
        </IconButton>
      );
      break;
    }
    case 'label': {
      $component = (
        <Fragment>
          <Typography component="span" sx={uioptions.sx}>{linkTitle}</Typography>
          <IconButton onClick={goto} sx={uioptions.sx}>{linkIcon}</IconButton>
        </Fragment>
      );
      break;
    }
    case 'link': {
      $component = useRouterLink ? (
        <MuiLink id={idSchema.$id} component={RouterLink} to={linkText} sx={uioptions.sx} underline="hover">
          {_iconPosition === 'left' ? linkIcon : null}
          {linkTitle}
          {_iconPosition === 'right' ? linkIcon : null}
        </MuiLink>
      ) : (
        <MuiLink id={idSchema.$id} href={linkText} sx={uioptions.sx} underline="hover" target={uioptions.openInNewWindow ? '_blank' : undefined}>
          {_iconPosition === 'left' ? linkIcon : null}
          {linkTitle}
          {_iconPosition === 'right' ? linkIcon : null}
        </MuiLink>
      );
      break;
    }
    case 'button':
    default: {
      $component = (<Button 
        id={uioptions.id} 
        name={uioptions.name} 
        onClick={goto} 
        size={uioptions.size || 'small'}
        variant={_variant}
        sx={uioptions.sx}
        >
          {_iconPosition === 'left' ? linkIcon : null}{linkTitle}{_iconPosition === 'right' ? linkIcon : null}
      </Button>)
      break;
    }
  }

  let Container = Box;
  if (uioptions.containerType === 'FormControl') {
    Container = FormControl;
  }

  // Add a class to the parent schema field to ensure proper label positioning
  React.useEffect(() => {
    // Find the parent schema field element that contains the InputLabel
    try {
      if (idSchema && idSchema.$id) {
        const parentEl = document?.getElementById(idSchema.$id)?.closest('.MuiFormControl-root');
        if (parentEl) {
          // Add a class that we can target with CSS to force label shrinking
          parentEl.classList.add('reactory-label-widget');
          
          // Find any InputLabel within this parent and force it to shrink
          const inputLabel = parentEl.querySelector('.MuiInputLabel-root');
          if (inputLabel) {
            inputLabel.classList.add('MuiInputLabel-shrink');
          }
        }
      }
    } catch (err) {
      // Ignore errors, just a DOM manipulation
    }
  }, [idSchema?.$id]);

  if (showLabel !== true) return $component;
  else {
    if (labelTitle && labelTitle.indexOf('${') > -1 ) {
      labelTitle = template(labelTitle)(props);
    }
    return (
      <Container sx={uioptions.containerSx || {}} className="reactory-link-widget-container">        
        {$component}
      </Container>
    );
  }
}

const LinkFieldComponent = compose(withTheme)(LinkFieldWidget)

export default LinkFieldComponent;
