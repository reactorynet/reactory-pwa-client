/**
 * @jest-environment jsdom
 *
 * ORG-034 — `useMyDemographics`.
 *
 * The component suite covers the screen; this suite covers the hook's own
 * contract, including the paths a rendered form cannot reach: no transport, no
 * organization, an empty payload, a failed policy read, and the failure shapes
 * the server returns from `MySaveDemographics`.
 */
import { act, renderHook } from '@testing-library/react-hooks';

import type { DemographicDefinition } from '../../../../../../plugins/reactory-core/demographic-form';
import { readSelfServicePolicy, useMyDemographics } from '../hooks/useMyDemographics';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const makeDefinition = (
  overrides: Partial<DemographicDefinition> = {},
): DemographicDefinition => ({
  key: 'nickname',
  title: 'Nickname',
  valueType: 'string',
  enabled: true,
  ordinal: 0,
  ...overrides,
});

interface ServerState {
  definitions?: DemographicDefinition[];
  values?: Array<{ key: string; value: unknown }>;
  selfServiceEnabled?: boolean | null;
}

/**
 * Stub transport. `saveImpl` replaces the mutation so a test can decide how the
 * write fails before the component renders (the hook captures the transport on
 * every render, so the stub must be in place up front).
 */
const makeReactory = (
  state: ServerState = {},
  saveImpl?: (document: string, variables: any) => Promise<any>,
) => ({
  graphqlQuery: jest.fn(async (document: string) => {
    const text = String(document);
    if (text.includes('OrganizationDemographicDefinitions')) {
      return { data: { OrganizationDemographicDefinitions: state.definitions ?? [] } };
    }
    if (text.includes('demographicsPolicy')) {
      if (state.selfServiceEnabled === null) return { data: { CoreOrganization: null } };
      return {
        data: {
          CoreOrganization: {
            id: 'org-1',
            demographicsPolicy: { selfServiceEnabled: state.selfServiceEnabled ?? true },
          },
        },
      };
    }
    if (text.includes('MyDemographics')) {
      return { data: { MyDemographics: state.values ?? [] } };
    }
    return { data: null };
  }),
  graphqlMutation: jest.fn(
    saveImpl ||
      (async (_document: string, variables: any) => ({
        data: {
          MySaveDemographics: (variables.values || []).map((entry: any) => ({
            key: entry.key,
            value: entry.value,
          })),
        },
      })),
  ),
  createNotification: jest.fn(),
  log: jest.fn(),
});

/** Render the hook and let its initial read settle. */
const renderAndSettle = async (options: Parameters<typeof useMyDemographics>[0]) => {
  const rendered = renderHook(() => useMyDemographics(options));
  await act(async () => {
    await flush();
  });
  return rendered;
};

describe('readSelfServicePolicy', () => {
  it('returns the policy value', async () => {
    expect(await readSelfServicePolicy(makeReactory({ selfServiceEnabled: false }), 'org-1')).toBe(
      false,
    );
    expect(await readSelfServicePolicy(makeReactory({ selfServiceEnabled: true }), 'org-1')).toBe(
      true,
    );
  });

  it('returns null when the value cannot be established', async () => {
    // No transport at all.
    expect(await readSelfServicePolicy(null, 'org-1')).toBeNull();
    expect(await readSelfServicePolicy({}, 'org-1')).toBeNull();
    // No organization to ask about.
    expect(await readSelfServicePolicy(makeReactory(), '')).toBeNull();
    // The organization (or the policy field) was not returned.
    expect(await readSelfServicePolicy(makeReactory({ selfServiceEnabled: null }), 'org-1')).toBeNull();
    // A GraphQL error envelope instead of data.
    expect(
      await readSelfServicePolicy(
        {
          graphqlQuery: jest.fn(async () => ({ errors: [{ message: 'Forbidden' }] })),
        },
        'org-1',
      ),
    ).toBeNull();
    // A rejection.
    expect(
      await readSelfServicePolicy(
        { graphqlQuery: jest.fn(async () => Promise.reject(new Error('offline'))) },
        'org-1',
      ),
    ).toBeNull();
  });
});

