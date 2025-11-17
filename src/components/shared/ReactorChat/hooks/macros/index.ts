import LoginMacro from './login.macro';
import LogoutMacro from './logout.macro';
import FormMacro from './form.macro';
import ComponentMacro from './component.macro';
import GreetingMacro from './hello.macro';
import RuntimeMacro from './runtime.macro';
import ChartMacro from './chart.macro';
import D3Macro from './d3.macro';
import ImageMacro from './image.macro';
import { MacroComponentDefinition } from '../../types';


const macros: MacroComponentDefinition<unknown>[] = [ 
  LoginMacro,
  LogoutMacro,
  GreetingMacro,
  FormMacro,
  ComponentMacro,
  RuntimeMacro,
  ChartMacro,
  D3Macro,
  ImageMacro,
];

export default macros;