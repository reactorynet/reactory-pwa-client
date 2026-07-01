import { gql, useQuery, useMutation } from '@apollo/client';

const GET_PROVIDERS = gql`
  query ReactorProviders {
    ReactorProviders {
      id
      name
      endpointUrl
      apiVersion
      models {
        id
        providerId
        name
        version
        capabilities
        contextLength
        costPerToken
        inputCostPerToken
        outputCostPerToken
        maxParallelRequests
        supportsStreaming
        supportedTools
        supportedMediaTypes
      }
      defaultModel
      status {
        available
        lastChecked
        uptime
        responseTime
        errorRate
        quotaRemaining
      }
      capabilities
      rateLimits {
        requestsPerMinute
        tokensPerMinute
        concurrentRequests
      }
      credentialRequirements
      authComponentFqn
    }
  }
`;

const GET_USER_PROVIDER_AUTH = gql`
  query ReactorUserProviderAuth {
    ReactorUserProviderAuth {
      provider
      configured
      isDefault
      isAppDefault
      source
      endpoint
      organization
      maskedKeyHint
    }
  }
`;

const SAVE_PROVIDER_AUTH = gql`
  mutation ReactorSaveProviderAuth($input: ReactorSaveProviderAuthInput!) {
    ReactorSaveProviderAuth(input: $input) {
      provider
      configured
      isDefault
      isAppDefault
      source
      endpoint
      organization
      maskedKeyHint
    }
  }
`;

const REMOVE_PROVIDER_AUTH = gql`
  mutation ReactorRemoveProviderAuth($input: ReactorRemoveProviderAuthInput!) {
    ReactorRemoveProviderAuth(input: $input)
  }
`;

export interface ProviderModel {
  id: string;
  providerId: string;
  name: string;
  version?: string;
  capabilities: string[];
  contextLength?: number;
  costPerToken?: number;
  inputCostPerToken?: number;
  outputCostPerToken?: number;
  maxParallelRequests?: number;
  supportsStreaming?: boolean;
  supportedTools?: string[];
  supportedMediaTypes?: string[];
}

export interface ProviderStatus {
  available: boolean;
  lastChecked?: Date;
  uptime?: number;
  responseTime?: number;
  errorRate?: number;
  quotaRemaining?: number;
}

export interface ProviderRateLimits {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  concurrentRequests?: number;
}

export interface Provider {
  id: string;
  name: string;
  endpointUrl?: string;
  apiVersion?: string;
  models: ProviderModel[];
  defaultModel?: string;
  status: ProviderStatus;
  capabilities: string[];
  rateLimits?: ProviderRateLimits;
  credentialRequirements?: string[];
  authComponentFqn?: string;
}

export interface ProviderAuthStatus {
  provider: string;
  configured: boolean;
  isDefault: boolean;
  isAppDefault: boolean;
  source?: string;
  endpoint?: string;
  organization?: string;
  maskedKeyHint?: string;
}

/**
 * Per-session credential override stored in localStorage. Never sent to the
 * server except as a per-request providerAuthOverride on sendMessage.
 */
export interface ProviderAuthOverride {
  apiKey?: string;
  endpoint?: string;
  organization?: string;
  deploymentName?: string;
  apiVersion?: string;
}

/**
 * Non-secret echo persisted client-side so the config dialog can pre-fill
 * endpoint / organization / masked key hint without a server round-trip.
 * The raw API key is NEVER stored here.
 */
interface ProviderAuthEcho {
  providerId: string;
  endpoint?: string;
  organization?: string;
  maskedKeyHint?: string;
  isDefault?: boolean;
  setAsAppDefault?: boolean;
  savedAt?: string;
}

const ECHO_KEY = (providerId: string) => `reactorChat.providerAuth.${providerId}`;
const SESSION_KEY = (chatSessionId: string) => `reactorChat.sessionAuth.${chatSessionId}`;

const safeLocalStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // localStorage unavailable (private mode, sandbox, etc.)
  }
  return null;
};

const readEcho = (providerId: string): ProviderAuthEcho | null => {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(ECHO_KEY(providerId));
    if (!raw) return null;
    return JSON.parse(raw) as ProviderAuthEcho;
  } catch {
    return null;
  }
};

const writeEcho = (echo: ProviderAuthEcho): void => {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(ECHO_KEY(echo.providerId), JSON.stringify(echo));
  } catch {
    // ignore write failures
  }
};

const clearEcho = (providerId: string): void => {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(ECHO_KEY(providerId));
  } catch {
    // ignore
  }
};

