import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { FormControl, Typography, TextField, InputLabel } from '@material-ui/core';
import { DatePicker, DateTimePicker } from '@material-ui/pickers';
import { withApi } from "@reactory/client-core/api/ApiProvider";
import { compose } from 'redux';

class DateTimePickerWidget extends PureComponent {

  static propTypes = {
    formData: PropTypes.any,
    outputFormat: PropTypes.string
  }

  static defaultProps = {
    formData: moment().startOf('day'),
    outputFormat: undefined
  }

  handleDateChange = date => {

    let _outputformat = 'YYYY-MM-DD';
    if (this.props.outputFormat) {
      _outputformat = this.props.outputFormat;
    }

    if (date.target) {
      if (this.props.onChange) this.props.onChange(moment(date.target.value, "YYYY-MM-DD").format(_outputformat));
      return;
    }

    if (this.props.onChange) this.props.onChange(date.format(this.props.outputFormat))
  };

  render() {
    const { api, formData, uiSchema, idSchema, schema } = this.props;
    const theme = api.getTheme();

    let _pickerProps = {
      variant: 'inline',
      value: this.props.formData,
      onChange: this.handleDateChange,
    };

    let opts = uiSchema && uiSchema["ui:options"] || {}

    if (opts.picker) {
      _pickerProps = {
        ..._pickerProps, ...opts.picker
      };
    }

    let formControlProps = opts.formControl || {}
    let typographyProps = opts.typography || { variant: "caption", gutterBottom: true };
    let hide_label = opts.show_label === false;

    if (opts.variant == 'outlined') {
      _pickerProps.variant = opts.variant;

      if(hide_label === false) {
        _pickerProps.label = schema.title
      } 

      const date = moment(this.props.formData, 'YYYY-MM-DD').format('YYYY-MM-DD');
      _pickerProps.defaultValue = date;
      delete _pickerProps.value;

      return (
        
          <TextField
            {..._pickerProps}
            id={idSchema.$id}
            type="date"
            InputLabelProps={{
              shrink: true,
            }}
          />
      );
    }

    return (
      <FormControl {...formControlProps}>
        { hide_label === false ? <InputLabel htmlFor={idSchema.$id} >{this.props.schema.title || 'Select Time'}</InputLabel> : null}
        <DateTimePicker {..._pickerProps} />
      </FormControl>
    );
  }
}

const DateTimePickerWithApi = compose(withApi)(DateTimePickerWidget);

export default DateTimePickerWithApi;
