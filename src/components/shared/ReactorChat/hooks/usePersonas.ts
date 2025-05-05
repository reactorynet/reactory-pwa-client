import React from 'react';
import { IAIPersona, UXChatMessage } from '../types';

interface ReactorPersonasHookResult {
  personas: IAIPersona[];
  isLoaded: boolean
  loading: boolean;
  error: Error | null;
  selectPersona: (personaId: string) => void;
  activePersona: IAIPersona | null;
}

interface ReactorPersonasHookOptions { 
  reactory: Reactory.Client.ReactorySDK
  onMessage: (message: UXChatMessage) => void
  onError: (error: Error) => void
  onToolCall?: (message: string) => void
  onMacroCall?: (message: string) => void
}

type ReactorPersonasHook = (props: ReactorPersonasHookOptions) => ReactorPersonasHookResult; 

const PERSONAS_QUERY = `
  query GetReactorPersonas {
    ReactorPersonas {
      id
      name
      defaultGreeting
      description
      macros {
        id
        name
        params
        runat
      }
      tools {
        id
        type
        propsMap
        runat
      }      
      createdAt
      updatedAt
    }
  }
`;
const usePersonas: ReactorPersonasHook = (props) => { 

  const { 
    reactory, 
    onMessage, 
    onError, 
    onToolCall, 
    onMacroCall 
  } = props;

const [personas, setPersonas] = React.useState<IAIPersona[]>([]);
const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
const [loading, setLoading] = React.useState<boolean>(true);
const [error, setError] = React.useState<Error | null>(null);
const [activePersona, setActivePersona] = React.useState<IAIPersona | null>(null);
const fetchPersonas = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await reactory.graphqlQuery<{ ReactorPersonas: IAIPersona[] }, {}>(PERSONAS_QUERY, {}, {})
    if (response.error) {
      throw new Error(response.error.message);
    }
    if (!response.data || !response.data.ReactorPersonas) {
      throw new Error('No personas found');
    }
    setIsLoaded(true);
    setPersonas(response.data.ReactorPersonas);
    if (response.data.ReactorPersonas.length > 0) {
      setActivePersona(response.data.ReactorPersonas[0]);
    }
    reactory.log(`usePersonas: ${response?.data?.ReactorPersonas.length} personas loaded`, 'info');
    setLoading(false);
  } catch (err) { 
    setError(err); 
    setLoading(false);
  }
}

React.useEffect(() => {
    fetchPersonas();
    reactory.info(`usePersonas hook initialized`);
  }, []);


return {
    personas,
    loading,
    isLoaded,
    error,
    selectPersona: (personaId: string) => {
      // Logic to select a persona
      const selectedPersona = personas.find(persona => persona.id === personaId);
      if (selectedPersona) {
        setActivePersona(selectedPersona);
      }
    },
    activePersona
  }
};

export default usePersonas;
export { usePersonas, ReactorPersonasHookResult };