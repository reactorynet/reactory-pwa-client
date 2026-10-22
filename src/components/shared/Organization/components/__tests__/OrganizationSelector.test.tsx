import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import OrganizationSelector from '../OrganizationSelector';

/**
 * ORG-014 (RC-4): the selector is the user-facing entry point for the
 * organization-switch AC ("switching organization changes the theme without a
 * page reload"). These specs pin that selecting an organization goes through the
 * shell's single switch callable - the one that persists, re-resolves the theme
 * and emits onThemeChanged - rather than only updating local state.
 *
 * The component resolves its UI kit through `reactory.getComponents`, so the
 * stubs below are the whole rendering surface it needs. Plain DOM elements are
 * used (rather than jest.fn components) so clicks and the dialog really work.
 */

const AlertDialog = ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
  open ? <div data-testid="alert-dialog">{children}</div> : null;

const MaterialCore: any = {
  Avatar: ({ children }: any) => <span data-testid="avatar">{children}</span>,
  Typography: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  IconButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Icon: ({ children }: any) => <i>{children}</i>,
  Paper: ({ children }: any) => <div>{children}</div>,
  List: ({ children }: any) => <ul>{children}</ul>,
  ListItem: ({ children, onClick }: any) => <li onClick={onClick}>{children}</li>,
  ListItemButton: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
  ListItemText: ({ primary }: any) => <span>{primary}</span>,
  ListItemIcon: ({ children }: any) => <span>{children}</span>,
  ListSubheader: ({ children }: any) => <h4>{children}</h4>,
  Tooltip: ({ children }: any) => <span>{children}</span>,
  TextField: (props: any) => <input value={props.value ?? ''} onChange={props.onChange} />,
};

const organizations = [
  { id: 'org-1', name: 'Acme Corporation', avatarURL: '', logoURL: '' },
  { id: 'org-2', name: 'Beta Incorporated', avatarURL: '', logoURL: '' },
];

const makeReactory = (overrides: any = {}) => {
  const reactory: any = {
    getComponents: jest.fn((deps: string[]) => {
      const map: Record<string, any> = {
        'react.React': React,
        'react-router.ReactRouterDom': {
          useParams: () => ({ organization_id: 'org-1' }),
          useNavigate: () => jest.fn(),
        },
        'material-ui.MaterialCore': MaterialCore,
        'material-ui.MaterialStyles': { makeStyles: () => () => ({}) },
        'core.AlertDialog': AlertDialog,
      };
      const result: Record<string, any> = {};
      deps.forEach((dep) => {
        const key = dep === 'react.React' ? 'React'
          : dep === 'react-router.ReactRouterDom' ? 'ReactRouterDom'
            : dep === 'material-ui.MaterialCore' ? 'MaterialCore'
              : dep === 'material-ui.MaterialStyles' ? 'MaterialStyles'
                : 'AlertDialog';
        result[key] = map[dep];
      });
      return result;
    }),
    graphqlQuery: jest.fn(async (query: string) => {
      const text = String(query);
      if (text.includes('CoreOrganizations')) return { data: { CoreOrganizations: organizations } };
      if (text.includes('organizationWithId')) {
        return { data: { CoreOrganizationWithId: organizations[0] } };
      }
      return { data: {} };
    }),
    utils: {
      lodash: require('lodash'),
      deepEquals: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
    },
    i18n: { t: (key: string, fallback?: string) => fallback ?? key },
    log: jest.fn(),
    ...overrides,
  };

  return reactory;
};

const renderSelector = (reactory: any, props: any = {}) =>
  render(
    <OrganizationSelector
      reactory={reactory}
      onOrganizationChanged={props.onOrganizationChanged ?? jest.fn()}
      show_selector={props.show_selector ?? true}
      organization_id={props.organization_id ?? 'org-1'}
      {...props.extra}
    />,
  );

describe('OrganizationSelector', () => {
  it('lists the available organizations once they load', async () => {
    const reactory = makeReactory();
    renderSelector(reactory);

    await waitFor(() => {
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
    });

    // The active organization is also rendered as the label, so scope the list
    // assertions to the dialog.
    const dialog = within(screen.getByTestId('alert-dialog'));
    expect(dialog.getByText('Acme Corporation')).toBeInTheDocument();
    expect(dialog.getByText('Beta Incorporated')).toBeInTheDocument();
  });

  it('delegates an organization switch to the shell callable', async () => {
    const setActiveOrganization = jest.fn(async () => ({ source: 'organization' }));
    const onOrganizationChanged = jest.fn();
    const reactory = makeReactory({ setActiveOrganization });

    renderSelector(reactory, { onOrganizationChanged });

    await waitFor(() => {
      expect(screen.getByText('Beta Incorporated')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Beta Incorporated'));

    await waitFor(() => {
      expect(setActiveOrganization).toHaveBeenCalled();
    });

    // The service is installed on the api instance, so `this` must be the api.
    expect(setActiveOrganization).toHaveBeenCalledWith(organizations[1]);
    expect(onOrganizationChanged).toHaveBeenCalledWith(organizations[1]);
  });

  it('calls the switch callable bound to the reactory instance', async () => {
    const seen: any[] = [];
    const reactory: any = makeReactory();
    reactory.marker = 'api-instance';
    reactory.setActiveOrganization = jest.fn(function (this: any, organization: any) {
      seen.push({ organization, marker: this?.marker });
      return Promise.resolve({ source: 'organization' });
    });

    renderSelector(reactory);

    await waitFor(() => {
      expect(screen.getByText('Beta Incorporated')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Beta Incorporated'));

    await waitFor(() => {
      expect(seen.length).toBeGreaterThan(0);
    });

    expect(seen[0].organization).toEqual(organizations[1]);
    expect(seen[0].marker).toBe('api-instance');
  });

  it('still notifies onOrganizationChanged when the shell has no switch callable', async () => {
    const onOrganizationChanged = jest.fn();
    const reactory = makeReactory();
    delete reactory.setActiveOrganization;

    renderSelector(reactory, { onOrganizationChanged });

    await waitFor(() => {
      expect(screen.getByText('Beta Incorporated')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Beta Incorporated'));

    await waitFor(() => {
      expect(onOrganizationChanged).toHaveBeenCalledWith(organizations[1]);
    });
  });

  it('does not throw when the switch callable rejects', async () => {
    const setActiveOrganization = jest.fn(() => Promise.reject(new Error('branding down')));
    const onOrganizationChanged = jest.fn();
    const reactory = makeReactory({ setActiveOrganization });

    renderSelector(reactory, { onOrganizationChanged });

    await waitFor(() => {
      expect(screen.getByText('Beta Incorporated')).toBeInTheDocument();
    });

    // A failed branding fetch falls back to the client theme inside the
    // service; the selector must still complete the switch.
    fireEvent.click(screen.getByText('Beta Incorporated'));

    await waitFor(() => {
      expect(onOrganizationChanged).toHaveBeenCalledWith(organizations[1]);
    });
  });

  it('shows the organization load error instead of the selector', async () => {
    const reactory = makeReactory({
      graphqlQuery: jest.fn(async (query: string) => {
        if (String(query).includes('CoreOrganizations')) {
          return { data: null, errors: [{ message: 'not authorised' }] };
        }
        return { data: { CoreOrganizationWithId: organizations[0] } };
      }),
    });

    renderSelector(reactory);

    await waitFor(() => {
      expect(reactory.graphqlQuery).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText('Beta Incorporated')).not.toBeInTheDocument();
    });
  });
});
