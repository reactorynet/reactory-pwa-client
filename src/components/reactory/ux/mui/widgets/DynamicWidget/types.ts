/**
 * Type definitions for DynamicWidget
 */
import type { SxProps, Theme } from '@mui/material';
import type Reactory from '@reactory/reactory-core';

/**
 * State returned by the component loader hook
 */
export interface ComponentLoaderState<T = React.ComponentType<any>> {
  /** The loaded component, null if not yet available */
  component: T | null;
  /** Whether the component is still loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Force a retry to load the component */
  retry: () => void;
}

/**
 * Options for DynamicWidget configuration via ui:options
 */
export interface DynamicWidgetOptions {
  /** Required: Fully qualified name of the component to mount (e.g., 'core.MyComponent@1.0.0') */
  componentFqn: string;
  
  /** Static props to pass directly to the component */
  componentProps?: Record<string, any>;
  
  /** Map form data/props to component props using objectMapper syntax */
  componentPropsMap?: Reactory.ObjectMap;
  
  /** FQN of a fallback component to use if the primary component fails to load */
  fallbackFqn?: string;
  
  /** Whether to show a loading indicator while component loads (default: true) */
  showLoading?: boolean;
  
  /** Custom loading message */
  loadingText?: string;
  
  /** Whether to show error messages when component fails to load (default: true) */
  showError?: boolean;
  
  /** Custom error message template (supports ${error} placeholder) */
  errorTemplate?: string;
  
  /** Timeout in ms before component loading is considered failed (default: 10000) */
  loadTimeout?: number;
  
  /** Container styling using MUI sx prop */
  containerSx?: SxProps<Theme>;
  
  /** Loading indicator styling */
  loadingSx?: SxProps<Theme>;
  
  /** Error message styling */
  errorSx?: SxProps<Theme>;
  
  /** Legacy container style prop (deprecated, use containerSx) */
  containerStyle?: React.CSSProperties;
  
  /** Pass form context to the mounted component */
  passFormContext?: boolean;
  
  /** Pass the full widget props to the mounted component */
  passWidgetProps?: boolean;
}

/**
 * Props for the DynamicWidget component
 */
export interface DynamicWidgetProps {
  /** Current form data value */
  formData?: any;
  
  /** Value change handler */
  onChange?: (value: any) => void;
  
  /** JSON schema definition */
  schema?: Reactory.Schema.AnySchema;
  
  /** UI schema configuration */
  uiSchema?: Reactory.Schema.IUISchema & {
    'ui:options'?: DynamicWidgetOptions;
  };
  
  /** ID schema for form field identification */
  idSchema?: Reactory.Schema.IDSchema;
  
  /** Form context from parent form */
  formContext?: Reactory.Client.IReactoryFormContext<any>;
  
  /** Read-only mode flag */
  readonly?: boolean;
  
  /** Disabled state flag */
  disabled?: boolean;
  
  /** Error schema for validation messages */
  errorSchema?: any;
  
  /** Reactory API instance (injected by withReactory) */
  reactory?: Reactory.Client.ReactorySDK;
  
  /** Additional class name */
  className?: string;
  
  /** Legacy style prop */
  style?: React.CSSProperties;
}
