
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Calendar as BigCalendar } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css'
import moment from 'moment';

const Calendar = (props: any) => {
  const [selected, setSelected] = useState(null);

  const onDoubleClick = (eventObj, e) => {
    //this.props.history.push(`/admin/org/${selected.organization.id}/surveys/${selected.id}`);
  }

  const onSelectEvent = (eventObj, e) => {
    setSelected(eventObj)
  }

  const { calendarItems, children } = props;

  return (
    <React.Fragment>
      <BigCalendar
        popup
        localizer={BigCalendar.momentLocalizer(moment)}
        onSelectEvent={onSelectEvent}
        onDoubleClickEvent={onDoubleClick}
        events={calendarItems || []}
        startAccessor='startDate'
        endAccessor='endDate'
        defaultDate={new Date()}
        style={{minHeight: '450px'}}
      />
      {children}
    </React.Fragment>
  )
}

Calendar.propTypes = {
  startAccessor: PropTypes.string,
  endAccessor: PropTypes.string,
  calendarItems: PropTypes.array,
  onItemSelected: PropTypes.func,
  onItemDoubleClick: PropTypes.func,
}

Calendar.defaultProps = {
  startAccessor: 'startDate',
  endAccessor: 'endDate',
  calendarItems: [],
  onItemSelected: (item) => { },
  onItemDoubleClick: (item) => { },
}

export default Calendar;