import { gql, useQuery } from '@apollo/client';

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
    }
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
}

export const useProviders = () => {
  const { loading, error, data, refetch } = useQuery(GET_PROVIDERS);

  const providers: Provider[] = data?.ReactorProviders || [];
  
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

  return {
    providers,
    loading,
    error,
    refetch,
    getProviderById,
    getModelById,
    getAvailableProviders,
    getModelsByCapability
  };
};
