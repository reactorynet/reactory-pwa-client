import { useState, useCallback, useEffect } from 'react';
import { 
  MacroComponentDefinitionRegistry, MacroComponentDefinition, MacrosHook, MacrosHookResults, MacrosHookProps, 
  Macro, ReactorToolCall, ReactorToolResult, ReactorToolError} from '../types';
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
        tool_calls { id type function { name arguments } status }
        tool_results { id name content timestamp }
        tool_errors { id name error timestamp }
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
    tool_calls?: ReactorToolCall[];
    tool_results?: ReactorToolResult[];
    tool_errors?: ReactorToolError[];
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
    onMacroCallError,
    onClientToolComplete,
    sessionLogger,
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
    sessionLogger?.debug(`Macro registered: ${macroKey}`, { alias: macro.alias, runat: macro.runat }, 'useMacros');
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


  const findMacroByName = useCallback((name: string): MacroComponentDefinition<unknown> | null => {            
    // check if the name includes a namespace, if not assume reactor-macros namespace
    if (name.indexOf('.') === -1) {
      name = `reactor-macros.${name}`;
    }
    if(name.indexOf('@') === -1) {
      name = `${name}@1.0.0`;
    }
    const macro = Object.values(macros).find(m => `${m.nameSpace}.${m.name}@${m.version}` === name);    
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

    sessionLogger?.debug(`Macro parsed: ${fullMacroName}`, { args, matchCount: matchingMacros.length }, 'useMacros');
    return { macro: matchingMacros[0], args };
         
  }, [macros]);

  const executeMacro = useCallback(async (macro: MacroComponentDefinition<unknown>, args?: any, calledBy?: string, callId?: string) => {
    if (!macro) {
      sessionLogger?.error('executeMacro called without macro argument', { calledBy, callId }, 'useMacros');
      if (onMacroCallError) {
        onMacroCallError(new Error(`Macro argument required`),null, chatState);
      }
      return;
    }

    if (macro) {
      const macroKey = `${macro.nameSpace}.${macro.name}@${macro.version}`;
      sessionLogger?.info(`Executing macro: ${macroKey}`, { runat: macro.runat, calledBy, callId }, 'useMacros');
      try {
        let result = null;
        if ((macro.runat === 'client' || macro.runat === null || macro.runat === undefined)) {
          // macro.component may already be the Macro function (when the definition comes from
          // findMacroByAlias / the local registry), or it may be absent (when a lightweight
          // descriptor arrives from the server via chatState.macros).  Handle both cases.
          let macroFunction: Macro<any> | undefined;
          if (typeof macro.component === 'function') {
            macroFunction = macro.component as Macro<any>;
          } else {
            const clientMacro = clientMacros.find(
              (m) => m.nameSpace === macro.nameSpace && m.name === macro.name && m.version === macro.version
            );
            macroFunction = clientMacro?.component as Macro<any> | undefined;
          }

          if (typeof macroFunction === 'function') {
            // the component is client side so we execute and 
            // return the results.
            result = await macroFunction(args, chatState, reactory);
          } else {
            result = "Client tool / macro not found"
          }
        } else {
          // sanity check the macro is flagged as server side
          if (macro.runat !== 'server') {
            throw new Error(`Macro ${macro.name} is not executable on the server`);
          }
          // Call the server-side macro
          if (!chatState.persona?.id) {
            throw new Error(`Cannot execute macro ${macro.name}: persona is not available. Please reload the chat session.`);
          }
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
        sessionLogger?.info(`Macro executed successfully: ${macroKey}`, { hasResult: !!result }, 'useMacros');
        if (onMacroCallResult) {
          // first check if the result has a valid tool result structure and
          // that it does not have null tool call results which indicates an error in the macro execution
          if (result && typeof result === 'object' && 'tool_results' in result && (!result.tool_calls || !result.tool_calls.some((call: ReactorToolCall) => call.status === 'error'))) {
            sessionLogger?.debug(`Macro execution result for ${macroKey} contains tool results`, { toolResultCount: result.tool_results.length }, 'useMacros');
          }
          onMacroCallResult(result, chatState);
        } else {
          reactory.log(`Macro executed: ${macro.name}`, result);
        }

        // Close the tool call loop for client-side macros that were invoked
        // as part of a tool call (callId present). This persists the result
        // on the server so the conversation history stays consistent and the
        // AI provider can see the tool output.
        const isClientSide = macro.runat === 'client' || macro.runat === null || macro.runat === undefined;
        if (isClientSide && callId && onClientToolComplete) {
          const toolName = macro.alias || macro.name;
          const resultContent = result?.content
            || (result != null ? (typeof result === 'string' ? result : JSON.stringify(result)) : null)
            || `Client tool "${toolName}" executed successfully (no content returned).`;
          sessionLogger?.info(`Completing client tool call loop: ${toolName} (callId: ${callId})`, {}, 'useMacros');
          onClientToolComplete([{
            toolCallId: callId,
            toolName,
            result: resultContent,
          }], false).catch((err) => {
            sessionLogger?.error(`Failed to complete client tool call: ${err?.message || String(err)}`, { callId, toolName }, 'useMacros');
          });
        }

        return result;
      } catch (error) {
        sessionLogger?.error(`Macro execution failed: ${macroKey}`, { error: error?.message || String(error) }, 'useMacros');
        reactory.error(`Error executing macro: ${macro.name}`, error);
        if (onMacroCallError) onMacroCallError(error, macro, chatState);

        // Report client-side tool errors to the server as well
        const isClientSide = macro.runat === 'client' || macro.runat === null || macro.runat === undefined;
        if (isClientSide && callId && onClientToolComplete) {
          const toolName = macro.alias || macro.name;
          onClientToolComplete([{
            toolCallId: callId,
            toolName,
            isError: true,
            error: error?.message || String(error),
          }], false).catch(() => {});
        }

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
  , [onMacroCallResult, onMacroCallError, onClientToolComplete, chatState?.persona?.id, chatState?.id]);
  
  // use effect to monitor changes on the chatState for macros
  useEffect(() => {
    
    
    if (chatState.macros) {
      // Create a combined array of macros, but ensure uniqueness.
      // IMPORTANT: clientMacros must come FIRST so their complete definitions
      // (with `component` and `tools` properties) win the deduplication.
      // Server-returned macros lack these client-only properties.
      const allMacros = [...clientMacros, ...chatState.macros];
      
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
    findMacroByName,    
    executeMacro,
    parseMacro,
  };
};

export default useMacros;
