import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import RouteInspector from '../widgets/RouteInspector';
import { createMockReactory, protectedHomeRoute, renderWithRouter } from './testUtils';
import { ROUTE_INSPECTOR_STORAGE_KEY, setRouteInspectorEnabled } from '../inspectorPreference';

describe('RouteInspector', () => {
  beforeEach(() => {
    localStorage.removeItem(ROUTE_INSPECTOR_STORAGE_KEY);
  });

  it('opens automatically when the route is not ready', () => {
    const reactory = createMockReactory({ isDevelopmentMode: true });
    renderWithRouter(
      <RouteInspector
        routeDef={protectedHomeRoute()}
        status="timeout"
        elapsedMs={8100}
        nearbyFqns={['core.Home@1.0.0']}
        lastPluginEvent={{ plugin: 'core' }}
        error={new Error('boom')}
        pathname="/"
        search="?x=1"
        onRetry={jest.fn()}
      />,
      reactory,
    );
    expect(screen.getByTestId('route-inspector-json')).toBeTruthy();
    expect(screen.getByText('Copy FQN')).toBeTruthy();
    expect(screen.getByLabelText('Open route inspector')).toBeTruthy();
  });

  it('toggles from the FAB when starting ready', () => {
    const reactory = createMockReactory({ isDevelopmentMode: true });
    renderWithRouter(
      <RouteInspector
        routeDef={protectedHomeRoute()}
        status="ready"
        elapsedMs={12}
        nearbyFqns={[]}
        lastPluginEvent={null}
        pathname="/"
      />,
      reactory,
    );
    fireEvent.click(screen.getByTestId('route-inspector-toggle'));
    expect(screen.getByTestId('route-inspector-json')).toBeTruthy();
  });

  it('does not render the FAB when the preference is disabled', () => {
    setRouteInspectorEnabled(false);
    const reactory = createMockReactory({ isDevelopmentMode: true });
    renderWithRouter(
      <RouteInspector
        routeDef={protectedHomeRoute()}
        status="timeout"
        elapsedMs={8100}
        nearbyFqns={[]}
        lastPluginEvent={null}
        pathname="/"
      />,
      reactory,
    );
    expect(screen.queryByTestId('route-inspector-toggle')).toBeNull();
  });
});
