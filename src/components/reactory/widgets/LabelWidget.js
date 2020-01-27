import React, { Component, Fragment } from 'react';
import { Button, Typography, Icon } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme } from '@material-ui/styles';
import { template } from 'lodash';

function formatMoney(amount, decimalCount = 2, decimal = ".", thousands = ",") {
  try {
    decimalCount = Math.abs(decimalCount);
    decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

    const negativeSign = amount < 0 ? "-" : "";

    let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
    let j = (i.length > 3) ? i.length % 3 : 0;

    return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
  } catch (e) {
    console.log(e)
  }
}

class LabelWidget extends Component {


  render() {
    const { props } = this;

    debugger;

    let labelText = template('${formData}')({ ...props });
    let labelTitle = props.uiSchema.title;
    let labelIcon = null;
    let _iconPosition = 'right';
    let _variant = 'h6';
    let theme = props.theme;
    let labelContainerStyles = {
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center'
    };
    let _renderHtml = false;

    let labelContainerProps = {
      id: `${props.idSchema && props.idSchema.$id ? props.idSchema.$id : undefined}`,
      style: {
        ...labelContainerStyles
      },
    };

    if (props.uiSchema && props.uiSchema["ui:options"]) {
      const {
        format,
        title,
        icon,
        iconType,
        iconPosition,
        variant = "h6",
        iconProps = {},
        renderHtml
      } = props.uiSchema["ui:options"];
      if (format) {
        try {
          labelText = template(format)(props);
        } catch(labelError) {
          labelText = 'bad template / props (' + format + ')';
        }
      }
      if (title) {
        try {
          labelTitle = template(title)(props);
        } catch(labelError) {
          labelTitle = 'bad template / props (' + format + ')';
        }
      }

      if (variant) _variant = variant;
      if (iconPosition) _iconPosition = iconPosition;
      if (renderHtml) _renderHtml = renderHtml;

      if (icon) {
        const _iconProps = {
          style:
          {
            marginLeft: _iconPosition === 'right' ? theme.spacing(1) : 'unset',
            marginRight: _iconPosition === 'left' ? theme.spacing(1) : 'unset',
            //marginTop: theme.spacing(1)
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

    let LabelBody;
    if (_renderHtml){
      LabelBody = <Typography variant={_variant} dangerouslySetInnerHTML={{__html: labelText}}></Typography>
    } else {
      LabelBody = <Typography variant={_variant}>{labelText}</Typography>
    }

    return (
      <div {...labelContainerProps}>
        {_iconPosition === 'left' ? labelIcon : null}
        <div>
          {labelTitle != '' && <label>{labelTitle}</label>}
          { LabelBody }
        </div>
        {_iconPosition === 'right' ? labelIcon : null}
      </div>
    )
  }
}

const LabelFieldComponent = compose(withTheme)(LabelWidget)

LabelFieldComponent.meta = {
  nameSpace: "core",
  name: "Label",
  version: "1.0.0",
  component: LabelFieldComponent
};

export default LabelFieldComponent;
