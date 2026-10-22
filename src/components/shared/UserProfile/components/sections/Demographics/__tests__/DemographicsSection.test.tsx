/**
 * @jest-environment jsdom
 *
 * ORG-034 — self-service My Demographics.
 *
 * These tests exercise the real section and the real shared renderer
 * (`reactory-core/demographic-form`): the wiring under test is the read, the
 * scope change, validation and the write, so stubbing the renderer would hide
 * exactly the behaviour this ticket is about.
 *
 * The GraphQL transport is a stub, dispatched on the operation name embedded in
 * the document, which also proves the documents we send are the ones the server
 * exposes.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { DemographicsSection } from '../DemographicsSection';
import { buildSavePayload, keyFromErrorPath, requiredFieldErrors } from '../utils';
import type { DemographicDefinition } from '../../../../../../plugins/reactory-core/demographic-form';

afterEach(cleanup);

interface DemographicsServerState {
  definitions: Record<string, DemographicDefinition[]>;
  values: Record<string, Array<{ key: string; value: unknown }>>;
  /**
   * `OrganizationDemographicsPolicy.selfServiceEnabled` per organization.
   * Absent means the server default, `true`.
   */
  policies?: Record<string, boolean>;
}

const makeDefinition = (
  overrides: Partial<DemographicDefinition> = {},
): DemographicDefinition => ({
  id: 'def-1',
  key: 'nickname',
  title: 'Nickname',
  valueType: 'string',
  enabled: true,
  ordinal: 0,
  required: false,
  ...overrides,
});

const makeProfile = () => ({
  id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
});

