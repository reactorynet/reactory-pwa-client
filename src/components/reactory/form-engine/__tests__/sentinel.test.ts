/**
 * Sentinel test — confirms the form-engine test path is wired into Jest.
 *
 * Phase 1 baseline. Replaced by real tests as the adapter is built.
 */

import { ReactoryApiEventNames } from '@reactory/client-core/api/ApiEventNames';

describe('form-engine test path', () => {
  it('is discovered by Jest', () => {
    expect(1 + 1).toBe(2);
  });

  it('resolves the @reactory/client-core path alias', () => {
    expect(ReactoryApiEventNames.onLogin).toBe('loggedIn');
  });
});
