import React, { Component, Fragment, useState } from 'react';
import { Button, Typography, Icon, Tooltip } from '@mui/material';
import { compose } from 'redux';
import { withTheme, withStyles } from '@mui/styles';
import { template, isNil } from 'lodash';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';

function formatMoney(amount, decimalCount = 2, decimal = ".", thousands = ",") {
  try {
    decimalCount = Math.abs(decimalCount);
    decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

    const negativeSign = amount < 0 ? "-" : "";

    let i: string = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
    let j = (i.length > 3) ? i.length % 3 : 0;

    return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - parseFloat(i)).toFixed(decimalCount).slice(2) : "");
  } catch (e) {
    console.log(e)
  }
}

const LabelWidgetStyle = (theme): any => {
  return {
    labelText: {
      marginLeft: theme.spacing(1),
      wordBreak: 'normal'
    },
    copyIcon: {
      marginLeft: '10px',
      fontSize: '1rem'
    },
    inlineDiv: {
      display: 'flex',
      alignItems: 'center',
      '& span': {}
    }
  }
}

interface LabelWidgetProperties {
  [key: string]: any,
  value?: any,
  formData?: any,
  uiSchema?: Partial<Reactory.Schema.IUILabelWidgetOptions>,
  schema?: any,
};


const LabelWidget = (props: LabelWidgetProperties) => {

  const { classes, reactory, formData, value, uiSchema, idSchema, formContext } = props;

  const getOptions = (): Partial<Reactory.Schema.IUILabelWidgetOptions> => {
    if (props.uiSchema && props.uiSchema["ui:options"]) return props.uiSchema["ui:options"] as Partial<Reactory.Schema.IUILabelWidgetOptions>;
    return {};
  };

  const initialLabelText = () => {
    const options = getOptions();
    //@ts-ignore
    if (options.$format && typeof reactory.$func[options.$format] === 'function') {
      //@ts-ignore
      return reactory.$func[options.$format](props);
    }

    if (options && options.format && typeof options.format === 'string') {
      try {
        if (options.format !== '$LOOKUP$') return template(options.format as string)({ ...props })
        else return '🕘';
      } catch (e) {
        return `Template Error (${e.message})`;
      }
    } else {
      try {
        return props.formData ? template('${formData}')({ ...props }) : props.value;
      } catch (e) {
        return `Template Error (${e.message})`;
      }
    }
  };

  const [lookupValue, setLookupValue] = React.useState<string>('🕘');
  const [error, setError] = React.useState<any>(null);
  const [labelText, setLabelText] = React.useState(initialLabelText());

  const options = getOptions();


  if (error) {
    return (<span>🚨 {error.message}</span>)
  }

  let labelTitle = props.uiSchema.title;
  let labelIcon = null;
  let _iconPosition = 'right';
  let _variant: any = 'h6';
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
  let _copyToClip = false;

  let labelContainerProps = {
    id: `${props.idSchema && props.idSchema.$id ? props.idSchema.$id : undefined}`,
    style: {
      ...labelContainerStyles
    },
  };

  const lookupGraphql: Reactory.Forms.IReactoryFormQuery = props.uiSchema['ui:graphql'];
  let isLookup = lookupGraphql !== null && lookupGraphql !== undefined;

  const getLookupValue = () => {

    if (isLookup) {
      const variables = reactory.utils.objectMapper(props, lookupGraphql.variables);

      reactory.graphqlQuery(lookupGraphql.text, variables, lookupGraphql.options).then((lookupResult) => {
        reactory.log(`Lookup result ${formContext ? formContext.signature : 'NO CONTEXT'}[${props.idSchema.$id}]`, { lookupResult });

        if (lookupResult.data && lookupResult.data[lookupGraphql.name]) {
          const _lookupResult = reactory.utils.objectMapper(lookupResult.data[lookupGraphql.name], lookupGraphql.resultMap);
          const _labelText = _lookupResult[lookupGraphql.resultKey || "id"];
          setLookupValue(_labelText);
          setLabelText(_labelText);
          setError(null);
        } else {
          setLookupValue('');
          setLabelText('');
          setError(null);
        }
      }).catch((lookupError) => {
        reactory.log(`Lookup Query Error`, { lookupError });
        setError(lookupError);
      });
    }
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
      $iconProps = null,
      renderHtml,
      titleProps = {},
      bodyProps = {},
      containerProps = {},
      componentFqn = null,
      componentProps = {},
      componentPropsMap = {},
      copyToClipboard = false
    } = props.uiSchema["ui:options"] as Partial<Reactory.Schema.IUILabelWidgetOptions>;

    //@ts-ignore
    if (containerProps.style) {
      labelContainerProps.style = { ...labelContainerProps.style, ...(containerProps as any).style };
    }

    labelTitleProps = titleProps;
    labelBodyProps = bodyProps;

    if (title) {
      try {
        labelTitle = template(title)(props);
      } catch (labelError) {
        labelTitle = 'bad template / props (' + format + ')';
      }
    }

    if (variant) _variant = variant;
    if (iconPosition) _iconPosition = iconPosition;
    if (renderHtml) _renderHtml = renderHtml;

    if (icon) {
      let _iconProps: any = {
        style:
        {
          marginLeft: _iconPosition === 'right' ? theme.spacing(1) : 'unset',
          marginRight: _iconPosition === 'left' ? theme.spacing(1) : 'unset',
          //marginTop: theme.spacing(1)
        },
        ...iconProps
      };

      if (typeof $iconProps === 'string' && reactory.$func[$iconProps]) {
        let patched = reactory.$func[$iconProps]({ label: labelText, widget: {}, iconProps: _iconProps, formData, formContext });
        _iconProps = {
          ..._iconProps,
          ...patched
        }
      }

      const _custom = iconType
      let IconComponent = _custom !== undefined ? theme.extensions[_custom].icons[icon as string] : null;

      let $icon = (props.uiSchema["ui:options"] as Partial<Reactory.Schema.IUILabelWidgetOptions>)?.icon;

      if (_iconProps?.icon) {
        $icon = _iconProps.icon;
      }

      if (IconComponent) {
        labelIcon = <IconComponent {..._iconProps} />
      } else {
        labelIcon = <Icon {..._iconProps}>{$icon}</Icon>
      }
    }

    if (typeof componentFqn === 'string' && isNil(componentFqn) === false) {
      const LabelComponentToMount = props.api.getComponent(componentFqn);

      let $componentProps = (componentProps && Object.keys(componentProps).length > 1) ? { ...componentProps } : {};
      if (componentPropsMap) {
        const $mappedProps = props.api.utils.objectMappper(props, componentPropsMap);
        if (Object.keys($mappedProps).length > 0) {
          $componentProps = { ...$componentProps, ...$mappedProps };
        }
        try {
          LabelBody = (<LabelComponentToMount {...$componentProps} />);
        } catch (componentErr) {
          props.api.log('Error activating component for label value', { componentErr });
          LabelBody = (<Typography>{componentErr.message}</Typography>)
        }
      }
    }

    _copyToClip = copyToClipboard === true;
  }

  if (_renderHtml && LabelBody === null) {
    LabelBody = <Typography variant={_variant} dangerouslySetInnerHTML={{ __html: labelText }}></Typography>
  } else {
    if (_iconPosition == 'inline') {
      LabelBody = <div className={classes.inlineDiv}>{labelIcon}<Typography classes={{ root: classes.labelText }} variant={_variant}>{labelText}</Typography></div>
    } else {
      LabelBody = <Typography variant={_variant} classes={{ root: classes.labelText }}>{labelText}</Typography>
    }
  }

  const copy = () => {
    var tempInput = document.createElement('input');
    tempInput.value = labelText;
    document.body.appendChild(tempInput)
    tempInput.select()
    document.execCommand('copy');
    tempInput.remove();

    reactory.createNotification('Copied To Clipboard!', { body: `'${labelText}' successfully copied to your clipboard.`, showInAppNotification: true, type: 'success' });
  }



  React.useEffect(() => {


    if (lookupGraphql && options.format === "$LOOKUP$") {
      getLookupValue();
    }
  }, []);

  React.useEffect(() => {

    if (lookupGraphql && options.format === "$LOOKUP$") {
      getLookupValue();
    }

    let _labelText = props.formData;



    if (options && options.format) {

      try {
        if (options.format !== '$LOOKUP$' && typeof options.format === 'string') 
          _labelText = template(options.format as string)({ ...props })
        else _labelText = '🕘';
      } catch (e) {
        _labelText = `Template Error (${e.message})`;
      }
    } else {
      try {
        _labelText = props.formData ? template('${formData}')({ ...props }) : props.value;
      } catch (e) {
        _labelText = `Template Error (${e.message})`;
      }
    }

    //@ts-ignore
    if (options.$format && typeof reactory.$func[options.$format] === 'function') {
      //@ts-ignore
      _labelText = reactory.$func[options.$format](props);
    }

    setLabelText(_labelText);

  }, [props]);


  return (
    <div {...labelContainerProps}>
      {_iconPosition === 'left' ? labelIcon : null}
      <div {...labelBodyProps}>
        {labelTitle != '' && <label {...labelTitleProps}>{labelTitle}</label>}
        {LabelBody}
      </div>
      {_iconPosition === 'right' ? labelIcon : null}
      {_copyToClip &&
        <Tooltip title="Copy to clipboard" placement="right">
          <Icon color="primary" onClick={copy} className={classes.copyIcon}>assignment</Icon>
        </Tooltip>
      }
    </div>
  )
};


const LabelFieldComponent: any = compose(withReactory, withTheme, withStyles(LabelWidgetStyle))(LabelWidget)

LabelFieldComponent.meta = {
  nameSpace: "core",
  name: "LabelComponent",
  version: "1.0.0",
  component: LabelFieldComponent
};

export default LabelFieldComponent;
