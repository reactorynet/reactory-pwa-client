import { useState, useCallback, useEffect } from 'react';
import { 
  MacroComponentDefinitionRegistry, MacroComponentDefinition, MacrosHook, MacrosHookResults, MacrosHookProps, 
  Macro} from '../types';
import clientMacros from './macros'


const EXECUTE_MACRO_MUTATION = `
  mutation ExecuteReactorMacro($macro: String!, $personaId: String!, $chatSessionId: String!,$calledBy: String, $callId: String, $args: Any) {
    ReactorExecuteMacro(macroInput: {
      macro: $macro,
      personaId: $personaId,
      chatSessionId: $chatSessionId,
      calledBy: $calledBy,
      callId: $callId,
      args: $args
    }) {
      ... on ReactorChatMessage {
        id
        role
        content
        audio
        annotations
        images
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

// type definition for the mutation response
export interface ExecuteMacroResponse {
  ReactorExecuteMacro: {
    id: string;
    role: string;
    content: string;
    audio?: string;
    annotations?: any[];
    images?: any[];
    rating: number;
    timestamp: Date;
    tool_calls?: any[];
  } | {
    sessionId: string;
    endpoint: string;
    token: string;
    status: string;
    expiry: Date;
    headers: Record<string, string>;
  } | {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    recoverable?: boolean;
    suggestion?: string;
  };
}

const useMacros: MacrosHook = (props: MacrosHookProps): MacrosHookResults => {
  
  const { 
    reactory,
    chatState,
    onMacroCallResult,
    onMacroCallError   
  } = props;
  
  
  const createRegistry = (macros: MacroComponentDefinition<unknown>[]) => { 
    console.log('🔧 [useMacros] createRegistry called with macros:', macros.length);
    
    
    return macros.reduce((acc, macro) => {    
      
      if(macro.roles && macro.roles.length > 0) { 
        // check if the user has a role that matches the macro
        const userRoles = reactory.getUser().loggedIn.roles || ['ANON'];                
        if (!macro.roles.some(role => userRoles.includes(role))) {
          reactory.warning(`Macro ${macro.name} is not accessible for user roles: ${userRoles.join(', ')}`);          
          return acc; // Skip adding this macro if roles do not match
        }
      }
      
      const macroKey = `${macro.nameSpace}.${macro.name}@${macro.version}`;
      
      
      acc[macroKey] = macro;
      if (macro.alias) {
        // If an alias is provided, add it to the registry
        // and remove the original macro key
        delete acc[macroKey];
        acc[macro.alias] = macro;
      }
            
      return acc;
    }, {} as MacroComponentDefinitionRegistry);
  };



  // Initialize state with an empty object of macro definitions
  const [macros, setMacros] = useState<MacroComponentDefinitionRegistry>(createRegistry(clientMacros));

  // Debug user roles
  const userRoles = reactory.getUser().loggedIn.roles || ['ANON'];
  console.log('🔧 [useMacros] Current user roles:', userRoles);
  console.log('🔧 [useMacros] User logged in:', reactory.getUser().loggedIn);

  // Function to register a new macro
  const registerMacro = useCallback((macro: MacroComponentDefinition<unknown>) => {
    let nextMacros = { ...macros };
    const macroKey = `${macro.nameSpace}.${macro.name}@${macro.version}`;
    if (macro.alias) {
      nextMacros[macro.alias] = macro;
    }
    nextMacros[macroKey] = macro;
    setMacros(nextMacros);
  }, []);

  // Function to register multiple macros at once
  const registerMacros = useCallback((newMacros: MacroComponentDefinition<unknown>[]) => {
    const macrosToAdd = createRegistry(newMacros);
    setMacros(prevMacros => ({
      ...prevMacros,
      ...macrosToAdd
    }));
  }, []);

  const findMacroByAlias = useCallback((alias: string): MacroComponentDefinition<unknown> | null => {            
    const macro = Object.values(macros).find(m => m.alias === alias);    
    return macro || null;
  }, [macros]);


  // Process function to handle a macro string
  const parseMacro = useCallback((macro: string) => {
    if (!macro) return null;
    
    // Check if the macro has the format @macroName(arg1, arg2)
    const macroRegex = /@([^(]+)(?:\(([^)]*)\))?/;
    const match = macro.match(macroRegex);
    
    if (!match) {
      console.warn(`Invalid macro format: ${macro}`);
      return null;
    }
    
    const fullMacroName = match[1];
    const argsStr = match[2] || '';
    
    // Parse arguments - split by comma but respect quoted strings
    const args = argsStr.length > 0 ? 
      argsStr.match(/(?:[^\s,"]|"(?:\\.|[^"])*")+/g)?.map(arg => {
        // Remove quotes from quoted strings
        return arg.startsWith('"') && arg.endsWith('"') ? 
          arg.slice(1, -1).replace(/\\"/g, '"') : arg;
      }) || [] : [];
    
    // Split the full macro name to get namespace, name and version (if provided)
    // Example: "nameSpace.macroName@version" or "nameSpace.macroName"
    // or "macroName" (core namespace)
    let matchingMacros: MacroComponentDefinition<unknown>[] = [];
    if (fullMacroName.indexOf(('.')) == -1) { 
      // use the alias to find the macro
      matchingMacros = Object.values(macros).filter(m => m.alias === fullMacroName);
    } else {
      let [nameSpace, macroName] = fullMacroName.split('.');      
      let version = null;
      if (macroName.indexOf('@') > -1) { 
        macroName = macroName.split('@')[0];
        version = macroName.split('@')[1];
      }

      if (version) { 
        matchingMacros = Object.values(macros).filter(m => m.nameSpace === nameSpace && m.name === macroName && m.version === version);
      } else {
        matchingMacros = Object.values(macros).filter(m => m.nameSpace === nameSpace && m.name === macroName);
      }      
    }

    if (matchingMacros.length === 0) {
      reactory.warning(`Macro not found: ${fullMacroName}`);
      return null;
    }
    if (matchingMacros.length > 1) {
      // sort by version
      matchingMacros = matchingMacros.sort((a, b) => { 
        if (a.version > b.version) {
          return -1;
        } else if (a.version < b.version) {
          return 1;
        } else {
          return 0;
        }        
      });  
    }

    return { macro: matchingMacros[0], args };
         
  }, [macros]);

  const executeMacro = useCallback(async (macro: MacroComponentDefinition<unknown>, args?: any, calledBy?: string, callId?: string) => {
    if (!macro) {
      if (onMacroCallError) {
        onMacroCallError(new Error(`Macro argument required`),null, chatState);
      }
      return;
    }

    if (macro) {
      try {
        let result = null;
        if (macro.component && (macro.runat === 'client' || macro.runat === null || macro.runat === undefined)) {
          const macroFunction = macro.component as Macro<any>;
          // the component is client side so we execute and 
          // return the results.
          result = await macroFunction(args, chatState, reactory);
        } else {
          // sanity check the macro is flagged as server side
          if (macro.runat !== 'server') {
            throw new Error(`Macro ${macro.name} is not executable on the server`);
          }
          // Call the server-side macro
          const response = await reactory.graphqlMutation< 
            ExecuteMacroResponse , { 
            macro: string;
            args: any;
            personaId: string;
            calledBy?: string;
            callId?: string;
            chatSessionId: string;
          }>(EXECUTE_MACRO_MUTATION, {
            macro: macro.name,
            args,
            personaId: chatState.persona.id,
            chatSessionId: chatState.id,
            calledBy,
            callId 
          });
          if (response?.data) {
            result = response.data.ReactorExecuteMacro;
          } else {
            throw new Error(`Error executing macro: ${macro.name}`);
          } 
        }
        if (onMacroCallResult) {
          onMacroCallResult(result, chatState);
        } else {
          reactory.log(`Macro executed: ${macro.name}`, result);
        }
        return result;
      } catch (error) {
        reactory.error(`Error executing macro: ${macro.name}`, error);
        if (onMacroCallError) onMacroCallError(error, macro, chatState);
        return null;
      }
    } else {
      reactory.warning(`Macro not executable: ${macro.name}`);
      if (onMacroCallError) { 
        onMacroCallError(new Error(`Macro not executable: ${macro.name}`), macro, chatState);
      };
      return null;
    }
  }
  , [onMacroCallResult, onMacroCallError]);
  
  // use effect to monitor changes on the chatState for macros
  useEffect(() => {
    
    
    if (chatState.macros) {
      // Create a combined array of macros, but ensure uniqueness
      const allMacros = [...chatState.macros, ...clientMacros];
      
      // Deduplicate macros by nameSpace.name@version or alias
      const uniqueMacros = allMacros.filter((macro, index, self) => {
        if (macro === null || macro === undefined) {
          reactory.warning(`Invalid macro found in chatState: ${macro}`);
          return false; // Skip null or undefined macros
        }
        if (!macro.nameSpace || !macro.name || !macro.version) {
          reactory.warning(`Macro ${macro.name} is missing required fields: nameSpace, name, or version`);
          return false; // Skip invalid macros
        }
        const macroKey = `${macro.nameSpace}.${macro.name}@${macro.version}`;
        const aliasKey = macro.alias;
        
        // Find first occurrence of this macro
        const firstIndex = self.findIndex(m => {
          if (m === null || m === undefined) {
            reactory.warning(`Invalid macro found in self: ${m}`);
            return false; // Skip null or undefined macros
          }
          if (!m.nameSpace || !m.name || !m.version) {
            reactory.warning(`Macro ${m.name} is missing required fields: nameSpace, name, or version`);
            return false; // Skip invalid macros
          }
          const mKey = `${m.nameSpace}.${m.name}@${m.version}`;
          return mKey === macroKey || (aliasKey && m.alias === aliasKey);
        });
        
        return index === firstIndex;
      });
      
      
      const newMacros = createRegistry(uniqueMacros);      
      
      setMacros(prevMacros => {
        const updatedMacros = {
          ...prevMacros,
          ...newMacros
        };        
        return updatedMacros;
      });
    }
  }
  , [chatState?.macros]);

  // Return all the functions and data
  return {
    macros: Object.values(macros),
    addMacro: registerMacro,
    removeMacro: (macro) => {
      const macroKey = `${macro.nameSpace}:${macro.name}:${macro.version}`;
      setMacros(prevMacros => {
        const { [macroKey]: _, ...rest } = prevMacros;
        return rest;
      });
    },
    updateMacro: registerMacro,
    getMacroById: (id) => macros[id],
    findMacroByAlias,    
    executeMacro,
    parseMacro,
  };
};

export default useMacros;
