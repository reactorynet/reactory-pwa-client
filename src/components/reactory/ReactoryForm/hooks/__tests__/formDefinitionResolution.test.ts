import {
  applySessionAvailable,
  resolveFormDefinition,
  retryFormDefinitionResolution,
  subscribeToSessionAvailable,
} from '../formDefinitionResolution';

/**
 * Regression cover for the two form-resolution failure modes behind
 * `reactory.MyApplications@1.0.0` not rendering:
 *  - an empty cache after logout must recover (load the list, then resolve);
 *  - a server-side "no such form / not for you" must be terminal and retryable
 *    without looping.
 */
describe('formDefinitionResolution', () => {
  const FORM_ID = 'reactory.MyApplications@1.0.0';
  const definition = { id: FORM_ID, name: 'MyApplications', __complete__: true };

  const createCallbacks = () => ({
    onLoading: jest.fn(),
    onResolved: jest.fn(),
    onError: jest.fn(),
  });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('resolves immediately from the cached list', () => {
    const callbacks = createCallbacks();
    const reactory = {
      form: jest.fn(() => definition),
      forms: jest.fn(),
      clearFormCache: jest.fn(),
    };

    resolveFormDefinition({ reactory, formId: FORM_ID, callbacks });

    expect(callbacks.onLoading).toHaveBeenCalledTimes(1);
    expect(callbacks.onResolved).toHaveBeenCalledWith(definition);
    expect(reactory.forms).not.toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it('loads the list and retries when the cache is empty (recovery after logout)', async () => {
    const callbacks = createCallbacks();
    const reactory: any = {
      form: jest.fn(),
      forms: jest.fn().mockResolvedValue([]),
      clearFormCache: jest.fn(),
    };

    // First call: no list loaded yet. Second call (after forms) succeeds.
    reactory.form
      .mockImplementationOnce(() => {
        throw new Error('No forms have been loaded. Ensure the forms function is called before calling form(id)');
      })
      .mockImplementationOnce((id: string, onUpdated: any) => {
        onUpdated(definition);
      });

    resolveFormDefinition({ reactory, formId: FORM_ID, callbacks });

    expect(reactory.forms).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).not.toHaveBeenCalled();

    await flush();

    expect(reactory.form).toHaveBeenCalledTimes(2);
    expect(callbacks.onResolved).toHaveBeenCalledWith(definition);
  });

  it('reports a terminal error when the list still cannot resolve the form (no loop)', async () => {
    const callbacks = createCallbacks();
    const reactory: any = {
      form: jest.fn(() => {
        throw new Error('No forms have been loaded.');
      }),
      forms: jest.fn().mockResolvedValue([]),
      clearFormCache: jest.fn(),
    };

    resolveFormDefinition({ reactory, formId: FORM_ID, callbacks });

    await flush();

    // One list load, two resolution attempts, one error — never a retry storm.
    expect(reactory.forms).toHaveBeenCalledTimes(1);
    expect(reactory.form).toHaveBeenCalledTimes(2);
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onResolved).not.toHaveBeenCalled();
  });

  it('surfaces the server error message when the by-id fetch finds nothing', () => {
    const callbacks = createCallbacks();
    const reactory: any = {
      form: jest.fn((id: string, onUpdated: any) => onUpdated(null, new Error(`Form "${id}" is not available`))),
      forms: jest.fn(),
      clearFormCache: jest.fn(),
    };

    resolveFormDefinition({ reactory, formId: FORM_ID, callbacks });

    expect(callbacks.onError).toHaveBeenCalledWith(`Form "${FORM_ID}" is not available`);
    expect(callbacks.onResolved).not.toHaveBeenCalled();
  });

  it('reports a failure when the recovery list load rejects', async () => {
    const callbacks = createCallbacks();
    const reactory: any = {
      form: jest.fn(() => {
        throw new Error('No forms have been loaded.');
      }),
      forms: jest.fn().mockRejectedValue(new Error('network down')),
      clearFormCache: jest.fn(),
    };

    resolveFormDefinition({ reactory, formId: FORM_ID, callbacks });
    await flush();

    expect(callbacks.onError).toHaveBeenCalledWith('network down');
    expect(reactory.forms).toHaveBeenCalledTimes(1);
  });

  it('retry clears only this form and re-runs resolution', () => {
    const callbacks = createCallbacks();
    const reactory: any = {
      form: jest.fn(() => definition),
      forms: jest.fn(),
      clearFormCache: jest.fn(),
    };

    retryFormDefinitionResolution({ reactory, formId: FORM_ID, callbacks });

    expect(reactory.clearFormCache).toHaveBeenCalledWith(FORM_ID);
    expect(reactory.form).toHaveBeenCalledTimes(1);
    expect(callbacks.onResolved).toHaveBeenCalledWith(definition);
  });

  it('a repeated failure on retry keeps the error and does not auto-retry', () => {
    const callbacks = createCallbacks();
    const reactory: any = {
      form: jest.fn((id: string, onUpdated: any) => onUpdated(null, new Error('still unavailable'))),
      forms: jest.fn(),
      clearFormCache: jest.fn(),
    };

    retryFormDefinitionResolution({ reactory, formId: FORM_ID, callbacks });
    retryFormDefinitionResolution({ reactory, formId: FORM_ID, callbacks });

    expect(callbacks.onError).toHaveBeenCalledTimes(2);
    expect(reactory.form).toHaveBeenCalledTimes(2);
    expect(reactory.forms).not.toHaveBeenCalled();
    expect(callbacks.onResolved).not.toHaveBeenCalled();
  });
});

describe('session-available handling', () => {
  it('resets the loading state before re-resolving', () => {
    const order: string[] = [];
    const deps = {
      resetLoadingState: jest.fn(() => order.push('reset')),
      resolve: jest.fn(() => order.push('resolve')),
    };

    applySessionAvailable(deps);

    expect(deps.resetLoadingState).toHaveBeenCalledTimes(1);
    expect(deps.resolve).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['reset', 'resolve']);
  });

  it('registers the login handler and unsubscribes the same reference', () => {
    const api = { on: jest.fn(), off: jest.fn() };
    const handler = jest.fn();

    const unsubscribe = subscribeToSessionAvailable(api, 'onLogin', handler);

    expect(api.on).toHaveBeenCalledWith('onLogin', handler);

    unsubscribe();
    expect(api.off).toHaveBeenCalledWith('onLogin', handler);
    // Same identity: an inline arrow would never be removable.
    expect(api.on.mock.calls[0][1]).toBe(api.off.mock.calls[0][1]);
  });

  it('tolerates a SDK with no event emitter', () => {
    expect(() => subscribeToSessionAvailable(null, 'onLogin', jest.fn())()).not.toThrow();
    expect(() => subscribeToSessionAvailable({}, 'onLogin', jest.fn())()).not.toThrow();
    expect(() => subscribeToSessionAvailable(undefined, 'onLogin', jest.fn())()).not.toThrow();
  });

  it('does not throw when the SDK cannot remove listeners', () => {
    const handler = jest.fn();
    const unsubscribe = subscribeToSessionAvailable({ on: jest.fn() }, 'onLogin', handler);

    expect(() => unsubscribe()).not.toThrow();
  });
});
