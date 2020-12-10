import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { FormControl, Typography, TextField } from '@material-ui/core';
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

    let _outputformat = 'DD-MM-YYYY';
    if (this.props.outputFormat) {
      _outputformat = this.props.outputFormat;
    }

    if (date.target) {
      debugger;
      if (this.props.onChange) this.props.onChange(moment(date.target.value, "YYYY-MM-D").format(_outputformat));
      return;
    }

    if (this.props.onChange) this.props.onChange(date.format(this.props.outputFormat))
  };

  render() {
    const { api, formData, uiSchema } = this.props;
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

      const date = moment(this.props.formData, 'DD-MM-YYYY').format('YYYY-MM-DD');
      _pickerProps.defaultValue = date;
      delete _pickerProps.value;

      debugger;

      return (
        <FormControl {...formControlProps}>
          { hide_label === false ? <Typography {...typographyProps}>{this.props.schema.title || 'Select Time'}</Typography> : null}
          <TextField
            {..._pickerProps}
            type="date"
            InputLabelProps={{
              shrink: true,
            }}
          />
        </FormControl>
      );
    }

    return (
      <FormControl {...formControlProps}>
        { hide_label === false ? <Typography {...typographyProps}>{this.props.schema.title || 'Select Time'}</Typography> : null}
        <DateTimePicker {..._pickerProps} />
      </FormControl>
    );
  }
}

const DateTimePickerWithApi = compose(withApi)(DateTimePickerWidget);

export default DateTimePickerWithApi;
