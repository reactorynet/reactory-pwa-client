import { gql, useMutation, useQuery } from '@apollo/client';

const SEND_MESSAGE = gql`
  mutation ReactorSendMessage($message: ReactorSendMessageInput!) {
    ReactorSendMessage(message: $message) {
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

export const useChatFactory = () => {
  const [sendMessageMutation] = useMutation(SEND_MESSAGE);

  const sendMessage = async (personaId: string, message: string, chatSessionId?: string) => {
    try {
      const response = await sendMessageMutation({
        variables: {
          message: {
            personaId,
            chatSessionId,
            message,
          },
        },
      });

      return response.data.ReactorSendMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return {
    sendMessage,
  };
};