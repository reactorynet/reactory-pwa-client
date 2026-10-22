/**
 * GoogleAuthUrlWidget
 * -------------------
 * Generates and opens the Google Workspace OAuth consent URL.
 *
 * WHY THIS EXISTS
 * There is no Google connect affordance mounted by default anywhere in the
 * client, so a user (or the agent) has no way to (re)grant Workspace scopes.
 * This component closes that gap in two ways:
 *
 *   1. FORM WIDGET — drop it into ANY form by declaring a property and pointing
 *      `ui:widget` (or `ui:field`) at the FQN:
 *
 *          uiSchema: { connect: { 'ui:widget': 'google.GoogleAuthUrlWidget@1.0.0' } }
 *
 *      It does not read or write formData unless `bindFormData` is opted into,
 *      so it is safe to attach to an existing schema without side effects.
 *
 *   2. STANDALONE — mount directly via the SDK/`component` tool:
 *
 *          <Reactory componentFqn="google.GoogleAuthUrlWidget@1.0.0" props={...} />
 *
 * The third path — hands-off, no UI at all — is the `GetAuthUrl` macro in the
 * reactory-google module, which returns the same URL as a tool result.
 *
 * GRAPHQL CONTRACT
 * `googleAuthUrl(scopes: [String!])` — despite the argument name, the resolver
 * forwards these to GoogleAuthService.getAuthorizationUrl(), which maps them
 * through getScopesForServices(). They are therefore LOGICAL SERVICE NAMES
 * (gmail, calendar, drive, docs, sheets, contacts, tasks), not scope URLs.
 *
 * SECURITY
 * The URL is minted server-side with the user id bound into the OAuth `state`
 * parameter. Nothing here decides authorisation; it only surfaces a link.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useReactory } from '@reactory/client-core/api';

/** Query used to mint the consent URL. */
const GOOGLE_AUTH_URL_QUERY = `
  query GoogleAuthUrl($scopes: [String!]) {
    googleAuthUrl(scopes: $scopes) {
      url
    }
  }
`;

/** Query used to show current connection state (optional). */
const GOOGLE_CONNECTION_QUERY = `
  query GoogleConnectionStatus {
    googleConnectionStatus {
      status
      email
      grantedScopes
      expiresAt
    }
  }
`;

export interface GoogleAuthUrlWidgetOptions {
  /** Button label. Default: 'Connect Google Workspace'. */
  buttonText?: string;
  /** Label shown while the URL is being minted. Default: 'Preparing…'. */
  busyText?: string;
  /** MUI Button variant. Default: 'contained'. */
  variant?: 'text' | 'outlined' | 'contained';
  /** MUI Button colour. Default: 'primary'. */
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  /** MUI Button size. Default: 'medium'. */
  size?: 'small' | 'medium' | 'large';
  /** Logical services to request. Default: module default scope set. */
  services?: string[];
  /** Open consent URL in a new tab. Default: true. */
  openInNewTab?: boolean;
  /** Show connection status above the button. Default: true. */
  showStatus?: boolean;
  /** Render secondary text under the button. */
  helperText?: string;
  /** Hide the button entirely when already CONNECTED. Default: false. */
  hideWhenConnected?: boolean;
  /**
   * Write the generated URL back into formData under this field name.
   * Default: disabled — the widget is inert unless explicitly asked to bind.
   */
  bindFormData?: string;
  /** Called with the URL after a successful mint (client-side hook). */
  onUrlGenerated?: (url: string, meta: { services: string[] }) => void;
}

/** Pull `ui:options` with the widget's own defaults applied. */
const resolveOptions = (uiSchema: any) => {
  const supplied: GoogleAuthUrlWidgetOptions = uiSchema?.['ui:options'] ?? {};
  return {
    buttonText: 'Connect Google Workspace',
    busyText: 'Preparing…',
    variant: 'contained' as const,
    color: 'primary' as const,
    size: 'medium' as const,
    openInNewTab: true,
    showStatus: true,
    hideWhenConnected: false,
    ...supplied,
  };
};

const statusColor = (status?: string): 'success' | 'warning' | 'error' | 'default' => {
  switch ((status || '').toUpperCase()) {
    case 'CONNECTED':
      return 'success';
    case 'PARTIAL_ACCESS':
    case 'AUTHORIZING':
      return 'warning';
    case 'TOKEN_EXPIRED':
    case 'REVOKED':
      return 'error';
    default:
      return 'default';
  }
};

export const GoogleAuthUrlWidget: React.FC<any> = (props: any) => {
  const { uiSchema, schema, formData, onChange } = props;
  const options = resolveOptions(uiSchema);
  const reactory = useReactory() as any;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Avoid setState after unmount (a form may close while the query is in flight).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadStatus = useCallback(async () => {
    if (!options.showStatus || !reactory?.graphqlQuery) return;
    setStatusLoading(true);
    try {
      const result: any = await reactory.graphqlQuery(
        GOOGLE_CONNECTION_QUERY,
        {},
        { fetchPolicy: 'network-only' },
      );
      if (!mountedRef.current) return;
      setConnection(result?.data?.googleConnectionStatus ?? null);
    } catch {
      // Status is decorative; a failure must not block minting the URL.
      if (mountedRef.current) setConnection(null);
    } finally {
      if (mountedRef.current) setStatusLoading(false);
    }
  }, [reactory, options.showStatus]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const services = options.services ?? [];
      const result: any = await reactory.graphqlQuery(
        GOOGLE_AUTH_URL_QUERY,
        { scopes: services.length > 0 ? services : null },
        { fetchPolicy: 'network-only' },
      );

      const url: string | undefined =
        result?.data?.googleAuthUrl?.url ?? result?.googleAuthUrl?.url;
      if (!url) {
        throw new Error('The server did not return a Google authorisation URL.');
      }

      if (options.bindFormData && typeof onChange === 'function') {
        onChange({ ...(formData ?? {}), [options.bindFormData]: url });
      }
      options.onUrlGenerated?.(url, { services });

      if (options.openInNewTab) {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        // Pop-up blockers return null; fall back to same-tab navigation so the
        // user is never left staring at a dead button.
        if (!win) window.location.assign(url);
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [busy, reactory, options, formData, onChange]);

  const isConnected = String(connection?.status || '').toUpperCase() === 'CONNECTED';
  if (options.hideWhenConnected && isConnected) return null;

  return (
    <Box sx={{ py: 0.5 }} data-testid="google-auth-url-widget">
      {options.showStatus && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, minHeight: 24 }}>
          {statusLoading ? (
            <CircularProgress size={14} />
          ) : (
            <>
              <Typography variant="caption" color="text.secondary">
                Google Workspace
              </Typography>
              <Chip
                size="small"
                label={connection?.status || 'UNKNOWN'}
                color={statusColor(connection?.status) as any}
                variant={statusColor(connection?.status) === 'default' ? 'outlined' : 'filled'}
              />
              {connection?.email && (
                <Typography variant="caption" color="text.secondary">
                  {connection.email}
                </Typography>
              )}
            </>
          )}
        </Stack>
      )}

      <Button
        variant={options.variant as any}
        color={options.color as any}
        size={options.size as any}
        disabled={busy || props.disabled || props.readonly}
        onClick={handleClick}
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {busy ? options.busyText : options.buttonText}
      </Button>

      {(options.helperText || schema?.description) && !error && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {options.helperText || schema.description}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default GoogleAuthUrlWidget;
