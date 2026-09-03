import * as routerExports from '../index';

describe('router public exports', () => {
  it('exposes the durable router surface', () => {
    expect(routerExports.ReactoryRouter).toBeDefined();
    expect(routerExports.RouteComponentWrapper).toBeDefined();
    expect(routerExports.RouteGuard).toBeDefined();
    expect(routerExports.RouteInspector).toBeDefined();
    expect(routerExports.RouteFailure).toBeDefined();
    expect(routerExports.RouteInspectorPreferenceButton).toBeDefined();
    expect(routerExports.setRouteInspectorEnabled).toBeDefined();
  });
});