describe('useMyDemographics — reading', () => {
  it('reads definitions, values and the policy for the active scope', async () => {
    const reactory = makeReactory({
      definitions: [makeDefinition()],
      values: [{ key: 'nickname', value: 'Ada' }],
      selfServiceEnabled: true,
    });

    const { result } = await renderAndSettle({
      reactory,
      organizationId: 'org-1',
      membershipId: 'mem-1',
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.definitions).toHaveLength(1);
    expect(result.current.values).toEqual({ nickname: 'Ada' });
    expect(result.current.policySelfServiceEnabled).toBe(true);
    expect(result.current.selfServiceDisabled).toBe(false);
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(3);

    const valuesCall = reactory.graphqlQuery.mock.calls.find(([document]) =>
      String(document).includes('MyDemographics'),
    );
    expect(valuesCall![1]).toEqual({ organizationId: 'org-1', membershipId: 'mem-1' });
  });

  it('omits membershipId when no membership is selected', async () => {
    const reactory = makeReactory({ definitions: [makeDefinition()] });

    await renderAndSettle({ reactory, organizationId: 'org-1' });

    const valuesCall = reactory.graphqlQuery.mock.calls.find(([document]) =>
      String(document).includes('MyDemographics'),
    );
    expect(valuesCall![1]).toEqual({ organizationId: 'org-1' });
  });

  it('reads nothing without an organization', async () => {
    const reactory = makeReactory();

    const { result } = await renderAndSettle({ reactory, organizationId: undefined });

    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
    expect(result.current.definitions).toEqual([]);
    expect(result.current.values).toEqual({});
    expect(result.current.loadError).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('reports an unavailable transport rather than throwing', async () => {
    const { result } = await renderAndSettle({ reactory: {}, organizationId: 'org-1' });

    expect(result.current.loadError).toMatch(/not available/i);
    expect(result.current.loading).toBe(false);
  });

  it('surfaces a read failure and keeps the screen usable', async () => {
    const reactory = {
      graphqlQuery: jest.fn(async () => Promise.reject(new Error('Gateway timeout'))),
      graphqlMutation: jest.fn(),
    };

    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });

    expect(result.current.loadError).toBe('Gateway timeout');
    expect(result.current.definitions).toEqual([]);
    expect(result.current.values).toEqual({});
    expect(result.current.loading).toBe(false);
  });

  it('tolerates a payload that is not a list', async () => {
    const reactory = {
      graphqlQuery: jest.fn(async (document: string) => {
        if (String(document).includes('OrganizationDemographicDefinitions')) {
          return { data: { OrganizationDemographicDefinitions: null } };
        }
        if (String(document).includes('demographicsPolicy')) {
          return { data: { CoreOrganization: null } };
        }
        return { data: { MyDemographics: null } };
      }),
      graphqlMutation: jest.fn(),
    };

    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });

    expect(result.current.definitions).toEqual([]);
    expect(result.current.values).toEqual({});
    expect(result.current.policySelfServiceEnabled).toBeNull();
  });

  it('reports a definitions read failure while still applying the values', async () => {
    const reactory = {
      graphqlQuery: jest.fn(async (document: string) => {
        if (String(document).includes('OrganizationDemographicDefinitions')) {
          return { errors: [{ message: 'Definitions failed' }] };
        }
        if (String(document).includes('demographicsPolicy')) {
          return { data: { CoreOrganization: null } };
        }
        return { data: { MyDemographics: [{ key: 'nickname', value: 'Ada' }] } };
      }),
      graphqlMutation: jest.fn(),
    };

    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });

    expect(result.current.loadError).toBe('Definitions failed');
    expect(result.current.values).toEqual({ nickname: 'Ada' });
  });
});

describe('useMyDemographics — read completion', () => {
  it('reports hasLoaded only after the read settles', async () => {
    const pending = {
      promise: null as any,
      resolve: null as any,
    };
    pending.promise = new Promise((resolve) => {
      pending.resolve = resolve;
    });

    const reactory = {
      graphqlQuery: jest.fn(async (document: string) => {
        if (String(document).includes('OrganizationDemographicDefinitions')) {
          return pending.promise;
        }
        if (String(document).includes('demographicsPolicy')) return { data: { CoreOrganization: null } };
        return { data: { MyDemographics: [] } };
      }),
      graphqlMutation: jest.fn(),
    };

    const { result } = renderHook(() =>
      useMyDemographics({ reactory, organizationId: 'org-1' }),
    );

    // Before the effect runs there is no read at all.
    expect(result.current.hasLoaded).toBe(false);

    await act(async () => {
      await flush();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.hasLoaded).toBe(false);

    await act(async () => {
      pending.resolve({ data: { OrganizationDemographicDefinitions: [makeDefinition()] } });
      await flush();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.hasLoaded).toBe(true);
  });

  it('is never "loaded" without an organization', async () => {
    const { result } = await renderAndSettle({ reactory: makeReactory(), organizationId: undefined });

    expect(result.current.hasLoaded).toBe(false);
  });

  it('is loaded after a failed read, so the error can be shown', async () => {
    const reactory = {
      graphqlQuery: jest.fn(async () => Promise.reject(new Error('Offline'))),
      graphqlMutation: jest.fn(),
    };

    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });

    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.loadError).toBe('Offline');
  });

  it('is loaded when the transport is unavailable, so the banner is not stuck on a spinner', async () => {
    const { result } = await renderAndSettle({ reactory: {}, organizationId: 'org-1' });

    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.loadError).toMatch(/not available/i);
  });
});

