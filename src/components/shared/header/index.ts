import DefaultHeader from './DefaultHeader';
import MinimalHeader from './MinimalHeader';
import MobileBottomHeader from './MobileBottomHeader';
import HeaderRegistry from './HeaderRegistry';
import HeaderResolver from './HeaderResolver';

// Register Headers
HeaderRegistry.register('default', DefaultHeader);
HeaderRegistry.register('minimal', MinimalHeader);
HeaderRegistry.register('mobile-bottom', MobileBottomHeader);

export * from './types';
export { default as HeaderRegistry } from './HeaderRegistry';
export { DefaultHeader };
export { MinimalHeader };
export { MobileBottomHeader };
export { HeaderResolver as ReactoryHeader };
export default HeaderResolver;