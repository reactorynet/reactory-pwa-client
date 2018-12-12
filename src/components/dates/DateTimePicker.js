import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { FormControl, Typography } from '@material-ui/core';
import { DateTimePicker } from 'material-ui-pickers';

export default class DateTimePickerWidget extends PureComponent {
  
  static propTypes = {
    formData: PropTypes.any,
    outputFormat: PropTypes.string    
  }

  static defaultProps = {
    formData: moment().startOf('day'),
    outputFormat: ''
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      selectedDate: moment(props.formData),
    };
  }
  

  handleDateChange = date => {
    console.log('updating date', date);        
    if(this.props.onChange) this.props.onChange(date.format())
  };

  render() {
    const { selectedDate } = this.state;

    return (
      <FormControl>
        <Typography variant="caption" gutterBottom>{this.props.schema.title || 'Select Time'}</Typography>
        <DateTimePicker value={moment(this.props.formData)} onChange={this.handleDateChange} />
      </FormControl>
    );
  }
}