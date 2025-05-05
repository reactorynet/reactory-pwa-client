import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

// @ts-ignore
const ComponentMacro: Macro<UXChatMessage> = (args, chatState, reactory) => { 

  const [fqn, props = {}] = args;

  if (!fqn) {
    reactory.error(`ComponentMacro: No component fqn provided`, args);
    return null;
  }

  if (typeof fqn !== 'string') {
    reactory.error(`ComponentMacro: Component fqn must be a string`, args);
    return null;
  }
  
  if (typeof props !== 'object') {
    reactory.error(`ComponentMacro: Component props must be an object`, args);
    return null;
  }

  const component = reactory.getComponent(fqn);
  if (!component) {
    reactory.error(`ComponentMacro: Component not found`, args);
    return null;
  }

  // ensure the component is a valid React component
  if (typeof component !== 'function') {
    reactory.error(`ComponentMacro: Component is not a valid React component`, args);
    return null;
  }

  return {
    __typename: "ReactorChatMessage",
    role: "user",
    content: 'Mounting component...',
    component: fqn,
    props,
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: []
  };
};


const ComponentMacroDefinition: MacroComponentDefinition<typeof ComponentMacro> = { 
  name: "ComponentMacro",
  nameSpace: "reactor-macros",
  description: "A macro that mounts a component with a given component fqn.",
  component: ComponentMacro,
  version: "1.0.0",
  roles: ['USER'],
  alias: 'component',
  runat: 'client',
};

export default ComponentMacroDefinition;
