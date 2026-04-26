/**
 * Sentinel test — confirms the form-engine test path is wired into Jest.
 *
 * Phase 1 baseline. Replaced by real tests as the adapter is built.
 */

describe('form-engine test path', () => {
  it('is discovered by Jest', () => {
    expect(1 + 1).toBe(2);
  });

  it('can resolve the @reactory/client-core path alias', async () => {
    const mod = await import('@reactory/client-core/api/ApiEventNames');
    expect(mod.ReactoryApiEventNames.onLogin).toBe('loggedIn');
  });
});
