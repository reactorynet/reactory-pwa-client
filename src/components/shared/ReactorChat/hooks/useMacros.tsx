import { useState, useCallback, useEffect } from 'react';
import { 
  MacroComponentDefinitionRegistry, MacroComponentDefinition, MacrosHook, MacrosHookResults, MacrosHookProps, 
  Macro} from '../types';
import clientMacros from './macros'


const useMacros: MacrosHook = (props: MacrosHookProps): MacrosHookResults => {
  
  const { 
    reactory,
    chatState,
    onMacroCallResult,
    onMacroCallError   
  } = props;
  
  
  const createRegistry = (macros: MacroComponentDefinition<unknown>[]) => { 
    return macros.reduce((acc, macro) => {
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
      console.warn(`Macro not found: ${fullMacroName}`);
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

  const executeMacro = useCallback(async (macro: MacroComponentDefinition<unknown>, args?: any) => {
    if (!macro) {
      if (onMacroCallError) {
        onMacroCallError(new Error(`Macro argument required`),null, chatState);
      }
      return;
    }

    if (macro && macro.component) {
      try {
        const macroFunction = macro.component as Macro<any>;
        const result = await macroFunction(args, chatState, reactory);
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

  useEffect(() => { 
    // Register initial macros
    let personaMacros = chatState.persona?.macros || [];
    const initialMacros = createRegistry([...personaMacros, ...clientMacros]);
    setMacros(initialMacros);
  }, [chatState.persona])

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
    executeMacro,
    parseMacro,
  };
};

export default useMacros;
