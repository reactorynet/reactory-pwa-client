import React from 'react';
import { screen } from '@testing-library/react';
import RouteErrorBoundary from '../RouteErrorBoundary';
import { createMockReactory, protectedHomeRoute, renderWithRouter } from './testUtils';

const Boom = () => {
  throw new Error('route exploded');
};

describe('RouteErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders a failure panel when the child throws', () => {
    const reactory = createMockReactory({ isDevelopmentMode: true });
    renderWithRouter(
      <RouteErrorBoundary routeDef={protectedHomeRoute()} isDevelopmentMode={true}>
        <Boom />
      </RouteErrorBoundary>,
      reactory,
    );
    expect(screen.getByTestId('route-failure').textContent).toMatch(/route exploded/);
  });
});