describe('useMyDemographics — self-service policy', () => {
  it('is disabled when the policy says so', async () => {
    const { result } = await renderAndSettle({
      reactory: makeReactory({ definitions: [makeDefinition()], selfServiceEnabled: false }),
      organizationId: 'org-1',
    });

    expect(result.current.policySelfServiceEnabled).toBe(false);
    expect(result.current.selfServiceDisabled).toBe(true);
  });

  it('lets the host override win in both directions', async () => {
    const enabledPolicy = await renderAndSettle({
      reactory: makeReactory({ selfServiceEnabled: true }),
      organizationId: 'org-1',
      selfServiceEnabled: false,
    });
    expect(enabledPolicy.result.current.selfServiceDisabled).toBe(true);

    const disabledPolicy = await renderAndSettle({
      reactory: makeReactory({ selfServiceEnabled: false }),
      organizationId: 'org-1',
      selfServiceEnabled: true,
    });
    expect(disabledPolicy.result.current.selfServiceDisabled).toBe(false);
  });

  it('assumes the server default when the policy cannot be read', async () => {
    const { result } = await renderAndSettle({
      reactory: makeReactory({ selfServiceEnabled: null }),
      organizationId: 'org-1',
    });

    expect(result.current.policySelfServiceEnabled).toBeNull();
    expect(result.current.selfServiceDisabled).toBe(false);
  });

  it('re-reads the policy for each organization and does not carry it over', async () => {
    const reactory = {
      graphqlQuery: jest.fn(async (document: string, variables: any) => {
        if (String(document).includes('OrganizationDemographicDefinitions')) {
          return { data: { OrganizationDemographicDefinitions: [makeDefinition()] } };
        }
        if (String(document).includes('demographicsPolicy')) {
          return {
            data: {
              CoreOrganization: {
                id: variables.organizationId,
                demographicsPolicy: {
                  selfServiceEnabled: variables.organizationId === 'org-1',
                },
              },
            },
          };
        }
        return { data: { MyDemographics: [] } };
      }),
      graphqlMutation: jest.fn(),
    };

    const { result, rerender } = renderHook(
      (props: any) => useMyDemographics(props),
      { initialProps: { reactory, organizationId: 'org-1' } },
    );
    await act(async () => {
      await flush();
    });
    expect(result.current.selfServiceDisabled).toBe(false);

    rerender({ reactory, organizationId: 'org-2' });
    await act(async () => {
      await flush();
    });

    expect(result.current.selfServiceDisabled).toBe(true);
    expect(result.current.policySelfServiceEnabled).toBe(false);
  });
});