const makeMembership = (organizationId: string, id = `mem-${organizationId}`) => ({
  id,
  organization: { id: organizationId, name: `Org ${organizationId}` },
  roles: ['USER'],
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

/**
 * Stubbed Reactory SDK.
 *
 * `queryOverrides` lets a single test hold one operation open (the
 * organization-change test needs to observe the cleared state before the new
 * read lands).
 */
const makeReactory = (
  state: DemographicsServerState,
  queryOverrides: Record<string, (variables: any) => Promise<any>> = {},
) => {
  const graphqlQuery = jest.fn(async (document: string, variables: any) => {
    const text = String(document);

    if (text.includes('OrganizationDemographicDefinitions')) {
      const override = queryOverrides.OrganizationDemographicDefinitions;
      if (override) return override(variables);
      return {
        data: {
          OrganizationDemographicDefinitions: state.definitions[variables.organizationId] || [],
        },
      };
    }

    // `Organization.demographicsPolicy` — read before the form is usable so the
    // surface can be read-only from its first paint.
    if (text.includes('demographicsPolicy')) {
      const override = queryOverrides.OrganizationDemographicsPolicy;
      if (override) return override(variables);
      const selfServiceEnabled = state.policies?.[variables.organizationId] ?? true;
      return {
        data: {
          CoreOrganization: {
            id: variables.organizationId,
            demographicsPolicy: { selfServiceEnabled },
          },
        },
      };
    }

    if (text.includes('MyDemographics')) {
      const override = queryOverrides.MyDemographics;
      if (override) return override(variables);
      return { data: { MyDemographics: state.values[variables.organizationId] || [] } };
    }

    return { data: null };
  });

  const graphqlMutation = jest.fn(async (document: string, variables: any) => {
    const text = String(document);
    if (text.includes('MySaveDemographics')) {
      return {
        data: {
          MySaveDemographics: (variables.values || []).map((entry: any) => ({
            key: entry.key,
            value: entry.value,
          })),
        },
      };
    }
    return { data: null };
  });

  return {
    graphqlQuery,
    graphqlMutation,
    createNotification: jest.fn(),
    log: jest.fn(),
    getComponent: jest.fn(() => null),
    i18n: undefined,
  };
};

interface RenderOptions {
  state: DemographicsServerState;
  organizationId?: string;
  membershipId?: string;
  mode?: string;
  selfServiceEnabled?: boolean;
  queryOverrides?: Record<string, (variables: any) => Promise<any>>;
}

const renderSection = (options: RenderOptions) => {
  const reactory = makeReactory(options.state, options.queryOverrides);
  const organizationId = options.organizationId ?? 'org-1';
  const membership = makeMembership(organizationId, options.membershipId);

  const view = render(
    <DemographicsSection
      profile={makeProfile()}
      mode={(options.mode || 'edit') as any}
      onProfileUpdate={jest.fn()}
      selectedMembership={membership as any}
      organizationId={organizationId}
      selfServiceEnabled={options.selfServiceEnabled}
      reactory={reactory as any}
    />,
  );

  return { ...view, reactory };
};

/** The definition keys the renderer actually rendered, in DOM order. */
const renderedKeys = (): Array<string | null> =>
  screen
    .queryAllByTestId(/^demographic-field-/)
    .map((element) => element.getAttribute('data-demographic-key'));

const inputFor = (key: string): HTMLInputElement =>
  screen.getByTestId(`demographic-field-${key}`).querySelector('input') as HTMLInputElement;

describe('DemographicsSection — loading definitions and values', () => {
  it('renders enabled definitions in ordinal order and omits disabled ones', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [
          makeDefinition({ key: 'charlie', title: 'Charlie', ordinal: 30 }),
          makeDefinition({ key: 'alpha', title: 'Alpha', ordinal: 10 }),
          makeDefinition({ key: 'bravo', title: 'Bravo', ordinal: 20 }),
          makeDefinition({ key: 'hidden', title: 'Hidden', ordinal: 40, enabled: false }),
        ],
      },
      values: { 'org-1': [] },
    };

    renderSection({ state });

    await waitFor(() => expect(renderedKeys()).toEqual(['alpha', 'bravo', 'charlie']));
    expect(screen.queryByTestId('demographic-field-hidden')).not.toBeInTheDocument();
  });

  it('asks for enabled definitions only and reads the caller values for the active organization', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition()] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    const definitionsCall = reactory.graphqlQuery.mock.calls.find(([document]) =>
      String(document).includes('OrganizationDemographicDefinitions'),
    );
    expect(definitionsCall).toBeDefined();
    expect(String(definitionsCall![0])).toContain(
      'query OrganizationDemographicDefinitions',
    );
    expect(definitionsCall![1]).toEqual({ organizationId: 'org-1', includeDisabled: false });

    const valuesCall = reactory.graphqlQuery.mock.calls.find(([document]) =>
      String(document).includes('MyDemographics'),
    );
    expect(valuesCall).toBeDefined();
    expect(valuesCall![1]).toEqual({ organizationId: 'org-1', membershipId: 'mem-org-1' });
  });

  it('loads the existing values into the form', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [
          makeDefinition({ key: 'nickname', title: 'Nickname', ordinal: 1 }),
          makeDefinition({ key: 'yearsOfService', title: 'Years of service', valueType: 'number', ordinal: 2 }),
        ],
      },
      values: {
        'org-1': [
          { key: 'nickname', value: 'Ada Lovelace' },
          { key: 'yearsOfService', value: 7 },
        ],
      },
    };

    renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada Lovelace'));
    expect(inputFor('yearsOfService')).toHaveValue(7);
  });
});

describe('DemographicsSection — load failures', () => {
  it('shows the failure and retries the read', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    let attempts = 0;
    const flakyDefinitions = jest.fn(async (variables: any) => {
      attempts += 1;
      if (attempts === 1) throw new Error('Definitions unavailable');
      return {
        data: {
          OrganizationDemographicDefinitions: state.definitions[variables.organizationId] || [],
        },
      };
    });

    const { reactory } = renderSection({
      state,
      queryOverrides: { OrganizationDemographicDefinitions: flakyDefinitions },
    });

    await waitFor(() =>
      expect(screen.getByTestId('demographics-error')).toHaveTextContent(
        'Definitions unavailable',
      ),
    );
    // Nothing is rendered over a failed read.
    expect(screen.queryByTestId('demographic-form')).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByTestId('demographics-error')).getByRole('button'));

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));
    expect(screen.queryByTestId('demographics-error')).not.toBeInTheDocument();
    expect(flakyDefinitions).toHaveBeenCalledTimes(2);
    // The retry re-reads every part of the scope, not just the one that failed.
    expect(
      reactory.graphqlQuery.mock.calls.filter(([document]) =>
        String(document).includes('MyDemographics'),
      ).length,
    ).toBe(2);
  });
});

