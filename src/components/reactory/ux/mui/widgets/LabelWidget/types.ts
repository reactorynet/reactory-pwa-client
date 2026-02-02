/**
 * LabelWidget Type Definitions
 * 
 * Type definitions for the LabelWidget component and its sub-components.
 */
import type { SxProps, Theme, TypographyProps } from '@mui/material';
import type Reactory from '@reactory/reactory-core';

/**
 * Extended theme interface with custom icon extensions
 */
export interface ExtendedTheme extends Theme {
  extensions?: {
    [key: string]: {
      icons: {
        [key: string]: React.ComponentType<any>;
      };
    };
  };
}

/**
 * Icon position options
 */
export type IconPosition = 'left' | 'right' | 'inline';

/**
 * Typography variant options for the label
 */
export type LabelVariant = TypographyProps['variant'];

/**
 * Options for LabelWidget configuration via ui:options
 * Contains all available options for customizing LabelWidget behavior and appearance
 */
export interface LabelWidgetOptions {
  // === Text Formatting ===
  /** Format template string (lodash template syntax) */
  format?: string;
  /** Custom format function name in reactory.$func */
  $format?: string;
  /** Title/label text (can use template syntax) */
  title?: string;
  /** Text to show when value is empty */
  emptyText?: string;
  /** Whether to render labelText as HTML */
  renderHtml?: boolean;
  
  // === Boolean Display ===
  /** Label for true boolean values */
  yesLabel?: string;
  /** Label for false boolean values */
  noLabel?: string;
  /** Icon name for true boolean values */
  yesIcon?: string;
  /** Icon name for false boolean values */
  noIcon?: string;
  /** Icon options for true state */
  yesIconOptions?: IconStyleOptions;
  /** Icon options for false state */
  noIconOptions?: IconStyleOptions;
  
  // === Icon Configuration ===
  /** Icon name (Material icon or custom) */
  icon?: string;
  /** Custom icon type (references theme.extensions) */
  iconType?: string;
  /** Icon position relative to text */
  iconPosition?: IconPosition;
  /** Props passed to the icon component */
  iconProps?: { style?: React.CSSProperties; [key: string]: any };
  /** Dynamic icon props function name in reactory.$func */
  $iconProps?: string;
  
  // === Typography ===
  /** Typography variant for the label text */
  variant?: LabelVariant;
  
  // === Dynamic Component Mounting ===
  /** FQN of a component to mount instead of default label body */
  componentFqn?: string;
  /** Static props for the mounted component */
  componentProps?: Record<string, any>;
  /** Prop mapping from form data to component props */
  componentPropsMap?: Reactory.ObjectMap;
  
  // === Features ===
  /** Enable copy to clipboard button */
  copyToClipboard?: boolean;
  /** Force the MUI InputLabel to shrink (legacy behavior) */
  forceShrinkLabel?: boolean;
  
  // === Legacy Style Props (backward compatible) ===
  /** Legacy title/label style props */
  titleProps?: { style?: React.CSSProperties; [key: string]: any };
  /** Legacy body style props */
  bodyProps?: { style?: React.CSSProperties; [key: string]: any };
  /** Legacy container style props */
  containerProps?: { style?: React.CSSProperties; [key: string]: any };
  
  // === Modern Style Props (sx-based) ===
  /** Container sx styling */
  containerSx?: SxProps<Theme>;
  /** Label text sx styling */
  labelSx?: SxProps<Theme>;
  /** Value text sx styling */
  valueSx?: SxProps<Theme>;
  /** Icon sx styling */
  iconSx?: SxProps<Theme>;
  /** Copy button sx styling */
  copyButtonSx?: SxProps<Theme>;
  /** Loading indicator sx styling */
  loadingSx?: SxProps<Theme>;
}

/**
 * Icon style options for boolean icons
 */
export interface IconStyleOptions {
  sx?: SxProps<Theme>;
  color?: string;
  fontSize?: string | number;
}

/**
 * Props for the LabelWidget component
 */
export interface LabelWidgetProps {
  /** Current form data value */
  formData?: any;
  
  /** Alternative value prop */
  value?: any;
  
  /** Value change handler */
  onChange?: (value: any) => void;
  
  /** JSON schema definition */
  schema?: Reactory.Schema.AnySchema;
  
  /** UI schema configuration */
  uiSchema?: Reactory.Schema.IUISchema & {
    'ui:options'?: LabelWidgetOptions;
    'ui:graphql'?: Reactory.Forms.IReactoryFormQuery;
    'ui:title'?: string;
  };
  
  /** ID schema for form field identification */
  idSchema?: Reactory.Schema.IDSchema;
  
  /** Form context from parent form */
  formContext?: Reactory.Client.IReactoryFormContext<unknown>;
  
  /** Read-only mode flag */
  readonly?: boolean;
  
  /** Disabled state flag */
  disabled?: boolean;
  
  /** Error schema for validation messages */
  errorSchema?: any;
  
  /** Reactory API instance (injected by useReactory) */
  reactory?: Reactory.Client.ReactorySDK;
  
  /** Additional class name */
  className?: string;
  
  /** Legacy style prop */
  style?: React.CSSProperties;
  
  /** Legacy api prop (alias for reactory) */
  api?: Reactory.Client.ReactorySDK;
}

/**
 * Props for the LabelIcon sub-component
 */
export interface LabelIconProps {
  /** Icon name (Material icon name or template string) */
  icon?: string;
  /** Custom icon component from theme extensions */
  CustomIconComponent?: React.ComponentType<any>;
  /** Props to pass to the icon */
  iconProps?: Record<string, any>;
  /** Position of the icon */
  position: IconPosition;
  /** sx styling */
  sx?: SxProps<Theme>;
  /** Legacy style prop */
  style?: React.CSSProperties;
}

/**
 * Props for the LabelValue sub-component
 */
export interface LabelValueProps {
  /** Text content to display */
  text: string;
  /** Typography variant */
  variant?: LabelVariant;
  /** Whether to render as HTML */
  renderHtml?: boolean;
  /** Icon element for inline display */
  inlineIcon?: React.ReactNode;
  /** sx styling */
  sx?: SxProps<Theme>;
  /** Legacy style prop */
  style?: React.CSSProperties;
  /** Additional class name */
  className?: string;
}

/**
 * Props for the CopyButton sub-component
 */
export interface CopyButtonProps {
  /** Text to copy to clipboard */
  textToCopy: string;
  /** Callback when copy completes */
  onCopy?: (success: boolean) => void;
  /** sx styling */
  sx?: SxProps<Theme>;
  /** Legacy style prop */
  style?: React.CSSProperties;
  /** Tooltip text */
  tooltip?: string;
}

/**
 * Props for the BooleanIndicator sub-component
 */
export interface BooleanIndicatorProps {
  /** Boolean value to display */
  value: boolean;
  /** Label for true state */
  yesLabel?: string;
  /** Label for false state */
  noLabel?: string;
  /** Icon for true state */
  yesIcon?: string;
  /** Icon for false state */
  noIcon?: string;
  /** Style options for true state icon */
  yesIconOptions?: IconStyleOptions;
  /** Style options for false state icon */
  noIconOptions?: IconStyleOptions;
  /** Typography variant */
  variant?: LabelVariant;
  /** Icon position */
  iconPosition?: IconPosition;
  /** sx styling */
  sx?: SxProps<Theme>;
}
