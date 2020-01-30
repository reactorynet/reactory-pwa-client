import React, { Component, Fragment } from 'react';
import { Icon, Input } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme } from '@material-ui/styles';
import { template } from 'lodash';
import { throttle } from 'lodash'

class MaterialInputWidget extends Component {

  render() {
    const { props } = this;

    let labelTitle = props.uiSchema.title;
    let labelIcon = null;
    let _iconPosition = 'left';
    let theme = props.theme;
    let args = {
      type: 'text'
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
      } = props.uiSchema["ui:options"];
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
          labelIcon = <Icon {..._iconProps}>{props.uiSchema["ui:options"].icon}</Icon>
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
          {labelTitle != '' && <label>{labelTitle}</label>}
          <Input {...args} readOnly={uiOptions.readOnly === true} value={formData || schema.default} onChange={throttle(onInputChanged, 250)} fullWidth />
        </div>
      </div>
    )
  }
}

const MaterialInputComponent = compose(withTheme)(MaterialInputWidget)

// MaterialInputComponent.meta = {
//   nameSpace: "core",
//   name: "MaterialInput",
//   version: "1.0.0",
//   component: MaterialInputComponent
// };

export default MaterialInputComponent;
