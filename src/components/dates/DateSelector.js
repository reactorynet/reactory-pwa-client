import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withStyles, withTheme } from '@material-ui/core/styles';
import 'react-dates/initialize';
import {
  DateRangePicker,
  SingleDatePicker,
  DayPickerRangeController,
  DateRangePickerWrapper
} from 'react-dates';
import 'react-dates/lib/css/_datepicker.css';
import {
  Icon
} from '@material-ui/core'
import { HORIZONTAL_ORIENTATION } from 'react-dates/constants';
import moment, { momentPropTypes } from 'moment'

class DateSelector extends Component {

  static defaultProps = {
    startDate: moment().subtract(7, 'days').startOf('day'),
    endDate: moment().endOf('day')
  }

  constructor(props, context) {
    super(props, context)
    this.state = {
      focusedInput: null
    }
  }

  render() {
    const { icon = "date_range" } = this.props
    return (
      <Fragment>
        <DateRangePicker
          startDate={moment(this.props.startDate)} // momentPropTypes.momentObj or null,
          startDateId={this.props.startDateId || "from"} // PropTypes.string.isRequired,
          endDate={moment(this.props.endDate)} // momentPropTypes.momentObj or null,
          endDateId={this.props.endDateId || "till"} // PropTypes.string.isRequired,
          onDatesChange={({ startDate, endDate }) => { this.props.onDatesChange && this.props.onDatesChange(startDate, endDate) }}
          customInputIcon={<Icon >{icon}</Icon>}
          focusedInput={this.state.focusedInput} // PropTypes.oneOf([START_DATE, END_DATE]) or null,
          onFocusChange={ focusedInput => (this.setState({ focusedInput }))} // PropTypes.func.isRequired,
          intialStartDate={moment(this.props.startDate)}
          initialEndDate={moment(this.props.endDate)}          
          displayFormat="YYYY-MM-DD"
          orientation={HORIZONTAL_ORIENTATION}
          isOutsideRange={() => false}
          small
          noBorder
        />
      </Fragment>
    )
  }
}

export default DateSelector