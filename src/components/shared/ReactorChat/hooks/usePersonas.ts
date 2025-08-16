import React from 'react';
import { IAIPersona, UXChatMessage } from '../types';
import { useNavigate, useParams } from 'react-router';
import { useSearchParams } from 'react-router-dom';

interface ReactorPersonasHookResult {
  personas: IAIPersona[];
  isLoaded: boolean
  loading: boolean;
  error: Error | null;
  selectPersona: (personaId: string) => void;
  getPersona: (personaId: string) => IAIPersona | undefined;
  activePersona: IAIPersona | null;
}

interface ReactorPersonasHookOptions { 
  reactory: Reactory.Client.ReactorySDK
  onMessage: (message: UXChatMessage) => void
  onError: (error: Error) => void
  onToolCall?: (message: string) => void
  onMacroCall?: (message: string) => void
  intialPersonaId?: string | null
}

type ReactorPersonasHook = (props: ReactorPersonasHookOptions) => ReactorPersonasHookResult; 

const PERSONAS_QUERY = `
query GetReactorPersonas {
    ReactorPersonas {
      id
      name
      defaultGreeting
      description
      avatar          
      createdAt
      updatedAt
      macros {      
        name
        nameSpace
        version
        description
        icon
        runat
        alias
      }
      tools {        
        type        
        propsMap
        function {
          name
          icon
          description
          parameters 
        }
      }
    }
  }
`;
const usePersonas: ReactorPersonasHook = (props) => { 

  const { 
    reactory, 
    onMessage, 
    onError, 
    onToolCall, 
    onMacroCall,
    intialPersonaId = null,  
  } = props;

const [personas, setPersonas] = React.useState<IAIPersona[]>([]);
const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
const [loading, setLoading] = React.useState<boolean>(true);
const [error, setError] = React.useState<Error | null>(null);
const [activePersona, setActivePersona] = React.useState<IAIPersona | null>(null);
const navigate = useNavigate();
const [searchParams, setSearchParams] = useSearchParams();
const personaId = intialPersonaId || searchParams.get('personaId');

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
      if (personaId) {
        const persona = response.data.ReactorPersonas.find(p => p.id === personaId);
        if (persona) {
          setActivePersona(persona);
        }
      } 
      else {
        setActivePersona(response.data.ReactorPersonas[0]);
      }
    }
    reactory.log(`usePersonas: ${response?.data?.ReactorPersonas.length} personas loaded`, 'info');
    setLoading(false);
  } catch (err) { 
    setError(err); 
    setLoading(false);
  }
}

  const getPersona = (personaId: string): IAIPersona | undefined => {
    return personas.find(persona => persona.id === personaId);
  };

  // Fetch personas on mount

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
        // Note: Don't call setSearchParams here as it will cause loops
        // The URL management should be handled by the parent component
      }
    },
    activePersona,
    getPersona,
  }
};

export default usePersonas;
export { usePersonas, ReactorPersonasHookResult };