describe('DemographicsSection — organization changes', () => {
  it('refetches and does not carry the previous organization’s values over', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })],
        'org-2': [makeDefinition({ key: 'nickname', title: 'Nickname' })],
      },
      values: {
        'org-1': [{ key: 'nickname', value: 'Ada (org 1)' }],
        // Org 2 has no stored answer: if the org-1 value leaked, it would show.
        'org-2': [],
      },
    };

    const orgTwoValues = deferred<any>();
    const reactory = makeReactory(state, {
      MyDemographics: (variables) =>
        variables.organizationId === 'org-2' ? orgTwoValues.promise : Promise.resolve({
          data: { MyDemographics: state.values['org-1'] },
        }),
    });

    const { rerender } = render(
      <DemographicsSection
        profile={makeProfile() as any}
        mode={'edit' as any}
        onProfileUpdate={jest.fn()}
        selectedMembership={makeMembership('org-1') as any}
        organizationId="org-1"
        reactory={reactory as any}
      />,
    );

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada (org 1)'));

    rerender(
      <DemographicsSection
        profile={makeProfile() as any}
        mode={'edit' as any}
        onProfileUpdate={jest.fn()}
        selectedMembership={makeMembership('org-2') as any}
        organizationId="org-2"
        reactory={reactory as any}
      />,
    );

    // The previous organization's answer must disappear immediately — before
    // org 2's read resolves — so it can never be saved against org 2.
    await waitFor(() =>
      expect(screen.queryByTestId('demographic-field-nickname')).not.toBeInTheDocument(),
    );

    const orgTwoCalls = reactory.graphqlQuery.mock.calls.filter(
      ([, variables]) => variables && variables.organizationId === 'org-2',
    );
    expect(
      orgTwoCalls.some(([document]) => String(document).includes('MyDemographics')),
    ).toBe(true);
    expect(
      orgTwoCalls.some(([document]) =>
        String(document).includes('OrganizationDemographicDefinitions'),
      ),
    ).toBe(true);

    orgTwoValues.resolve({ data: { MyDemographics: [] } });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue(''));
  });

  it('discards a save that resolves after the organization changed', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })],
        'org-2': [makeDefinition({ key: 'nickname', title: 'Nickname' })],
      },
      policies: { 'org-1': true, 'org-2': true },
      values: {
        'org-1': [{ key: 'nickname', value: 'Ada (org 1)' }],
        // Org 2 has no stored answer: any value here means org 1 leaked in.
        'org-2': [],
      },
    };

    const pendingSave = deferred<any>();
    const reactory = makeReactory(state);
    reactory.graphqlMutation.mockImplementation(() => pendingSave.promise);

    const section = (orgId: string) => (
      <DemographicsSection
        profile={makeProfile() as any}
        mode={'edit' as any}
        onProfileUpdate={jest.fn()}
        selectedMembership={makeMembership(orgId) as any}
        organizationId={orgId}
        reactory={reactory as any}
      />
    );

    const { rerender } = render(section('org-1'));
    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada (org 1)'));

    // The write for org 1 is now in flight.
    fireEvent.click(screen.getByTestId('demographics-save'));
    await waitFor(() => expect(reactory.graphqlMutation).toHaveBeenCalledTimes(1));

    // Switch organization while it is still open.
    rerender(section('org-2'));
    await waitFor(() => expect(inputFor('nickname')).toHaveValue(''));

    // Now the org-1 write lands, carrying an org-1 value and an org-1 field error.
    await act(async () => {
      pendingSave.resolve({
        data: { MySaveDemographics: [{ key: 'nickname', value: 'Ada (org 1)' }] },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The new organization's field is still empty…
    expect(inputFor('nickname')).toHaveValue('');
    // …no stale field error or form banner was painted over it…
    expect(screen.queryByTestId('demographic-errors-nickname')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demographics-form-error')).not.toBeInTheDocument();
    // …and no read-only flip happened.
    expect(screen.queryByTestId('demographics-readonly')).not.toBeInTheDocument();
    expect(inputFor('nickname')).not.toBeDisabled();
  });

  it('does not flip the new organization to read-only when a stale save is refused', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })],
        'org-2': [makeDefinition({ key: 'nickname', title: 'Nickname' })],
      },
      // Org 2 allows self-service; only the stale org-1 write is refused.
      policies: { 'org-1': true, 'org-2': true },
      values: {
        'org-1': [{ key: 'nickname', value: 'Ada (org 1)' }],
        'org-2': [],
      },
    };

    const pendingSave = deferred<any>();
    const reactory = makeReactory(state);
    reactory.graphqlMutation.mockImplementation(() => pendingSave.promise);

    const section = (orgId: string) => (
      <DemographicsSection
        profile={makeProfile() as any}
        mode={'edit' as any}
        onProfileUpdate={jest.fn()}
        selectedMembership={makeMembership(orgId) as any}
        organizationId={orgId}
        reactory={reactory as any}
      />
    );

    const { rerender } = render(section('org-1'));
    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada (org 1)'));

    fireEvent.click(screen.getByTestId('demographics-save'));
    await waitFor(() => expect(reactory.graphqlMutation).toHaveBeenCalledTimes(1));

    rerender(section('org-2'));
    await waitFor(() => expect(inputFor('nickname')).toHaveValue(''));

    // A policy refusal aimed at org 1 must not make org 2 read-only.
    await act(async () => {
      pendingSave.resolve({
        errors: [
          {
            message:
              'Self-service demographics are disabled for organization [org-1]',
            extensions: { organizationId: 'org-1' },
          },
        ],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByTestId('demographics-readonly')).not.toBeInTheDocument();
    expect(inputFor('nickname')).not.toBeDisabled();
    expect(screen.queryByTestId('demographics-form-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('demographics-save')).toBeInTheDocument();
  });

  it('shows the loading state rather than the previous organization while the new read is pending', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })],
        'org-2': [makeDefinition({ key: 'nickname', title: 'Nickname' })],
      },
      values: {
        'org-1': [{ key: 'nickname', value: 'Ada (org 1)' }],
        'org-2': [],
      },
    };

    const orgTwoValues = deferred<any>();
    const reactory = makeReactory(state, {
      MyDemographics: (variables) =>
        variables.organizationId === 'org-2'
          ? orgTwoValues.promise
          : Promise.resolve({ data: { MyDemographics: state.values['org-1'] } }),
    });

    const section = (orgId: string) => (
      <DemographicsSection
        profile={makeProfile() as any}
        mode={'edit' as any}
        onProfileUpdate={jest.fn()}
        selectedMembership={makeMembership(orgId) as any}
        organizationId={orgId}
        reactory={reactory as any}
      />
    );

    const { rerender } = render(section('org-1'));
    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada (org 1)'));

    // While org 2's read is open, org 1's field must be gone. (The stricter
    // synchronous assertion — that no org-1 value is rendered on the very frame
    // the prop changes — cannot be observed through RTL, whose `rerender`
    // flushes effects; `useMyDemographics.test.tsx` proves the derivation that
    // guarantees it directly, with a deferred read.)
    rerender(section('org-2'));
    expect(screen.queryByTestId('demographic-field-nickname')).not.toBeInTheDocument();
    expect(screen.getByTestId('demographics-loading')).toBeInTheDocument();

    orgTwoValues.resolve({ data: { MyDemographics: [] } });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue(''));
  });

  it('refetches when only the membership changes', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })] },
      values: {},
    };

    const valuesByMembership: Record<string, Array<{ key: string; value: unknown }>> = {
      'mem-a': [{ key: 'nickname', value: 'Ada A' }],
      'mem-b': [{ key: 'nickname', value: 'Ada B' }],
    };

    const reactory = makeReactory(state, {
      MyDemographics: async (variables: any) => ({
        data: { MyDemographics: valuesByMembership[variables.membershipId] || [] },
      }),
    });

    const section = (membershipId: string) => (
      <DemographicsSection
        profile={makeProfile() as any}
        mode={'edit' as any}
        onProfileUpdate={jest.fn()}
        selectedMembership={makeMembership('org-1', membershipId) as any}
        organizationId="org-1"
        reactory={reactory as any}
      />
    );

    const { rerender } = render(section('mem-a'));
    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada A'));

    rerender(section('mem-b'));

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada B'));

    // The organization did not change, but the definitions are re-read for the
    // new membership scope rather than reused.
    expect(
      reactory.graphqlQuery.mock.calls.filter(([document]) =>
        String(document).includes('OrganizationDemographicDefinitions'),
      ).length,
    ).toBe(2);
    expect(
      reactory.graphqlQuery.mock.calls
        .filter(([document]) => String(document).includes('MyDemographics'))
        .map(([, variables]) => (variables as any).membershipId),
    ).toEqual(['mem-a', 'mem-b']);
  });
});

