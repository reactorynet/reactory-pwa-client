import React from 'react';
import { screen } from '@testing-library/react';
import CatchAllRoute from '../CatchAllRoute';
import { createMockReactory, renderWithRouter } from './testUtils';

const NotFound = ({ message }: { message?: string }) => (
  <div data-testid="not-found">{message}</div>
);

describe('CatchAllRoute', () => {
  it('uses core.NotFound when registered', () => {
    const reactory = createMockReactory({
      components: { 'core.NotFound@1.0.0': NotFound },
      isDevelopmentMode: true,
    });
    renderWithRouter(<CatchAllRoute />, reactory, ['/missing-page']);
    expect(screen.getByTestId('not-found').textContent).toMatch(/missing-page/);
  });
});
