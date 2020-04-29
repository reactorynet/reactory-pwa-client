import React, { Component, Fragment, useState } from 'react';
import { Button, Typography, Icon } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';
import { template, isNil } from 'lodash';
import { withApi } from '@reactory/client-core/api/ApiProvider';

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

  static rootStyle (theme) {
    return {};
  }


  constructor(props, context) {
    super(props, context);

    this.state = {
      formData: props.formData,
      lookupValue: null,
      lookupComplete: false,
    }
  }

  render() {

    const { props } = this;
    const self = this;

    const { api } = props;

    let labelText = props.formData ? template('${formData}')({ ...props }) : props.value;
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
    let labelTitleProps = {};
    let labelBodyProps = {};
    let _renderHtml = false;
    let LabelBody = null;

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
        renderHtml,
        titleProps = {},
        bodyProps = {},
        containerProps = {},
        componentFqn = null,
        componentProps = {},
        componentPropsMap = {},
      } = props.uiSchema["ui:options"];

      if(containerProps.style) {
        labelContainerProps.style = { ...labelContainerProps.style, ...containerProps.style };
      }

      if(props.uiSchema['ui:graphql'] && format === "$LOOKUP$") {

        labelText = self.state.lookupValue && self.state.lookupComplete === true ? self.state.lookupValue : 'LOOKUP';        
        const lookupGraphql = props.uiSchema['ui:graphql'];
        const variables = api.utils.objectMapper( props, lookupGraphql.variables );
        
        if(self.state.lookupComplete === false) {
          props.api.graphqlQuery(lookupGraphql.text, variables).then((lookupResult) => {
            api.log(`Lookup result`, { lookupResult }, 'debug');            
            if(lookupResult.data && lookupResult.data[lookupGraphql.name]) {
              const lookupValue = lookupResult.data[lookupGraphql.name];
              self.setState({ lookupValue: lookupValue[lookupGraphql.resultKey || "title"], lookupComplete: true, lookupError: false });
            } else {
              self.setState({ lookupValue: 'No Value', lookupComplete: true, lookupError: false });
            }
          }).catch(( lookupError ) => {
            api.error(`Lookup Query Error`, { lookupError }, 'debug');
            self.setState({ lookupValue: lookupError.message, lookupComplete: true, lookupError: true });
          });
        }        
      }

      labelTitleProps = titleProps;
      labelBodyProps = bodyProps;

      if (format && format !== '$LOOKUP$') {
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

      if(typeof componentFqn === 'string' && isNil(componentFqn) === false) {                
        const LabelComponentToMount = this.props.api.getComponent(componentFqn);
        
        let $componentProps =  (componentProps && Object.keys(componentProps).length > 1) ? { ...componentProps } : {};
        if(componentPropsMap) {
          const $mappedProps = this.props.api.utils.objectMapper({ props }, componentPropsMap);
          if(Object.keys($mappedProps).length > 0) {
            $componentProps = {...$componentProps, ...$mappedProps};
          }
          try {
            LabelBody = (<LabelComponentToMount {...$componentProps} />);
          } catch(componentErr) {
            props.api.log('Error activating component for label value', {componentErr}, 'error');
            LabelBody = (<Typography>{componentErr.message}</Typography>)
          }          
        }        
      }
    }

    
    if (_renderHtml && LabelBody === null){
      LabelBody = <Typography variant={_variant} dangerouslySetInnerHTML={{__html: labelText}}></Typography>
    } else {
      LabelBody = <Typography variant={_variant}>{labelText}</Typography>
    }    

    return (
      <div {...labelContainerProps}>
        {_iconPosition === 'left' ? labelIcon : null}
        <div {...labelBodyProps}>
          {labelTitle != '' && <label {...labelTitleProps}>{labelTitle}</label>}
          { LabelBody }
        </div>
        {_iconPosition === 'right' ? labelIcon : null}
      </div>
    )
  }
}

const LabelFieldComponent = compose(withApi, withTheme, withStyles(LabelWidget.rootStyle))(LabelWidget)

LabelFieldComponent.meta = {
  nameSpace: "core",
  name: "LabelComponent",
  version: "1.0.0",
  component: LabelFieldComponent
};

export default LabelFieldComponent;