describe('DemographicsSection — saving', () => {
  it('saves an edited value', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    fireEvent.change(inputFor('nickname'), { target: { value: 'Ada Lovelace' } });
    expect(inputFor('nickname')).toHaveValue('Ada Lovelace');

    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() => expect(reactory.graphqlMutation).toHaveBeenCalledTimes(1));

    const [, variables] = reactory.graphqlMutation.mock.calls[0] as [string, any];
    expect(variables.values).toEqual([{ key: 'nickname', value: 'Ada Lovelace' }]);
  });

  it('saves once the required field is filled in', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [makeDefinition({ key: 'gender', title: 'Gender', required: true })],
      },
      values: { 'org-1': [] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('gender')).toHaveValue(''));

    // Blocked while empty…
    fireEvent.click(screen.getByTestId('demographics-save'));
    await waitFor(() => expect(screen.getByTestId('demographic-errors-gender')).toBeInTheDocument());
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();

    // …and unblocked as soon as the member answers: the inline error clears on
    // the edit and the save goes through.
    fireEvent.change(inputFor('gender'), { target: { value: 'female' } });
    expect(screen.queryByTestId('demographic-errors-gender')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demographics-form-error')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() => expect(reactory.graphqlMutation).toHaveBeenCalledTimes(1));
    const [, variables] = reactory.graphqlMutation.mock.calls[0] as [string, any];
    expect(variables.values).toEqual([{ key: 'gender', value: 'female' }]);
  });

  it('sends nothing when no optional field was answered', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })] },
      values: { 'org-1': [] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue(''));
    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() => expect(screen.queryByTestId('demographics-form-error')).not.toBeInTheDocument());
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();
  });

  it('surfaces an unmapped server error alongside the mapped ones', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [
          makeDefinition({ key: 'nickname', title: 'Nickname', ordinal: 1 }),
          makeDefinition({ key: 'age', title: 'Age', valueType: 'number', ordinal: 2 }),
        ],
      },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }, { key: 'age', value: 200 }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    reactory.graphqlMutation.mockResolvedValueOnce({
      errors: [
        {
          message: 'One or more demographic values are invalid',
          extensions: {
            fields: [
              { path: 'values[1].age', message: 'Age must be younger than 150' },
              // No path: nothing to attach it to, so it must not be dropped.
              { path: '', message: 'Organization configuration is incomplete' },
            ],
          },
        },
      ],
    });

    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() =>
      expect(screen.getByTestId('demographic-errors-age')).toHaveTextContent(
        'Age must be younger than 150',
      ),
    );
    expect(screen.getByTestId('demographics-form-error')).toHaveTextContent(
      'Organization configuration is incomplete',
    );
  });

  it('saves through MySaveDemographics with the right variables and no user field', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [
          makeDefinition({ key: 'nickname', title: 'Nickname', ordinal: 1 }),
          makeDefinition({ key: 'unanswered', title: 'Unanswered', ordinal: 2 }),
        ],
      },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() => expect(reactory.graphqlMutation).toHaveBeenCalledTimes(1));

    const [document, variables] = reactory.graphqlMutation.mock.calls[0] as [string, any];
    expect(String(document)).toContain('mutation MySaveDemographics');
    expect(variables).toEqual({
      organizationId: 'org-1',
      membershipId: 'mem-org-1',
      values: [{ key: 'nickname', value: 'Ada' }],
    });

    // The server writes for the caller; a `user` field would be rejected.
    variables.values.forEach((value: any) => {
      expect(Object.keys(value)).toEqual(['key', 'value']);
      expect(value.user).toBeUndefined();
    });
    // A definition with no answer is not sent at all.
    expect(variables.values.map((value: any) => value.key)).toEqual(['nickname']);

    expect(reactory.createNotification).toHaveBeenCalledWith(
      'Your demographics have been saved.',
      { type: 'success' },
    );
  });

  it('blocks save on a missing required field and shows the error inline', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [
          makeDefinition({ key: 'gender', title: 'Gender', required: true }),
          makeDefinition({ key: 'nickname', title: 'Nickname', ordinal: 1 }),
        ],
      },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('gender')).toHaveValue(''));

    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() =>
      expect(screen.getByTestId('demographic-errors-gender')).toHaveTextContent(
        'This field is required.',
      ),
    );
    expect(screen.getByTestId('demographics-form-error')).toHaveTextContent(/required/i);
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();
    // The optional field is allowed to save partially; only the required one blocks.
    expect(screen.queryByTestId('demographic-errors-nickname')).not.toBeInTheDocument();
  });

  it('maps server field-level errors onto the right fields', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [
          makeDefinition({ key: 'nickname', title: 'Nickname', ordinal: 1 }),
          makeDefinition({ key: 'age', title: 'Age', valueType: 'number', ordinal: 2 }),
        ],
      },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }, { key: 'age', value: 200 }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    reactory.graphqlMutation.mockResolvedValueOnce({
      errors: [
        {
          message: 'One or more demographic values are invalid',
          extensions: {
            organizationId: 'org-1',
            fields: [{ path: 'values[1].age', message: 'Age must be younger than 150' }],
          },
        },
      ],
    });

    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() =>
      expect(screen.getByTestId('demographic-errors-age')).toHaveTextContent(
        'Age must be younger than 150',
      ),
    );
    expect(screen.queryByTestId('demographic-errors-nickname')).not.toBeInTheDocument();
    // Mapped errors do not also produce a form-level banner.
    expect(screen.queryByTestId('demographics-form-error')).not.toBeInTheDocument();
  });

  it('never echoes a sensitive value into a notification or a log', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [
          makeDefinition({
            key: 'disability',
            title: 'Disability status',
            sensitive: true,
          }),
        ],
      },
      values: { 'org-1': [{ key: 'disability', value: 'wheelchair-user' }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('disability')).toHaveValue('wheelchair-user'));
    // Sensitive definitions render normally for their owner.
    expect(screen.getByTestId('demographic-sensitive-disability')).toHaveTextContent(
      'Sensitive',
    );

    reactory.graphqlMutation.mockRejectedValueOnce(new Error('Network is unreachable'));
    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() => expect(reactory.log).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(reactory.createNotification.mock.calls)).not.toContain(
      'wheelchair-user',
    );
    expect(JSON.stringify(reactory.log.mock.calls)).not.toContain('wheelchair-user');
  });

  it('falls back to a form-level message for an unattributable failure', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition()] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    reactory.graphqlMutation.mockRejectedValueOnce(new Error('Network is unreachable'));

    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() =>
      expect(screen.getByTestId('demographics-form-error')).toHaveTextContent(
        'Network is unreachable',
      ),
    );
  });
});

