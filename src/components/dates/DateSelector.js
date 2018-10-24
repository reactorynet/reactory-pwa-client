import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withStyles, withTheme } from '@material-ui/core/styles';
import 'react-dates/initialize';
import { 
  DateRangePicker, 
  SingleDatePicker, 
  DayPickerRangeController, 
  DateRangePickerWrapper } from 'react-dates';
import 'react-dates/lib/css/_datepicker.css';
import moment, { momentPropTypes } from 'moment'

class DateSelector extends Component {
  
  render(){
    return (
    <DateRangePicker
        startDate={moment(this.props.startDate)} // momentPropTypes.momentObj or null,
        startDateId={this.props.startDateId || "from"} // PropTypes.string.isRequired,
        endDate={moment(this.props.endDate)} // momentPropTypes.momentObj or null,
        endDateId={this.props.endDateId || "till"} // PropTypes.string.isRequired,
        onDatesChange={this.props.onDatesChange} // PropTypes.func.isRequired,
        focusedInput={this.props.focusedInput} // PropTypes.oneOf([START_DATE, END_DATE]) or null,
        onFocusChange={this.props.onFocusChange} // PropTypes.func.isRequired,
        displayFormat={'YYYY-MM-DD'}
    />)
  }
}

export default DateSelector