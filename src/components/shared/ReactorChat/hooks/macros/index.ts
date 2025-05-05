import LoginMacro from './login.macro';
import LogoutMacro from './logout.macro';
import FormMacro from './form.macro';
import ComponentMacro from './component.macro';
import GreetingMacro from './hello.macro';
import { MacroComponentDefinition } from '../../types';

const macros: MacroComponentDefinition<unknown>[] = [ 
  LoginMacro,
  LogoutMacro,
  GreetingMacro,
  FormMacro,
  ComponentMacro,
];

export default macros;