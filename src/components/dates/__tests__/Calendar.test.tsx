import React from 'react';
import { render, screen } from '@testing-library/react';
import Calendar from '../Calendar';

jest.mock('react-big-calendar/lib/css/react-big-calendar.css', () => ({}));

/**
 * `core.Calendar` wraps react-big-calendar. Older versions of that library
 * reached the DOM through `findDOMNode`, which React 19 removed, and the
 * wrapper built its localizer from a static the 1.x API does not have, so the
 * component threw on every render. This renders it with an event.
 */
describe('Calendar', () => {
  it('renders the current month with its events', () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 15, 9, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), 15, 10, 0);

    render(
      <Calendar calendarItems={[{ title: 'Planning session', startDate: start, endDate: end }]}>
        <span>Calendar footer</span>
      </Calendar>,
    );

    expect(screen.getByText('Planning session')).toBeInTheDocument();
    expect(screen.getByText('Calendar footer')).toBeInTheDocument();
  });
});