describe('DemographicsSection — read-only states', () => {
  it('renders read-only from the first paint when the policy disables self-service', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
      policies: { 'org-1': false },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    // The policy is read up front, so the form is already read-only when it
    // first appears: no save attempt is needed to discover the restriction.
    const policyCall = reactory.graphqlQuery.mock.calls.find(([document]) =>
      String(document).includes('demographicsPolicy'),
    );
    expect(policyCall).toBeDefined();
    expect(String(policyCall![0])).toContain('query OrganizationDemographicsPolicy');
    expect(policyCall![1]).toEqual({ organizationId: 'org-1' });

    const explanation = screen.getByTestId('demographics-readonly');
    expect(explanation).toHaveAttribute('data-readonly-reason', 'self-service-disabled');
    expect(explanation).toHaveTextContent(/does not allow self-service demographics/i);
    expect(inputFor('nickname')).toBeDisabled();
    expect(screen.queryByTestId('demographics-save')).not.toBeInTheDocument();
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();
  });

  it('never renders an editable or empty form while the policy read is pending', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition({ key: 'nickname', title: 'Nickname' })] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
      policies: { 'org-1': false },
    };

    const pendingPolicy = deferred<any>();
    const { reactory } = renderSection({
      state,
      queryOverrides: {
        OrganizationDemographicsPolicy: () => pendingPolicy.promise,
      },
    });

    // All three reads are issued in the same batch, before any of them settles.
    expect(
      reactory.graphqlQuery.mock.calls.map(([document]) =>
        String(document).includes('demographicsPolicy')
          ? 'policy'
          : String(document).includes('MyDemographics')
            ? 'values'
            : 'definitions',
      ),
    ).toEqual(['definitions', 'values', 'policy']);

    // While the policy is unknown, nothing that could be mistaken for a usable
    // or configured form is on screen.
    expect(screen.getByTestId('demographics-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('demographic-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demographics-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demographics-save')).not.toBeInTheDocument();

    pendingPolicy.resolve({
      data: { CoreOrganization: { id: 'org-1', demographicsPolicy: { selfServiceEnabled: false } } },
    });

    // The form's *first* appearance is already read-only: no submit (and no
    // failed submit) was needed to discover the restriction.
    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));
    expect(inputFor('nickname')).toBeDisabled();
    expect(screen.getByTestId('demographics-readonly')).toHaveAttribute(
      'data-readonly-reason',
      'self-service-disabled',
    );
    expect(screen.queryByTestId('demographics-save')).not.toBeInTheDocument();
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();
  });

  it('lets the host prop override an enabled policy', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition()] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
      policies: { 'org-1': true },
    };

    renderSection({ state, selfServiceEnabled: false });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    expect(screen.getByTestId('demographics-readonly')).toHaveAttribute(
      'data-readonly-reason',
      'self-service-disabled',
    );
    expect(inputFor('nickname')).toBeDisabled();
  });

  it('keeps the form editable when the policy allows self-service', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition()] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
      policies: { 'org-1': true },
    };

    renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    expect(screen.queryByTestId('demographics-readonly')).not.toBeInTheDocument();
    expect(inputFor('nickname')).not.toBeDisabled();
    expect(screen.getByTestId('demographics-save')).toBeInTheDocument();
  });

  it('renders read-only with an explanation when self-service is disabled', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition()] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    renderSection({ state, selfServiceEnabled: false });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    const explanation = screen.getByTestId('demographics-readonly');
    expect(explanation).toHaveAttribute('data-readonly-reason', 'self-service-disabled');
    expect(explanation).toHaveTextContent(/self-service/i);
    expect(inputFor('nickname')).toBeDisabled();
    expect(screen.queryByTestId('demographics-save')).not.toBeInTheDocument();
  });

  it('switches to the read-only explanation when the server refuses self-service on save', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition()] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    const { reactory } = renderSection({ state });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    reactory.graphqlMutation.mockRejectedValueOnce(
      new Error(
        'Self-service demographics are disabled for organization [org-1]',
      ),
    );

    fireEvent.click(screen.getByTestId('demographics-save'));

    await waitFor(() =>
      expect(screen.getByTestId('demographics-readonly')).toHaveAttribute(
        'data-readonly-reason',
        'self-service-disabled',
      ),
    );
    // A policy refusal is a state, not an error the member should retry.
    expect(screen.queryByTestId('demographics-form-error')).not.toBeInTheDocument();
    expect(inputFor('nickname')).toBeDisabled();
  });

  it('is read-only in view mode and explains why', async () => {
    const state: DemographicsServerState = {
      definitions: { 'org-1': [makeDefinition()] },
      values: { 'org-1': [{ key: 'nickname', value: 'Ada' }] },
    };

    renderSection({ state, mode: 'view' });

    await waitFor(() => expect(inputFor('nickname')).toHaveValue('Ada'));

    expect(screen.getByTestId('demographics-readonly')).toHaveAttribute(
      'data-readonly-reason',
      'view',
    );
    expect(screen.getByTestId('demographics-readonly')).toHaveTextContent(/read-only mode/i);
    expect(inputFor('nickname')).toBeDisabled();
    expect(screen.queryByTestId('demographics-save')).not.toBeInTheDocument();
  });

  it('explains that no organization is selected instead of rendering an empty form', async () => {
    const state: DemographicsServerState = { definitions: {}, values: {} };

    const reactory = makeReactory(state);
    render(
      <DemographicsSection
        profile={makeProfile() as any}
        mode={'edit' as any}
        onProfileUpdate={jest.fn()}
        reactory={reactory as any}
      />,
    );

    const explanation = screen.getByTestId('demographics-readonly');
    expect(explanation).toHaveAttribute('data-readonly-reason', 'no-organization');
    expect(explanation).toHaveTextContent(/no organization is selected/i);
    expect(screen.queryByTestId('demographic-form')).not.toBeInTheDocument();
    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
  });
});

