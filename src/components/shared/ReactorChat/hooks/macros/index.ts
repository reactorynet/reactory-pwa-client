import LoginMacro from './login.macro';
import LogoutMacro from './logout.macro';
import FormMacro from './form.macro';
import ComponentMacro from './component.macro';
import RuntimeMacro from './runtime.macro';
import ChartMacro from './chart.macro';
import D3Macro from './d3.macro';
import ImageMacro from './image.macro';
import SidePanelStateMacro from './sidePanelState.macro';
import AmqMacro from './amq.macro';
import GraphPerspectiveMacro from './graphPerspective.macro';
import { HostFieldsMacroDefinition, HostFieldUpdateMacroDefinition } from './hostField.macro';
import { MacroComponentDefinition } from '../../types';


const macros: MacroComponentDefinition<unknown>[] = [
  LoginMacro,
  LogoutMacro,
  FormMacro,
  ComponentMacro,
  RuntimeMacro,
  ChartMacro,
  D3Macro,
  ImageMacro,
  SidePanelStateMacro,
  AmqMacro,
  GraphPerspectiveMacro,
  // Let the agent read and write the fields of whatever host component the
  // chat is embedded in. Inert unless the host supplies bindings.
  HostFieldsMacroDefinition,
  HostFieldUpdateMacroDefinition,
];

export default macros;