describe('useMyDemographics — scope-guarded render view', () => {
  /**
   * The read is deferred (`autoLoad: false`) so nothing but the derivation can
   * clear the state: with a prop change and no read, the raw state still holds
   * org 1's answer, and only `loadedScope` can stop it being reported for org 2.
   */
  const reactoryFor = () => ({
    graphqlQuery: jest.fn(async (document: string, variables: any) => {
      if (String(document).includes('OrganizationDemographicDefinitions')) {
        return { data: { OrganizationDemographicDefinitions: [makeDefinition()] } };
      }
      if (String(document).includes('demographicsPolicy')) {
        return {
          data: {
            CoreOrganization: {
              id: variables.organizationId,
              demographicsPolicy: { selfServiceEnabled: true },
            },
          },
        };
      }
      return { data: { MyDemographics: [{ key: 'nickname', value: 'Ada (org 1)' }] } };
    }),
    graphqlMutation: jest.fn(),
  });

  it('reports nothing for a scope it has not loaded', async () => {
    const reactory = reactoryFor();

    const { result, rerender } = renderHook((props: any) => useMyDemographics(props), {
      initialProps: { reactory, organizationId: 'org-1', autoLoad: false },
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.values).toEqual({ nickname: 'Ada (org 1)' });
    expect(result.current.hasLoaded).toBe(true);

    // Switch organization without triggering a read.
    rerender({ reactory, organizationId: 'org-2', autoLoad: false });

    // The state still holds org 1's answer, but the hook must not report it for
    // org 2 — and must not claim the new scope is loaded.
    expect(result.current.values).toEqual({});
    expect(result.current.definitions).toEqual([]);
    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.formError).toBeNull();
    expect(result.current.policySelfServiceEnabled).toBeNull();
  });

  it('applies the host override regardless of which scope is loaded', async () => {
    const reactory = reactoryFor();

    const { result, rerender } = renderHook((props: any) => useMyDemographics(props), {
      initialProps: { reactory, organizationId: 'org-1', autoLoad: false },
    });

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.selfServiceDisabled).toBe(false);

    // A viewer-role host keeps the surface read-only across a scope change.
    rerender({
      reactory,
      organizationId: 'org-2',
      autoLoad: false,
      selfServiceEnabled: false,
    });
    expect(result.current.selfServiceDisabled).toBe(true);
  });

  it('does not report saved-in-flight for a scope the write belongs to', async () => {
    const pending = {
      promise: null as any,
      resolve: null as any,
    };
    pending.promise = new Promise((resolve) => {
      pending.resolve = resolve;
    });

    const reactory = reactoryFor();
    reactory.graphqlMutation.mockImplementation(() => pending.promise);

    const { result, rerender } = renderHook((props: any) => useMyDemographics(props), {
      initialProps: { reactory, organizationId: 'org-1', autoLoad: false },
    });

    await act(async () => {
      await result.current.refresh();
    });

    let saved: Promise<boolean>;
    act(() => {
      saved = result.current.save();
    });
    expect(result.current.saving).toBe(true);

    rerender({ reactory, organizationId: 'org-2', autoLoad: false });

    // Org 2 is not the one being written, so it must not show a spinner.
    expect(result.current.saving).toBe(false);

    await act(async () => {
      pending.resolve({ data: { MySaveDemographics: [] } });
      await saved!;
      await flush();
    });
  });
});

