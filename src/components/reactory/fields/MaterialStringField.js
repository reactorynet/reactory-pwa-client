import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { throttle } from 'lodash'
import { compose } from 'recompose';
import { withApi } from '@reactory/client-core/api/ApiProvider';

import om from 'object-mapper';

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Icon,
  Input,
  OutlinedInput,
  FilledInput,
  InputAdornment,
  TextField,
} from '@material-ui/core';

import { withTheme } from '@material-ui/styles';


const MaterialStringFieldWidget = (props) => {
  const {
    id,
    autofocus,
    disabled,
    errorSchema,
    formContext,
    formData,
    idPrefix,
    idSchema,
    name,
    onBlur,
    onChange,
    onFocus,
    rawErrors,
    readOnly,
    registry,
    required,
    schema,
    uiSchema,
    hidden,
    theme,
    api,
    reactory
  } = props;

  try {
    const inputProps = {
      value: '',
      name,
      required,
      disabled,
      autofocus
    }

    const uiOptions = uiSchema['ui:options'] || { readOnly: false, props: {} };
    let args = uiOptions && uiOptions.props ? { ...uiOptions.props } : {};

    if (uiOptions.propsMap) {
      let margs = om(props, uiOptions.propsMap);
      args = { ...args, ...margs };
    } else {
      args = { ...args, ...props };
    }

    if (uiSchema["ui:widget"]) {
      const Widget = registry.widgets[uiSchema["ui:widget"]]
      if (Widget) return (<Widget {...args} />)
    }

    switch (schema.format) {
      case "password": args.type = "password"; break;
      case "email": args.type = "email"; break;
      default: args.type = schema.format || "text"; break;
    }

    const onInputChanged = (evt) => {
      evt.persist();
      let _v = `${evt.target.value}`;
      if (args.toLowerCase === true) {
        _v = _v.toLowerCase();
      }
      onChange(_v);
    }

    const onKeyDown = evt => {
      const { reactory } = props;

      if (evt.keyCode === 13 && uiOptions && uiOptions.componentProps && uiOptions.componentProps.submitOnEnter) {
        evt.preventDefault();
        debugger;

        if (uiOptions.componentProps.refreshEvents && uiOptions.componentProps.refreshEvents.length > 0) {
          uiOptions.componentProps.refreshEvents.forEach((refreshEvent) => {
            debugger;
            // props.formContext.$ref.submit();
            props.onChange(evt.target.value);
            // props.formContext.$ref.forceUpdate();
            reactory.emit(refreshEvent, props.formContext.$formData);
          });
        } else {
          props.formContext.$ref.submit();
        }
      }
    }

    if (uiOptions.component === "TextField") {

      let inputProps = {
        onChange: onInputChanged,
        onKeyDown: onKeyDown,
        readOnly: disabled === true,
      };

      if (uiOptions.inputProps) {
        inputProps = { ...inputProps, ...uiOptions.inputProps, id: idSchema.$id };
      };

      if (args.type === 'search') {
        inputProps.endAdornment = (
          <InputAdornment position="end">
            <Icon>search</Icon>
          </InputAdornment>
        )
      }

      let themeDefaults = {};
      if (theme.MaterialTextField) {
        themeDefaults = theme.MaterialTextField;
      }


      let componentProps = {
        defaultValue: `${formData || schema.default}`.replace("undefined", ""),
        variant: themeDefaults.variant || uiOptions.variant || "standard",
        InputProps: inputProps,
        value: `${formData || schema.default}`.replace("undefined", "")
      }

      if (uiOptions.componentProps) {
        componentProps = { ...componentProps, ...uiOptions.componentProps };
      }

      return (<TextField {...componentProps} />);

    } else {
      let themeDefaults = {};
      if (theme.MaterialInput) {
        themeDefaults = theme.MaterialInput;
      }

      let COMPONENT = Input;

      switch (themeDefaults.variant) {
        case "outlined":
        case "outline": {
          COMPONENT = OutlinedInput;
          break;
        }
        case "filled":
        case "fill": {
          COMPONENT = FilledInput;
          break;
        }
      }


      return (<COMPONENT {...args} onKeyDown={onKeyDown} id={idSchema.$id} readOnly={uiOptions.readOnly === true} value={formData || schema.default} onChange={onInputChanged} />)
    }

  } catch (renderError) {
    if (api) {
      api.log(`💥 MaterialString Field Error`, { renderError }, 'error')
    }
    return <>💥 Could not render field</>
  }

};

const MaterialStringApiFieldWidget = compose(withApi, withTheme)(MaterialStringFieldWidget)
export default MaterialStringApiFieldWidget;

