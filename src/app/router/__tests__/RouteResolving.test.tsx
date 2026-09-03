import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import RouteResolving from '../RouteResolving';
import { createMockReactory, renderWithRouter } from './testUtils';

describe('RouteResolving', () => {
  it('shows a stop waiting action after the hint interval', () => {
    const reactory = createMockReactory();
    const onStopWaiting = jest.fn();
    renderWithRouter(
      <RouteResolving fqn="core.Slow@1.0.0" elapsedMs={3500} onStopWaiting={onStopWaiting} />,
      reactory,
    );
    fireEvent.click(screen.getByText('Stop waiting'));
    expect(onStopWaiting).toHaveBeenCalled();
  });
});
