import React, { Component, Fragment } from 'react';
import { withStyles, withTheme } from '@mui/styles';
import {
  Icon
} from '@mui/material'

import moment from 'moment'

class DateSelector extends Component<any, any> {

  static defaultProps = {
    startDate: moment().subtract(7, 'days').startOf('day'),
    endDate: moment().endOf('day')
  }

  constructor(props) {
    super(props)
    this.state = {
      focusedInput: null
    }
  }

  render() {
  
    return (
      <Fragment>
        
      </Fragment>
    )
  }
}

export default DateSelector