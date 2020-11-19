import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { pullAt, find, isArray, isNil, isEmpty } from 'lodash';
import {
  Icon,
  FormControl,
  InputLabel,
  Input,
  OutlinedInput,
  FilledInput,
  MenuItem,
  Select,
  Typography,
  FormHelperText,
} from '@material-ui/core';

import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';

class SelectWidget extends Component {

  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  });

  static propTypes = {
    formData: PropTypes.any,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: [],
    readOnly: false
  }

  render() {
    const self = this
    let elements = null

    let allowNull = true;
    const {
      schema,
      errorSchema,
      uiSchema,
      formData,
      formContext,
      required,
      theme
    } = this.props;

    let controlProps = {
      style: {

      },
      className: `${this.props.classes.formControl}`
    };

    let uiOptions = this.props.uiSchema['ui:options'] || {};

    const {
      labelStyle = {},
      selectProps = {}
    } = uiOptions;

    let variant = 'standard'
    if (theme.MaterialInput) {
      variant = theme.MaterialInput.variant || variant;
    }


    let InputComponent = Input;
    let inputLabelProps = {};
    switch (variant) {
      case 'outlined': {
        InputComponent = OutlinedInput;
        if (isNil(formData) === true || `${formData}`.trim() === "" || isEmpty(formData) === true) {
          inputLabelProps.shrink = false;
        } else {
          inputLabelProps.shrink = true;
          inputLabelProps.style = {
            backgroundColor: 'white',
            padding: '3px'
          };
        }
        break;
      }
      case 'filled': {
        InputComponent = FilledInput;
      }
    }

    if (uiOptions.selectOptions && isArray(uiOptions.selectOptions) === true) {
      elements = uiOptions.selectOptions.map((option, index) => {

        return (
          <MenuItem key={option.key || index} value={option.value}>
            {option.icon ? <Icon {...(option.iconProps || {})}>{option.icon}</Icon> : null}
            {option.label}
          </MenuItem>)
      })
    }

    if (uiOptions.FormControl && uiOptions.FormControl.props) {
      controlProps = { ...controlProps, ...uiOptions.FormControl.props }
    };

    const matchOption = value => {
      if (this.props.uiSchema['ui:options'] && this.props.uiSchema['ui:options'].selectOptions) {
        const option = find(this.props.uiSchema['ui:options'].selectOptions, { value: value })
        return option ? option : { value: value, label: value }
      }
    }

    const onSelectChanged = (evt) => {


      this.props.onChange(evt.target.value)
    }

    const renderSelectedValue = (value) => {
      if (value.length == 0)
        return <span style={{ color: 'rgba(150, 150, 150, 0.8)' }}>Select</span>;

      let option = matchOption(value);
      return (
        <>
          {option.icon ? <Icon {...(option.iconProps || { style: { margin: '0px', verticalAlign: 'middle' } })}>{option.icon}</Icon> : null}
          <Typography variant="label">{option.label}</Typography>
        </>
      )
    };


    inputLabelProps.style = { ...inputLabelProps.style, ...labelStyle }


    return (
      <FormControl variant={variant} size={uiOptions.size || "medium"}>
        <InputLabel {...inputLabelProps} htmlFor={self.props.idSchema.$id} required={required}>{self.props.schema.title}</InputLabel>
        <Select
          {...selectProps}
          value={self.props.formData || ""}
          onChange={onSelectChanged}
          name={self.props.name}
          displayEmpty={true}
          renderValue={renderSelectedValue}
          input={<InputComponent id={self.props.idSchema.$id} value={self.props.formData || ""} />}>
          {required === false ? <MenuItem value=""><em>None</em></MenuItem> : null}
          {elements}
        </Select>
      </FormControl>
    )
  }
}
const SelectWidgetComponent = compose(withTheme, withStyles(SelectWidget.styles))(SelectWidget)
export default SelectWidgetComponent
