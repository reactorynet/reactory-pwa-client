import { gql, useMutation } from '@apollo/client';

const SEND_GENERIC_REQUEST = gql`
  mutation ReactorSendGenericRequest($template: ReactorGenericRequestTemplate!, $parameters: Any, $chatSessionId: String) {
    ReactorSendGenericRequest(template: $template, parameters: $parameters, chatSessionId: $chatSessionId) {
      ... on ReactorChatMessage {
        id
        role
        content
        rating
        timestamp
        tool_calls
      }
      ... on ReactorInitiateSSE {
        sessionId
        endpoint
        token
        status
        expiry
        headers
      }
      ... on ReactorErrorResponse {
        code
        message
        details
        timestamp
        recoverable
        suggestion
      }
    }
  }
`;

export interface MessageProcessingOptions {
  summarizeContext?: boolean;
  filterSensitiveInfo?: boolean;
  translateToProviderFormat?: boolean;
  includePrevContext?: number;
  optimizePrompt?: boolean;
  tokenLimit?: number;
  convertMedia?: boolean;
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

export interface GenericRequestTemplate {
  messageTemplate: string;
  parameters?: string[];
  requiredCapabilities?: string[];
  processingOptions?: MessageProcessingOptions;
  routing?: RoutingConfig;
}

export const useMessageProcessing = (props: {
  reactory: Reactory.Client.ReactorySDK
}) => {
  const { reactory } = props;
  const [sendGenericRequestMutation] = useMutation(SEND_GENERIC_REQUEST);
  
  const sendGenericRequest = async (
    template: GenericRequestTemplate,
    parameters?: any,
    chatSessionId?: string
  ) => {
    try {
      const response = await sendGenericRequestMutation({
        variables: {
          template,
          parameters,
          chatSessionId
        }
      });
      
      return response.data.ReactorSendGenericRequest;
    } catch (error) {
      reactory.error('Error sending generic request:', error);
      throw error;
    }
  };
  
  const createTemplate = (
    messageTemplate: string,
    options: {
      parameters?: string[];
      requiredCapabilities?: string[];
      processingOptions?: MessageProcessingOptions;
      routing?: RoutingConfig;
    } = {}
  ): GenericRequestTemplate => {
    return {
      messageTemplate,
      ...options
    };
  };

  return {
    sendGenericRequest,
    createTemplate
  };
};
