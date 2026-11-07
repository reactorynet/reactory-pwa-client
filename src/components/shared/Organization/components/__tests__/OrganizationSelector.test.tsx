import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrganizationSelector, switchableOrganizations, activeOrganizationId } from '../OrganizationSelector';

type Membership = { enabled?: boolean; organization?: { id?: string; name?: string } };

/**
 * Minimal stand-in for the Reactory API surface the selector uses.
 *
 * The default fixture mirrors the **real** session shape: the server's
 * `ApiStatus.loggedIn.memberships` projection carries
 * `id, client, organization { id name logo }, businessUnit, roles` - and
 * notably **not** `enabled`. Fixtures that invent fields the session never
 * carries make a filter look covered when it can never fire in production.
 */
const createReactory = (options: {
  memberships?: Membership[];
  activeOrganization?: { id: string; name: string } | null;
  switchOrganization?: jest.Mock;
  createNotification?: jest.Mock;
  getUser?: jest.Mock;
} = {}) => {
  const memberships = options.memberships ?? [
    { organization: { id: 'org-1', name: 'Acme Corporation' } },
    { organization: { id: 'org-2', name: 'Beta Incorporated' } },
  ];

  const user = {
    activeTheme: { name: 'client', type: 'material', options: { palette: { mode: 'light' } } },
    loggedIn: {
      id: 'user-1',
      roles: ['USER'],
      memberships,
      organization: options.activeOrganization === undefined
        ? { id: 'org-1', name: 'Acme Corporation' }
        : options.activeOrganization,
    },
  };

  return {
    getUser: options.getUser ?? jest.fn(() => user),
    switchOrganization: options.switchOrganization ?? jest.fn().mockResolvedValue({ source: 'organization' }),
    createNotification: options.createNotification ?? jest.fn(),
  } as any;
};

