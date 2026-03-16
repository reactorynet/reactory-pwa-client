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
}

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
  };

  const removeProviderAuth = async (providerId: string) => {
    await removeProviderAuthMutation({
      variables: { input: { providerId } },
    });
    await refetchAuth();
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
  };
};
