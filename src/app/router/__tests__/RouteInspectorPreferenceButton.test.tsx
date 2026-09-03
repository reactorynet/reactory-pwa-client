import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import RouteInspectorPreferenceButton from '../widgets/RouteInspectorPreferenceButton';
import { createMockReactory, renderWithRouter } from './testUtils';
import { isRouteInspectorEnabled, ROUTE_INSPECTOR_STORAGE_KEY } from '../inspectorPreference';

describe('RouteInspectorPreferenceButton', () => {
  beforeEach(() => {
    localStorage.removeItem(ROUTE_INSPECTOR_STORAGE_KEY);
  });

  it('is hidden when development mode is off', () => {
    const reactory = createMockReactory({ isDevelopmentMode: false });
    renderWithRouter(<RouteInspectorPreferenceButton />, reactory);
    expect(screen.queryByTestId('route-inspector-preference-toggle')).toBeNull();
  });

  it('toggles the persisted inspector preference in development mode', () => {
    const reactory = createMockReactory({ isDevelopmentMode: true });
    renderWithRouter(<RouteInspectorPreferenceButton />, reactory);
    const button = screen.getByTestId('route-inspector-preference-toggle');
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(isRouteInspectorEnabled()).toBe(false);
    fireEvent.click(button);
    expect(isRouteInspectorEnabled()).toBe(true);
  });
});