describe('useMyDemographics — scope-guarded write path', () => {
  const definitions = [makeDefinition({ key: 'nickname' })];

  /** Read once, then start a save whose response the test controls. */
  const startSaveThenSwitch = async (
    saveImpl: () => Promise<any>,
  ): Promise<{
    result: { current: ReturnType<typeof useMyDemographics> };
    rerender: (props: any) => void;
    pending: { resolve: (value: any) => void };
    outcome: Promise<boolean>;
  }> => {
    let resolvePending!: (value: any) => void;
    const pendingPromise = new Promise<any>((resolve) => {
      resolvePending = resolve;
    });

    const reactory = {
      graphqlQuery: jest.fn(async (document: string, variables: any) => {
        if (String(document).includes('OrganizationDemographicDefinitions')) {
          return { data: { OrganizationDemographicDefinitions: definitions } };
        }
        if (String(document).includes('demographicsPolicy')) {
          return {
            data: {
              CoreOrganization: {
                id: variables.organizationId,
                demographicsPolicy: { selfServiceEnabled: true },
              },
            },
          };
        }
        return {
          data: {
            MyDemographics:
              variables.organizationId === 'org-1'
                ? [{ key: 'nickname', value: 'Ada (org 1)' }]
                : [],
          },
        };
      }),
      graphqlMutation: jest.fn() as any,
      createNotification: jest.fn(),
      log: jest.fn(),
    };
    reactory.graphqlMutation.mockImplementation(() => {
      void saveImpl;
      return pendingPromise;
    });

    const { result, rerender } = renderHook((props: any) => useMyDemographics(props), {
      initialProps: { reactory, organizationId: 'org-1', autoLoad: false },
    });

    await act(async () => {
      await result.current.refresh();
    });

    let outcome!: Promise<boolean>;
    act(() => {
      outcome = result.current.save();
    });

    // The member moves to another organization while the write is in flight.
    rerender({ reactory, organizationId: 'org-2', autoLoad: false });
    await act(async () => {
      await result.current.refresh();
    });

    return { result, rerender, pending: { resolve: resolvePending }, outcome };
  };

  it('discards a successful save that lands after the scope changed', async () => {
    const { result, pending, outcome } = await startSaveThenSwitch(async () => ({}));

    await act(async () => {
      pending.resolve({
        data: { MySaveDemographics: [{ key: 'nickname', value: 'Ada (org 1)' }] },
      });
      await outcome;
      await flush();
    });

    // Org 1's saved answer must not be merged into org 2's values.
    expect(result.current.values).toEqual({});
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.formError).toBeNull();
    expect(result.current.selfServiceDisabled).toBe(false);
  });

  it('discards a field-level failure aimed at the previous scope', async () => {
    const { result, pending, outcome } = await startSaveThenSwitch(async () => ({}));

    await act(async () => {
      pending.resolve({
        errors: [
          {
            message: 'One or more demographic values are invalid',
            extensions: {
              fields: [{ path: 'values[0].key', message: 'Nickname is taken' }],
            },
          },
        ],
      });
      await outcome;
      await flush();
    });

    // No inline error and no banner over the new organization's blank form.
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.formError).toBeNull();
  });

  it('discards a policy refusal aimed at the previous scope', async () => {
    const { result, pending, outcome } = await startSaveThenSwitch(async () => ({}));

    await act(async () => {
      pending.resolve({
        errors: [
          {
            message: 'Self-service demographics are disabled for organization [org-1]',
            extensions: { organizationId: 'org-1' },
          },
        ],
      });
      await outcome;
      await flush();
    });

    // Org 1's policy must not make org 2 read-only.
    expect(result.current.selfServiceDisabled).toBe(false);
    expect(result.current.formError).toBeNull();
  });

  it('discards a thrown failure aimed at the previous scope', async () => {
    const { result, pending, outcome } = await startSaveThenSwitch(async () => ({}));

    await act(async () => {
      pending.resolve(Promise.reject(new Error('Network is unreachable')));
      await outcome;
      await flush();
    });

    expect(result.current.formError).toBeNull();
    expect(result.current.fieldErrors).toEqual({});
  });
});