describe('OrganizationSelector', () => {
  it('renders nothing when the user has a single organization', () => {
    const reactory = createReactory({
      memberships: [{ organization: { id: 'org-1', name: 'Acme Corporation' } }],
    });

    render(<OrganizationSelector reactory={reactory} />);

    expect(screen.queryByTestId('organization-selector-button')).toBeNull();
  });

  it('renders one icon button that opens a menu of the organizations', () => {
    const reactory = createReactory();

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));

    expect(screen.getByTestId('organization-option-org-1')).toBeInTheDocument();
    expect(screen.getByTestId('organization-option-org-2')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Beta Incorporated')).toBeInTheDocument();
  });

  it('ticks the organization the session is currently active in', () => {
    const reactory = createReactory({ activeOrganization: { id: 'org-2', name: 'Beta Incorporated' } });

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));

    // The tick marks the active organization; the other entry has no icon.
    expect(screen.getByTestId('organization-option-org-2').querySelector('[data-testid="CheckIcon"]'))
      .not.toBeNull();
    expect(screen.getByTestId('organization-option-org-1').querySelector('[data-testid="CheckIcon"]'))
      .toBeNull();
    expect(screen.getByTestId('organization-option-org-2')).toHaveClass('Mui-selected');
    expect(screen.getByTestId('organization-option-org-1')).not.toHaveClass('Mui-selected');
  });

  it('delegates the switch to reactory.switchOrganization with the chosen organization', async () => {
    const switchOrganization = jest.fn().mockResolvedValue({ source: 'organization' });
    const reactory = createReactory({ switchOrganization });

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));
    fireEvent.click(screen.getByTestId('organization-option-org-2'));

    expect(switchOrganization).toHaveBeenCalledTimes(1);
    expect(switchOrganization).toHaveBeenCalledWith({ id: 'org-2', name: 'Beta Incorporated' });
    await waitFor(() => expect(screen.queryByTestId('organization-option-org-2')).toBeNull());
  });

  it('closes the menu without switching when the user dismisses it', async () => {
    const switchOrganization = jest.fn();
    const reactory = createReactory({ switchOrganization });

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));
    expect(screen.getByTestId('organization-option-org-2')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByTestId('organization-option-org-2')).toBeNull());
    expect(switchOrganization).not.toHaveBeenCalled();
  });

  it('does not switch when the active organization is selected again', () => {
    const switchOrganization = jest.fn();
    const reactory = createReactory({ switchOrganization });

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));
    fireEvent.click(screen.getByTestId('organization-option-org-1'));

    expect(switchOrganization).not.toHaveBeenCalled();
  });

  it('reports a refused switch instead of leaving a rejected promise unhandled', async () => {
    const switchOrganization = jest.fn().mockRejectedValue(new Error('ORGANIZATION_MEMBERSHIP_REQUIRED'));
    const createNotification = jest.fn();
    const reactory = createReactory({ switchOrganization, createNotification });

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));
    fireEvent.click(screen.getByTestId('organization-option-org-2'));

    await waitFor(() => expect(createNotification).toHaveBeenCalled());
    expect(createNotification.mock.calls[0][0]).toMatch(/could not switch organization/i);
  });

  it('reports that switching is unavailable when the host exposes no switch callable', () => {
    const createNotification = jest.fn();
    const reactory = createReactory({ createNotification });
    delete (reactory as any).switchOrganization;

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));
    fireEvent.click(screen.getByTestId('organization-option-org-2'));

    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification.mock.calls[0][0]).toMatch(/not available/i);
    expect(createNotification.mock.calls[0][1]).toEqual(expect.objectContaining({ type: 'warning' }));
  });

  it('de-duplicates organizations from the real session shape', () => {
    const reactory = createReactory({
      memberships: [
        // Same organization, two memberships (different business units): one
        // choice in the menu. The real projection has no `enabled` field.
        { organization: { id: 'org-1', name: 'Acme Corporation' } },
        { organization: { id: 'org-1', name: 'Acme Corporation' } },
        // A membership without an organization document is not a choice.
        { organization: undefined },
        { organization: { id: 'org-3', name: 'Gamma Holdings' } },
      ],
    });

    expect(switchableOrganizations(reactory)).toEqual([
      { id: 'org-1', name: 'Acme Corporation' },
      { id: 'org-3', name: 'Gamma Holdings' },
    ]);
  });

  it('lists a membership whose organization is the active one even if the projection omits it', () => {
    const reactory = createReactory({
      memberships: [{ organization: { id: 'org-3', name: 'Gamma Holdings' } }],
      activeOrganization: { id: 'org-1', name: 'Acme Corporation' },
    });

    // The tick always has somewhere to sit.
    expect(switchableOrganizations(reactory)).toEqual([
      { id: 'org-1', name: 'Acme Corporation' },
      { id: 'org-3', name: 'Gamma Holdings' },
    ]);
    expect(activeOrganizationId(reactory)).toBe('org-1');
  });

  it('honours `enabled: false` only when the payload carries it (defensive)', () => {
    // Synthetic payload: the ApiStatus `loggedIn.memberships` fragment does not
    // request `enabled`, so in this application the flag is always undefined and
    // this filter is inert - the server's refusal is the real authority. The
    // filter is kept so a host with a richer projection gets the right menu.
    const reactory = createReactory({
      memberships: [
        { organization: { id: 'org-1', name: 'Acme Corporation' } },
        { enabled: false, organization: { id: 'org-2', name: 'Beta Incorporated' } },
      ],
    });

    expect(switchableOrganizations(reactory)).toEqual([
      { id: 'org-1', name: 'Acme Corporation' },
    ]);
  });

  it('renders nothing for an anonymous session', () => {
    // The real anonymous context: non-null, with no memberships and no
    // organization.
    const reactory = createReactory({
      getUser: jest.fn(() => ({
        activeTheme: null,
        loggedIn: { id: 'anon', roles: ['ANON'], memberships: [], organization: null },
      })),
    });

    render(<OrganizationSelector reactory={reactory} />);

    expect(screen.queryByTestId('organization-selector-button')).toBeNull();
    expect(switchableOrganizations(reactory)).toEqual([]);
    expect(activeOrganizationId(reactory)).toBeNull();
  });

  it('falls back to the neutral label when the session has no active organization', () => {
    // Two memberships but no active organization yet: the control still offers
    // the choice and labels itself generically rather than inventing a name.
    const reactory = createReactory({ activeOrganization: null });

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));

    expect(screen.getByTestId('organization-option-org-1')).toBeInTheDocument();
    expect(screen.getByTestId('organization-option-org-2')).toBeInTheDocument();
    // No entry is ticked, and nothing claims an active organization.
    expect(screen.queryByTestId('CheckIcon')).toBeNull();
  });

  it('does not throw when the host has no notification channel', () => {
    const reactory = createReactory();
    delete (reactory as any).switchOrganization;
    delete (reactory as any).createNotification;

    render(<OrganizationSelector reactory={reactory} />);
    fireEvent.click(screen.getByTestId('organization-selector-button'));

    expect(() => fireEvent.click(screen.getByTestId('organization-option-org-2'))).not.toThrow();
  });

  it('renders nothing when the host exposes no session at all', () => {
    const reactory = {} as any;

    render(<OrganizationSelector reactory={reactory} />);

    expect(screen.queryByTestId('organization-selector-button')).toBeNull();
    expect(switchableOrganizations(reactory)).toEqual([]);
  });

  it('ignores a session whose memberships field is not an array', () => {
    const reactory = createReactory({
      getUser: jest.fn(() => ({ loggedIn: { id: 'user-1', memberships: null, organization: null } })),
    });

    expect(switchableOrganizations(reactory)).toEqual([]);
  });

  it('survives a getUser that throws', () => {
    const reactory = createReactory({
      getUser: jest.fn(() => {
        throw new Error('session unavailable');
      }),
    });

    render(<OrganizationSelector reactory={reactory} />);

    expect(screen.queryByTestId('organization-selector-button')).toBeNull();
    expect(switchableOrganizations(reactory)).toEqual([]);
    expect(activeOrganizationId(reactory)).toBeNull();
  });
});
