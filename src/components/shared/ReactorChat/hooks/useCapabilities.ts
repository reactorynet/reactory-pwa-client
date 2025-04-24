import { gql, useQuery } from '@apollo/client';

const GET_CAPABILITIES = gql`
  query ReactorCapabilities {
    ReactorCapabilities {
      id
      name
      description
      providers
      models
      parameters {
        name
        type
        required
        defaultValue
        description
      }
    }
  }
`;

export interface CapabilityParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface Capability {
  id: string;
  name: string;
  description?: string;
  providers: string[];
  models: string[];
  parameters: CapabilityParameter[];
}

export interface RoutingConfig {
  preferredProvider?: string;
  requiredCapabilities?: string[];
  fallbackProviders?: string[];
  costLimit?: number;
  timeoutMs?: number;
  prioritizePerformance?: boolean;
  prioritizeCost?: boolean;
}

export const useCapabilities = () => {
  const { loading, error, data, refetch } = useQuery(GET_CAPABILITIES);

  const capabilities: Capability[] = data?.ReactorCapabilities || [];
  
  const getCapabilityById = (id: string): Capability | undefined => 
    capabilities.find(capability => capability.id === id);
  
  const getCapabilitiesByProvider = (providerId: string): Capability[] => 
    capabilities.filter(capability => capability.providers.includes(providerId));
  
  const getCapabilitiesByModel = (modelId: string): Capability[] => 
    capabilities.filter(capability => capability.models.includes(modelId));
  
  const createRoutingConfig = (options: RoutingConfig): RoutingConfig => options;

  return {
    capabilities,
    loading,
    error,
    refetch,
    getCapabilityById,
    getCapabilitiesByProvider,
    getCapabilitiesByModel,
    createRoutingConfig
  };
};