describe('useMyDemographics — saving', () => {
  const definitions = [
    makeDefinition({ key: 'nickname' }),
    makeDefinition({ key: 'gender', valueType: 'enum', required: true, ordinal: 1 }),
  ];

  it('refuses to save without an organization', async () => {
    const reactory = makeReactory();
    const { result } = await renderAndSettle({ reactory, organizationId: undefined });

    let outcome = true;
    await act(async () => {
      outcome = await result.current.save();
    });

    expect(outcome).toBe(false);
    expect(result.current.formError).toMatch(/select an organization/i);
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();
  });

  it('blocks the save when a required field is empty', async () => {
    const reactory = makeReactory({ definitions });
    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });

    let outcome = true;
    await act(async () => {
      outcome = await result.current.save();
    });

    expect(outcome).toBe(false);
    expect(result.current.fieldErrors).toEqual({ gender: ['This field is required.'] });
    expect(result.current.formError).toMatch(/required fields/i);
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();
  });

  it('sends nothing when no field was answered', async () => {
    const reactory = makeReactory({ definitions: [makeDefinition({ key: 'nickname' })] });
    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });

    let outcome = false;
    await act(async () => {
      outcome = await result.current.save();
    });

    expect(outcome).toBe(true);
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();
  });

  it('reports an unavailable transport on save', async () => {
    // A transport that can read but not write.
    const reactory = {
      graphqlQuery: makeReactory({ definitions: [makeDefinition()] }).graphqlQuery,
    };
    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });

    act(() => result.current.updateValues({ nickname: 'Ada' }));

    let outcome = true;
    await act(async () => {
      outcome = await result.current.save();
    });

    expect(outcome).toBe(false);
    expect(result.current.formError).toMatch(/not available/i);
  });

  it('saves without a notification or log transport and reports success', async () => {
    const reactory = {
      graphqlQuery: makeReactory({ definitions: [makeDefinition()] }).graphqlQuery,
      graphqlMutation: jest.fn(async () => ({ data: { MySaveDemographics: [] } })),
    };
    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });

    act(() => result.current.updateValues({ nickname: 'Ada' }));

    let outcome = false;
    await act(async () => {
      outcome = await result.current.save();
    });

    expect(outcome).toBe(true);
    expect(result.current.formError).toBeNull();
    const [, variables] = reactory.graphqlMutation.mock.calls[0] as [string, any];
    expect(variables).toEqual({
      organizationId: 'org-1',
      values: [{ key: 'nickname', value: 'Ada' }],
    });
  });

  it('keeps mapped errors inline and raises no form-level banner', async () => {
    const reactory = makeReactory(
      { definitions, values: [{ key: 'gender', value: 'female' }] },
      async () => ({
        errors: [
          {
            message: 'One or more demographic values are invalid',
            extensions: {
              fields: [{ path: 'values[0].key', message: 'Nickname is taken' }],
            },
          },
        ],
      }),
    );

    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });
    act(() =>
      result.current.updateValues(
        { nickname: 'Ada', gender: 'female' },
        { key: 'nickname', value: 'Ada', definition: definitions[0] },
      ),
    );

    let outcome = true;
    await act(async () => {
      outcome = await result.current.save();
    });

    expect(outcome).toBe(false);
    expect(result.current.fieldErrors).toEqual({ nickname: ['Nickname is taken'] });
    // Everything was attributed to a field, so no banner repeats it.
    expect(result.current.formError).toBeNull();
  });

  it('keeps an unattributable message as a form-level failure', async () => {
    const reactory = makeReactory(
      { definitions, values: [{ key: 'gender', value: 'female' }] },
      async () => ({
        errors: [
          {
            message: 'One or more demographic values are invalid',
            extensions: {
              fields: [
                { path: 'values[0].key', message: 'Nickname is taken' },
                { path: '', message: 'Organization configuration is incomplete' },
              ],
            },
          },
        ],
      }),
    );

    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });
    act(() =>
      result.current.updateValues(
        { nickname: 'Ada', gender: 'female' },
        { key: 'nickname', value: 'Ada', definition: definitions[0] },
      ),
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.fieldErrors).toEqual({ nickname: ['Nickname is taken'] });
    expect(result.current.formError).toBe('Organization configuration is incomplete');
  });

  it('turns a policy refusal into read-only state, not an error', async () => {
    const reactory = makeReactory(
      { definitions, values: [{ key: 'gender', value: 'female' }] },
      async () => {
        throw new Error(
          'Self-service demographics are disabled for organization [org-1]',
        );
      },
    );

    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });
    expect(result.current.selfServiceDisabled).toBe(false);

    act(() =>
      result.current.updateValues(
        { gender: 'female', nickname: 'Ada' },
        { key: 'nickname', value: 'Ada', definition: definitions[0] },
      ),
    );

    let outcome = true;
    await act(async () => {
      outcome = await result.current.save();
    });

    expect(outcome).toBe(false);
    expect(result.current.selfServiceDisabled).toBe(true);
    expect(result.current.formError).toBeNull();
    expect(result.current.fieldErrors).toEqual({});
  });

  it('turns an envelope policy refusal into read-only state too', async () => {
    const reactory = makeReactory(
      { definitions, values: [{ key: 'gender', value: 'female' }] },
      async () => ({ errors: [{ extensions: { selfServiceEnabled: false } }] }),
    );

    const { result } = await renderAndSettle({ reactory, organizationId: 'org-1' });
    act(() =>
      result.current.updateValues(
        { gender: 'female', nickname: 'Ada' },
        { key: 'nickname', value: 'Ada', definition: definitions[0] },
      ),
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.selfServiceDisabled).toBe(true);
    expect(result.current.formError).toBeNull();
  });

  it('clears an inline error when that field is edited', async () => {
    const { result } = await renderAndSettle({
      reactory: makeReactory({ definitions }),
      organizationId: 'org-1',
    });

    await act(async () => {
      await result.current.save();
    });
    expect(result.current.fieldErrors).toEqual({ gender: ['This field is required.'] });

    act(() => {
      result.current.updateValues(
        { gender: 'female' },
        { key: 'gender', value: 'female', definition: definitions[1] },
      );
    });

    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.formError).toBeNull();

    // Clearing a field that has no error is a no-op for the error map.
    act(() => {
      result.current.updateValues(
        { gender: 'female', nickname: 'Ada' },
        { key: 'nickname', value: 'Ada', definition: definitions[0] },
      );
    });
    expect(result.current.fieldErrors).toEqual({});
  });
});
