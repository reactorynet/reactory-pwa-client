import React, { useState } from 'react';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CheckIcon from '@mui/icons-material/Check';
import { useReactory } from '@reactory/client-core/api';

/**
 * One organization the signed-in user can switch to.
 *
 * Built from the session's own memberships, so the selector offers exactly what
 * the server will accept - there is no separate organization query and no
 * cached list that can disagree with the session.
 */
export interface SwitchableOrganization {
  id: string;
  name: string;
}

/**
 * The subset of the Reactory API the selector depends on.
 *
 * Declared locally (the same approach `LanguageSelector` takes) so the widget
 * does not have to import the full SDK type, and so a host that has not
 * installed the switch callable simply reports that instead of crashing.
 */
export interface OrganizationAwareReactory {
  getUser?: () => any;
  switchOrganization?: (organization: SwitchableOrganization | string) => Promise<unknown>;
  createNotification?: (message: string, options?: any) => unknown;
  i18n?: { t?: (key: string, defaultValue?: string) => string };
}

export interface OrganizationSelectorProps {
  /** Injected by the header; falls back to context when omitted. */
  reactory?: OrganizationAwareReactory;
  /** Icon button size; matches the surrounding toolbar controls by default. */
  size?: 'small' | 'medium' | 'large';
}

/**
 * The organizations the current session may switch to, in display order.
 *
 * Reads `loggedIn.memberships`, drops disabled memberships and anything without
 * an organization document, and de-duplicates by id (a user can hold several
 * memberships in the same organization - different business units, for example -
 * and that is still one choice in this menu).
 *
 * The session's active organization is authoritative on the user document: if
 * it is not in the membership projection it is still offered as an entry, so the
 * tick always has somewhere to sit.
 */
export const switchableOrganizations = (reactory?: OrganizationAwareReactory): SwitchableOrganization[] => {
  let loggedIn: any = null;
  try {
    loggedIn = reactory?.getUser?.()?.loggedIn ?? null;
  } catch {
    return [];
  }

  const memberships: any[] = Array.isArray(loggedIn?.memberships) ? loggedIn.memberships : [];
  const byId = new Map<string, SwitchableOrganization>();

  memberships.forEach((membership: any) => {
    if (!membership || membership.enabled === false) return;
    const organization = membership.organization;
    const id = organization?.id ? `${organization.id}` : '';
    if (id.length === 0 || byId.has(id)) return;
    byId.set(id, { id, name: organization?.name ? `${organization.name}` : id });
  });

  const activeOrganization = loggedIn?.organization;
  const activeId = activeOrganization?.id ? `${activeOrganization.id}` : '';
  if (activeId.length > 0 && byId.has(activeId) === false && activeOrganization?.name) {
    byId.set(activeId, { id: activeId, name: `${activeOrganization.name}` });
  }

  return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
};

/** The organization the session is currently in, or null when it has none. */
export const activeOrganizationId = (reactory?: OrganizationAwareReactory): string | null => {
  try {
    const id = reactory?.getUser?.()?.loggedIn?.organization?.id;
    return id ? `${id}` : null;
  } catch {
    return null;
  }
};

/**
 * A compact organization switcher for the application header.
 *
 * Renders as a single icon button so it stays out of the way, and opens a menu
 * listing the organizations the signed-in user is a member of. The active one is
 * ticked. The switch itself is delegated to `reactory.switchOrganization`, which
 * persists the choice through the server mutation and re-resolves the theme -
 * this component owns no switching or theming logic of its own.
 *
 * Returns `null` when there is no choice to make (fewer than two organizations),
 * so a single-organization deployment does not grow a control that only ever
 * restates the obvious.
 */
export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  reactory: propReactory,
  size = 'large',
}) => {
  const hookReactory = useReactory();
  const reactory = (propReactory ||
    (hookReactory as unknown as OrganizationAwareReactory)) as OrganizationAwareReactory;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const organizations = switchableOrganizations(reactory);
  const activeId = activeOrganizationId(reactory);

  // A single organization is not a choice; stay out of the toolbar.
  if (organizations.length < 2) return null;

  const translate = (key: string, defaultValue: string): string => {
    const t = reactory?.i18n?.t;
    if (typeof t !== 'function') return defaultValue;
    try {
      const translated = t.call(reactory.i18n, key, defaultValue);
      return typeof translated === 'string' && translated.length > 0 ? translated : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const activeName = organizations.find((organization) => organization.id === activeId)?.name ?? '';

  const onSelect = (organization: SwitchableOrganization) => {
    setAnchorEl(null);
    if (organization.id === activeId) return;

    const switchOrganization = reactory?.switchOrganization;
    if (typeof switchOrganization !== 'function') {
      reactory?.createNotification?.(
        translate(
          'reactory:reactory.organizations.switch_unavailable',
          'Switching organization is not available in this application.',
        ),
        { type: 'warning', canDismiss: true, timeout: 5000, showInAppNotification: true },
      );
      return;
    }

    // Switching can be refused (not a member, expired session). The shell logs
    // the reason and leaves the current branding in place; keep the rejection
    // from surfacing as an unhandled promise and tell the user.
    Promise.resolve(switchOrganization.call(reactory, organization)).catch(() => {
      reactory?.createNotification?.(
        translate('reactory:reactory.organizations.switch_failed', 'Could not switch organization. Please try again.'),
        { type: 'error', canDismiss: true, timeout: 5000, showInAppNotification: true },
      );
    });
  };

  return (
    <>
      <Tooltip
        title={
          activeName.length > 0
            ? `${translate('reactory:reactory.organizations.active', 'Organization')}: ${activeName}`
            : translate('reactory:reactory.organizations.switch', 'Switch organization')
        }
      >
        <IconButton
          color="inherit"
          aria-label={translate('reactory:reactory.organizations.switch', 'Switch organization')}
          aria-haspopup="true"
          aria-controls={open ? 'reactory-organization-menu' : undefined}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          size={size}
          data-testid="organization-selector-button"
        >
          <BusinessIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="reactory-organization-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {organizations.map((organization) => {
          const selected = organization.id === activeId;
          return (
            <MenuItem
              key={organization.id}
              selected={selected}
              onClick={() => onSelect(organization)}
              data-testid={`organization-option-${organization.id}`}
            >
              <ListItemIcon>
                {selected ? <CheckIcon fontSize="small" /> : <span style={{ width: 20 }} />}
              </ListItemIcon>
              <ListItemText primary={organization.name} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default OrganizationSelector;