export const useProviders = () => {
  const { loading, error, data, refetch } = useQuery(GET_PROVIDERS);
  const {
    loading: authLoading,
    data: authData,
    refetch: refetchAuth,
  } = useQuery(GET_USER_PROVIDER_AUTH);

  const [saveProviderAuthMutation] = useMutation(SAVE_PROVIDER_AUTH);
  const [removeProviderAuthMutation] = useMutation(REMOVE_PROVIDER_AUTH);

  const providers: Provider[] = data?.ReactorProviders || [];
  const providerAuthStatuses: ProviderAuthStatus[] =
    authData?.ReactorUserProviderAuth || [];

  const getProviderById = (id: string): Provider | undefined =>
    providers.find(provider => provider.id === id);

  const getModelById = (modelId: string): ProviderModel | undefined => {
    for (const provider of providers) {
      const model = provider.models.find(model => model.id === modelId);
      if (model) return model;
    }
    return undefined;
  };

  const getAvailableProviders = (): Provider[] =>
    providers.filter(provider => provider.status.available);

  const getModelsByCapability = (capability: string): ProviderModel[] => {
    const models: ProviderModel[] = [];
    for (const provider of providers) {
      const matchingModels = provider.models.filter(
        model => model.capabilities.includes(capability)
      );
      models.push(...matchingModels);
    }
    return models;
  };

  const getAuthStatus = (providerId: string): ProviderAuthStatus | undefined =>
    providerAuthStatuses.find((s) => s.provider === providerId);

  const saveProviderAuth = async (input: {
    providerId: string;
    credentials: Record<string, any>;
    setAsAccountDefault?: boolean;
    setAsAppDefault?: boolean;
  }) => {
    await saveProviderAuthMutation({ variables: { input } });
    await refetchAuth();
    // Persist non-secret echo so the dialog can pre-fill on reopen.
    writeEcho({
      providerId: input.providerId,
      endpoint: input.credentials.endpoint,
      organization: input.credentials.organization,
      maskedKeyHint: input.credentials.apiKey ? maskKey(input.credentials.apiKey) : undefined,
      isDefault: input.setAsAccountDefault,
      setAsAppDefault: input.setAsAppDefault,
      savedAt: new Date().toISOString(),
    });
  };

  const removeProviderAuth = async (providerId: string) => {
    await removeProviderAuthMutation({
      variables: { input: { providerId } },
    });
    await refetchAuth();
    clearEcho(providerId);
  };

  /**
   * Reverts to defaults: clears the local echo AND removes the server-stored
   * user auth so the provider falls back to app/persona/environment config.
   */
  const revertProviderAuth = async (providerId: string) => {
    clearEcho(providerId);
    await removeProviderAuthMutation({
      variables: { input: { providerId } },
    });
    await refetchAuth();
  };

  /**
   * Saves credentials that apply only to a specific chat session. These are
   * stored in localStorage (per-browser) and never sent to the server except
   * as a per-request providerAuthOverride on sendMessage.
   */
  const saveSessionProviderAuth = (
    chatSessionId: string,
    credentials: ProviderAuthOverride
  ): void => {
    const ls = safeLocalStorage();
    if (!ls || !chatSessionId) return;
    try {
      ls.setItem(SESSION_KEY(chatSessionId), JSON.stringify(credentials));
    } catch {
      // ignore
    }
  };

  const clearSessionProviderAuth = (chatSessionId: string): void => {
    const ls = safeLocalStorage();
    if (!ls || !chatSessionId) return;
    try {
      ls.removeItem(SESSION_KEY(chatSessionId));
    } catch {
      // ignore
    }
  };

  const getProviderAuthOverride = (chatSessionId: string): ProviderAuthOverride | null => {
    const ls = safeLocalStorage();
    if (!ls || !chatSessionId) return null;
    try {
      const raw = ls.getItem(SESSION_KEY(chatSessionId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ProviderAuthOverride;
      if (!parsed || typeof parsed !== 'object') return null;
      // Only return if at least one credential value is present.
      const hasAny = Object.values(parsed).some(
        (v) => v !== undefined && v !== null && v !== ''
      );
      return hasAny ? parsed : null;
    } catch {
      return null;
    }
  };

  return {
    providers,
    loading: loading || authLoading,
    error,
    refetch,
    getProviderById,
    getModelById,
    getAvailableProviders,
    getModelsByCapability,
    providerAuthStatuses,
    getAuthStatus,
    saveProviderAuth,
    removeProviderAuth,
    revertProviderAuth,
    saveSessionProviderAuth,
    clearSessionProviderAuth,
    getProviderAuthOverride,
  };
};

/**
 * Masks an API key for safe display, e.g. "sk-abcdef123456" -> "sk-…3456".
 * Returns undefined for empty input.
 */
function maskKey(key: string): string | undefined {
  if (!key || typeof key !== 'string') return undefined;
  if (key.length <= 8) return '••••••••';
  const dashIdx = key.indexOf('-');
  const prefix = dashIdx > 0 ? key.slice(0, dashIdx + 1) : key.slice(0, 3);
  const tail = key.slice(-4);
  return `${prefix}…${tail}`;
}