describe('DemographicsSection — empty state', () => {
  it('renders a clear message when the organization has no enabled definitions', async () => {
    const state: DemographicsServerState = {
      definitions: {
        'org-1': [makeDefinition({ key: 'hidden', enabled: false })],
      },
      values: { 'org-1': [] },
    };

    renderSection({ state });

    // The shared renderer owns the empty presentation; the section supplies the
    // organization-aware copy inside it.
    await waitFor(() =>
      expect(screen.getByTestId('demographic-form-empty')).toHaveTextContent(
        /no demographic fields are configured/i,
      ),
    );
    expect(screen.getByTestId('demographics-empty')).toHaveTextContent(
      /has not set up any demographic fields/i,
    );
    expect(screen.queryByTestId('demographic-form')).not.toBeInTheDocument();
  });
});

describe('demographics helpers', () => {
  it('builds a payload with only answered definitions and no user field', () => {
    const definitions = [
      makeDefinition({ key: 'nickname', title: 'Nickname' }),
      makeDefinition({ key: 'gender', title: 'Gender', valueType: 'enum' }),
      makeDefinition({ key: 'optIn', title: 'Opt in', valueType: 'boolean' }),
    ];

    const payload = buildSavePayload(definitions, {
      nickname: 'Ada',
      gender: '',
      optIn: false,
    });

    expect(payload).toEqual([
      { key: 'nickname', value: 'Ada' },
      // `false` is a deliberate answer, not an empty one.
      { key: 'optIn', value: false },
    ]);
    payload.forEach((entry) => {
      expect(entry).not.toHaveProperty('user');
      expect(entry).not.toHaveProperty('definition');
    });
  });

  it('flags only empty required definitions', () => {
    const definitions = [
      makeDefinition({ key: 'gender', required: true }),
      makeDefinition({ key: 'nickname', required: true }),
      makeDefinition({ key: 'optional', required: false }),
    ];

    const errors = requiredFieldErrors(definitions, { gender: 'female' });

    expect(Object.keys(errors)).toEqual(['nickname']);
  });

  it('maps a server error path back to the definition key it was sent for', () => {
    expect(keyFromErrorPath('values[0].key', ['nickname', 'age'])).toBe('nickname');
    expect(keyFromErrorPath('values[1].age', ['nickname', 'age'])).toBe('age');
    expect(keyFromErrorPath('age', ['nickname', 'age'])).toBe('age');
    expect(keyFromErrorPath('values[9].age', ['nickname', 'age'])).toBeNull();
  });
});
