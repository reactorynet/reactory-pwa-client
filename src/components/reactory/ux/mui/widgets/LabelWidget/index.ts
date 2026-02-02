/**
 * LabelWidget Exports
 * 
 * Exports both the legacy (v1) and modern (v2) LabelWidget implementations.
 * The default export is the legacy version for backward compatibility.
 * 
 * To use the new version:
 * import { LabelWidgetV2 } from './LabelWidget';
 */

// Legacy export (default) for backward compatibility
export { default } from './LabelWidget';

// Modern v2 exports - import then re-export for better compatibility
// eslint-disable-next-line import/export -- Explicit import/export needed for bundler compatibility
import { LabelWidget as LabelWidgetV2Component } from './LabelWidgetV2';
export const LabelWidgetV2 = LabelWidgetV2Component;
export { default as LabelWidgetModern } from './LabelWidgetV2';

// Type exports
export type { 
  LabelWidgetProps, 
  LabelWidgetOptions,
  LabelIconProps,
  LabelValueProps,
  CopyButtonProps,
  BooleanIndicatorProps,
  ExtendedTheme,
  IconPosition,
  LabelVariant,
} from './types';

// Sub-component exports (for composition)
export { 
  LabelIcon, 
  LabelValue, 
  CopyButton, 
  BooleanIndicator,
  LoadingIndicator,
  mergeStyles,
} from './components';

// Hook exports
export { useLabelFormat, useLabelLookup } from './hooks'; 