import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { FormControl, Typography } from '@material-ui/core';
import { DatePicker, DateTimePicker } from '@material-ui/pickers';

export default class DateTimePickerWidget extends PureComponent {
  
  static propTypes = {
    formData: PropTypes.any,
    outputFormat: PropTypes.string    
  }

  static defaultProps = {
    formData: moment().startOf('day'),
    outputFormat: undefined
  }

  handleDateChange = date => {
    //console.log('updating date', date);        
    if(this.props.onChange) this.props.onChange(date.format(this.props.outputFormat))
  };

  render() {
    let _pickerProps = {
      variant: 'inline',
      value: this.props.formData

    };
    if(this.props.uiSchema && this.props.uiSchema['ui:options'] && this.props.uiSchema['ui:options'].picker) {
      _pickerProps = {
        ..._pickerProps, ...this.props.uiSchema['ui:options'].picker
      };
    }
    return (
      <FormControl>
        <Typography variant="caption" gutterBottom>{this.props.schema.title || 'Select Time'}</Typography>
        <DateTimePicker variant="inline" value={this.props.formData} onChange={this.handleDateChange} />
      </FormControl>
    );
  }
}