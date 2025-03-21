
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Calendar as BigCalendar } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css'
import moment from 'moment';
import { Theme } from '@mui/material';


class Calendar extends Component<any, any> {

  static CalendarStyles = (theme: Theme): any => ({
    Container: {
      padding: theme.spacing(1),
      height: '550px',
    },
    card: {
      minWidth: 275,
    },
    bullet: {
      display: 'inline-block',
      margin: '0 2px',
      transform: 'scale(0.8)',
    },
    title: {
      fontSize: 14,
    },
    pos: {
      marginBottom: 12,
    },
  });

  constructor(props) {
    super(props)
    this.state = {
      selected: null
    };
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onSelectEvent = this.onSelectEvent.bind(this);
  }

  onDoubleClick(eventObj, e) {
    const { selected } = this.state
    //this.props.history.push(`/admin/org/${selected.organization.id}/surveys/${selected.id}`);
  }

  onSelectEvent(eventObj, e) {
    this.setState({ selected: eventObj })
  }

  render() {
    const { calendarItems, classes, children } = this.props;
    const { selected } = this.state;

    return (
      <Fragment>
        <BigCalendar
          popup
          localizer={BigCalendar.momentLocalizer(moment)}
          onSelectEvent={this.onSelectEvent}
          onDoubleClickEvent={this.onDoubleClick}
          events={calendarItems || []}
          startAccessor='startDate'
          endAccessor='endDate'
          defaultDate={new Date()}
          style={{minHeight: '450px'}}
        />
        {children}
      </Fragment>
    )
  }

  static propTypes = {
    startAccessor: PropTypes.string,
    endAccessor: PropTypes.string,
    calendarItems: PropTypes.array,
    onItemSelected: PropTypes.func,
    onItemDoubleClick: PropTypes.func,
  }

  static defaultProps = {
    startAccessor: 'startDate',
    endAccessor: 'endDate',
    calendarItems: [],
    onItemSelected: (item) => { },
    onItemDoubleClick: (item) => { },
  }
}

export default Calendar;