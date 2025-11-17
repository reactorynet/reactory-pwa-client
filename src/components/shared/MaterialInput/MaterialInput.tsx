import React from 'react';
import { Icon, Input } from '@mui/material';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { template } from 'lodash';
import { throttle } from 'lodash';

// Extend the Theme type to include custom extensions
interface ExtendedTheme extends Theme {
  extensions?: {
    [key: string]: {
      icons: {
        [key: string]: React.ComponentType<any>;
      };
    };
  };
}

const MaterialInputWidget = (props: any) => {
  const theme = useTheme() as ExtendedTheme;

  let labelTitle = props.uiSchema.title;
  let labelIcon = null;
  let _iconPosition = 'left';
    
    const {
      formData,
      schema,
      onChange
    } = props;
    let args = {
      type: 'text',
      placeholder: ''
    }

    let containerProps = {
      id: `${props.idSchema && props.idSchema.$id ? props.idSchema.$id : undefined}`,
      style: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center'
      },
    };

    if (props.uiSchema && props.uiSchema["ui:options"]) {
      const {
        format,
        title,
        icon,
        iconType,
        iconPosition,
        iconProps = {},
        placeholder,
        inputProps = {}
      } = props.uiSchema["ui:options"];

      if (placeholder)
        args.placeholder = placeholder;
      
      if(inputProps) args = {...args, ...inputProps}

      if (title) {
        try {
          labelTitle = template(title)(props);
        } catch (labelError) {
          labelTitle = 'bad template / props (' + format + ')';
        }
      }

      if (iconPosition) _iconPosition = iconPosition;
      if (icon) {
        const _iconProps = {
          style:
          {
            marginLeft: _iconPosition === 'right' ? theme.spacing(1) : 'unset',
            marginRight: _iconPosition === 'left' ? theme.spacing(1) : 'unset',
          },
          ...iconProps
        };

        const _custom = iconType
        let IconComponent = _custom !== undefined ? theme.extensions[_custom].icons[icon] : null;
        if (IconComponent) {
          labelIcon = <IconComponent {..._iconProps} />
        } else {
          labelIcon = <Icon color="primary" {..._iconProps}>{props.uiSchema["ui:options"].icon}</Icon>
        }

      }
    }

    const onInputChanged = (evt) => {
      evt.persist();
      onChange(evt.target.value);
    }

    return (
      <div {...containerProps}>
        {_iconPosition === 'left' ? labelIcon : null}
        <div>
          {labelTitle && labelTitle != '' && <label>{labelTitle}</label>}
          <Input {...args} value={formData || schema.default} onChange={onInputChanged} fullWidth />
        </div>
        {_iconPosition === 'right' ? labelIcon : null}
      </div>
    );
};

const MaterialInputComponent = MaterialInputWidget;
export default MaterialInputComponent;
