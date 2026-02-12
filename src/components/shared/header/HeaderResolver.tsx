import React from 'react';
import HeaderRegistry from './HeaderRegistry';
import { HeaderProps } from './types';

export interface HeaderResolverProps extends HeaderProps {
    headerKey?: string;
}

const HeaderResolver: React.FC<HeaderResolverProps> = (props) => {
   const { headerKey = 'default', ...otherProps } = props;
   
   let Component = HeaderRegistry.get(headerKey);
   
   if (!Component) {
       // console.warn(`Header type '${headerKey}' not found. Falling back to 'default'.`);
       Component = HeaderRegistry.get('default');
   }
   
   if (!Component) {
       return null; 
   }
   
   return <Component {...otherProps} />;
}

export default HeaderResolver;
