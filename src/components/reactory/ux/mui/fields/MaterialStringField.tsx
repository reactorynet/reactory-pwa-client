import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { throttle, isNil, isEmpty } from 'lodash'
import { compose } from 'redux';
import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';

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
  InputLabelProps,
  InputProps,
  TextFieldProps,
} from '@mui/material';

import { withTheme } from '@mui/styles';


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
    onBlur = () => {},
    onChange = () => {},
    onFocus = () => { },
    rawErrors,
    readOnly = false,
    registry,
    required,
    schema,
    uiSchema,
    hidden,    
    
  } = props;

  const reactory = useReactory();
  const $id = idSchema.$id
  try {
    const inputProps: any = {
      value: '',
      name,
      required,
      disabled,
      autofocus
    };

    const $id = idSchema.$id;

    let inputLabelProps: InputLabelProps = {}

    const uiOptions = uiSchema['ui:options'] || { readOnly, props: {} };
    let args: any = uiOptions && uiOptions.props ? { ...uiOptions.props } : {};

    const {
      labelStyle = {

      },
      labelProps = {
        visible: true
      },
      componentProps,
    } = uiOptions;

    if (uiOptions.propsMap) {
      let margs = om(props, uiOptions.propsMap);
      args = { ...args, ...margs };
    } else {
      args = { ...args, ...props };
    }

    const onInputChanged = (evt) => {
      evt.persist();
      let _v = `${evt.target.value}`;
      if (args.toLowerCase === true) {
        _v = _v.toLowerCase();
      }
      onChange(_v);
    }

    if (uiSchema["ui:widget"]) {
      const Widget = registry.widgets[uiSchema["ui:widget"]]
      reactory.debug(`MaterialStringFieldWidget: ${$id} using custom widget ${uiSchema["ui:widget"]}`, { args });
      if (Widget) return (<Widget {...args} />)
    }

    switch (schema.format) {
      case "password": args.type = "password"; break;
      case "email": args.type = "email"; break;
      default: args.type = schema.format || "text"; break;
    }

    if (schema.readonly === true) { 
      uiOptions.readOnly = true
    }



    if (isNil(formData) === true || `${formData}`.trim() === "" || isEmpty(formData) === true) {
      reactory.debug(`MaterialStringFieldWidget: ${$id} formData is empty`, { formData, schema, uiSchema });
      inputLabelProps.shrink = false;
    } else {
      inputLabelProps.shrink = true;
      inputLabelProps.style = {
        padding: '4px'
      };
    }

    inputLabelProps.style = { ...inputLabelProps.style, ...labelStyle }

    const onKeyDown = evt => {
      const { reactory } = props;

      if (evt.keyCode === 13 && uiOptions && uiOptions.componentProps && uiOptions.componentProps.submitOnEnter) {
        evt.preventDefault();

        if (uiOptions.componentProps.refreshEvents && uiOptions.componentProps.refreshEvents.length > 0) {
          uiOptions.componentProps.refreshEvents.forEach((refreshEvent) => {
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

      let inputProps: any = {
        onChange: onInputChanged,
        onKeyDown: onKeyDown,
        onFocus: onFocus && (e => onFocus(id, e.target.value)), 
        onBlur: onBlur && (e => onBlur(id, e.target.value)),
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

      let themeDefaults: any = {
        variant: 'standard'
      };

      if (reactory && reactory?.muiTheme?.MaterialTextField) {
        themeDefaults = reactory?.muiTheme?.MaterialTextField
      }


      let componentProps: Partial<TextFieldProps> = {
        defaultValue: `${formData || schema.default}`.replace("undefined", ""),
        variant: themeDefaults.variant || uiOptions.variant || "standard",
        InputProps: inputProps,
        label: `${schema.title}${required ? ' *' : ''}`,
        value: `${formData || schema.default}`.replace("undefined", ""),
        fullWidth: true,
        key: props.key || idSchema.$id || id,
        InputLabelProps: inputLabelProps,
      }

      if (uiOptions.componentProps) {
        componentProps = { ...componentProps, ...uiOptions.componentProps };
      }


      return (<TextField {...componentProps} />);

    } else {
      let themeDefaults: any = {};
      if (reactory?.muiTheme?.MaterialInput) {
        themeDefaults = reactory?.muiTheme?.MaterialInput;
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


      return (
        <COMPONENT 
          key={props.key || id || idSchema.$id} 
          type={args.type || 'text'} 
          onKeyDown={onKeyDown} 
          id={idSchema.$id}
          autoFocus={idSchema.id === props.formContext.$focus && props.formContext.$focus !== undefined}
          readOnly={uiOptions.readOnly === true} 
          value={formData || schema.defaultValue || schema.default}
          onFocus={onFocus && (e => onFocus(id, e.target.value))}
          onBlur={onBlur && (e => onFocus(id, e.target.value))}
          onChange={onInputChanged} />
      )
    }

  } catch (renderError) {
    if (reactory) {
      reactory.log(`💥 MaterialString Field Error`, { renderError });
    }
    return <>💥 Could not render field</>
  }

};

export default MaterialStringFieldWidget;

// const MaterialStringApiFieldWidget = compose(withReactory)(MaterialStringFieldWidget)
// export default MaterialStringApiFieldWidget;

