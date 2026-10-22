import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useOrganization } from '../useOrganization';

/**
 * ORG-014 (RC-4): the organization hook owns the only other writer of the
 * organization selection - `setDefaultOrganization`. These specs pin that it
 * delegates to the shell's single switch callable (which persists, re-resolves
 * the theme and emits onThemeChanged) and only falls back to raw localStorage
 * in hosts that do not mount the theme integration.
 */

const makeReactory = (overrides: any = {}) => {
  const organization = { id: 'org-1', name: 'Acme Corporation', code: 'ACME' };

  const reactory: any = {
    getComponents: jest.fn(() => ({ React })),
    graphqlQuery: jest.fn(async (query: string) => {
      const text = String(query);
      if (text.includes('organizationWithId')) return { data: { CoreOrganizationWithId: organization } };
      return { data: {} };
    }),
    graphqlMutation: jest.fn(async () => ({
      data: { CreateOrganization: { id: 'org-new', name: 'New Corp' } },
    })),
    utils: {
      deepEquals: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
      lodash: {},
    },
    log: jest.fn(),
    ...overrides,
  };

  return { reactory, organization };
};

const renderOrganizationHook = (reactory: any, organizationId: any = 'org-1') =>
  renderHook(() => useOrganization({ reactory, organizationId }));

describe('useOrganization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads the organization from the server and clears the loading flag', async () => {
    const { reactory, organization } = makeReactory();
    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(reactory.graphqlQuery).toHaveBeenCalled();
    expect(String(reactory.graphqlQuery.mock.calls[0][0])).toContain('organizationWithId');
    expect(reactory.graphqlQuery.mock.calls[0][1]).toEqual({ id: 'org-1' });
    expect(result.current.organization).toEqual(organization);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not query when no organization id is supplied', () => {
    const { reactory } = makeReactory();
    const { result } = renderOrganizationHook(reactory, null);

    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
    expect(result.current.organization).toBeNull();
  });

  it('surfaces a query error and stops loading', async () => {
    const { reactory } = makeReactory({
      graphqlQuery: jest.fn(async () => ({ data: null, errors: [{ message: 'not authorised' }] })),
    });
    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);

    await waitForNextUpdate();

    expect(result.current.error).toBe('not authorised');
    expect(result.current.loading).toBe(false);
    expect(result.current.organization).toBeNull();
  });

  it('marks the organization dirty when it is updated', async () => {
    const { reactory } = makeReactory();
    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);

    await waitForNextUpdate();
    expect(result.current.dirty).toBe(false);

    act(() => {
      result.current.update({ id: 'org-1', name: 'Renamed' });
    });

    expect(result.current.dirty).toBe(true);
    expect(result.current.organization.name).toBe('Renamed');
  });

  it('creates an organization through the server mutation', async () => {
    const { reactory } = makeReactory();
    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);

    await waitForNextUpdate();

    act(() => {
      result.current.setOrganization({ id: 'new', name: 'New Corp' });
    });

    await act(async () => {
      await result.current.create();
    });

    expect(reactory.graphqlMutation).toHaveBeenCalled();
    expect(result.current.organization).toEqual({ id: 'org-new', name: 'New Corp' });
  });

  it('delegates setDefaultOrganization to the shell switch callable', async () => {
    const setActiveOrganization = jest.fn(async () => ({ source: 'organization' }));
    const { reactory } = makeReactory({ setActiveOrganization });
    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);

    await waitForNextUpdate();

    act(() => {
      result.current.setDefaultOrganization('org-2');
    });

    expect(setActiveOrganization).toHaveBeenCalledWith('org-2');
    // The callable owns persistence, so the hook must not write the key itself
    // and risk diverging from the service's view of the active organization.
    expect(localStorage.getItem('CoreDefaultOrganization')).toBeNull();
  });

  it('keeps the switch callable bound to the api instance', async () => {
    const calls: any[] = [];
    const reactory: any = makeReactory().reactory;
    reactory.brand = 'reactory';
    reactory.setActiveOrganization = jest.fn(function (this: any, id: string) {
      calls.push({ id, brand: this?.brand });
      return Promise.resolve({ source: 'organization' });
    });

    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);
    await waitForNextUpdate();

    act(() => {
      result.current.setDefaultOrganization('org-2');
    });

    // `this` must be the api object; the service is installed there.
    expect(calls).toEqual([{ id: 'org-2', brand: 'reactory' }]);
  });

  it('falls back to localStorage when the shell has no switch callable', async () => {
    const { reactory } = makeReactory();
    delete reactory.setActiveOrganization;

    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);
    await waitForNextUpdate();

    act(() => {
      result.current.setDefaultOrganization('org-2');
    });

    expect(localStorage.getItem('CoreDefaultOrganization')).toBe('org-2');
  });

  it('exposes the persisted default organization id', async () => {
    localStorage.setItem('CoreDefaultOrganization', 'org-2');
    const { reactory } = makeReactory();

    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);
    await waitForNextUpdate();

    expect(result.current.defaultOrganizationId).toBe('org-2');
  });

  it('never throws when the switch callable rejects', async () => {
    const setActiveOrganization = jest.fn(() => Promise.reject(new Error('branding down')));
    const { reactory } = makeReactory({ setActiveOrganization });
    const { result, waitForNextUpdate } = renderOrganizationHook(reactory);

    await waitForNextUpdate();

    // The service logs and falls back; the hook must not surface a rejection
    // from a fire-and-forget persistence call.
    expect(() => {
      act(() => {
        result.current.setDefaultOrganization('org-2');
      });
    }).not.toThrow();
  });
});
