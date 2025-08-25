import React, { useState } from 'react';
import {
  Icon
} from '@mui/material'

import moment from 'moment'

const DateSelector = (props: any) => {
  const [focusedInput, setFocusedInput] = useState(null);

  const defaultProps = {
    startDate: moment().subtract(7, 'days').startOf('day'),
    endDate: moment().endOf('day')
  };

  return (
    <React.Fragment>
      
    </React.Fragment>
  )
}

export default DateSelector