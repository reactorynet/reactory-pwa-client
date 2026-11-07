import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrganizationSelector, switchableOrganizations } from '../OrganizationSelector';

type Membership = { enabled?: boolean; organization?: { id?: string; name?: string } };

/**
 * Minimal stand-in for the Reactory API surface the selector uses.
 *
 * `memberships` is the session's own list - the selector deliberately reads
 * nothing else, so the fixture is the whole data source.
 */
const createReactory = (options: {
  memberships?: Membership[];
  activeOrganization?: { id: string; name: string } | null;
  switchOrganization?: jest.Mock;
  createNotification?: jest.Mock;
} = {}) => {
  const memberships = options.memberships ?? [
    { organization: { id: 'org-1', name: 'Acme Corporation' } },
    { organization: { id: 'org-2', name: 'Beta Incorporated' } },
  ];

  const user = {
    activeTheme: { name: 'client', type: 'material', options: { palette: { mode: 'light' } } },
    loggedIn: {
      id: 'user-1',
      memberships,
      organization: options.activeOrganization === undefined
        ? { id: 'org-1', name: 'Acme Corporation' }
        : options.activeOrganization,
    },
  };

  return {
    getUser: jest.fn(() => user),
    switchOrganization: options.switchOrganization ?? jest.fn().mockResolvedValue({ source: 'organization' }),
    createNotification: options.createNotification ?? jest.fn(),
    i18n: { t: (key: string, defaultValue?: string) => defaultValue ?? key },
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

  it('skips disabled memberships and de-duplicates organizations', () => {
    const reactory = createReactory({
      memberships: [
        { organization: { id: 'org-1', name: 'Acme Corporation' } },
        // Same organization, different membership: one choice.
        { organization: { id: 'org-1', name: 'Acme Corporation' } },
        // A deactivated membership confers nothing.
        { enabled: false, organization: { id: 'org-2', name: 'Beta Incorporated' } },
        { organization: { id: 'org-3', name: 'Gamma Holdings' } },
      ],
    });

    expect(switchableOrganizations(reactory)).toEqual([
      { id: 'org-1', name: 'Acme Corporation' },
      { id: 'org-3', name: 'Gamma Holdings' },
    ]);
  });

  it('renders nothing for an anonymous session', () => {
    const reactory = {
      getUser: jest.fn(() => ({ activeTheme: null, loggedIn: null })),
      switchOrganization: jest.fn(),
      createNotification: jest.fn(),
      i18n: { t: (key: string, defaultValue?: string) => defaultValue ?? key },
    } as any;

    render(<OrganizationSelector reactory={reactory} />);

    expect(screen.queryByTestId('organization-selector-button')).toBeNull();
  });
});
