/**
 * SelectWidget Type Definitions
 *
 * Type definitions for the SelectWidget component.
 */
import type { SelectProps, FormControlProps } from '@mui/material';
import type Reactory from '@reactorynet/reactory-core';

/**
 * A single option entry rendered as a MenuItem in the select dropdown.
 * Value is constrained to types accepted by MUI's MenuItem.
 */
export interface SelectOption {
  /** Unique key for the menu item (falls back to index if omitted). */
  key?: string | number;
  /** The value submitted when this option is selected. */
  value: string | number | readonly string[];
  /** Display label for the option. */
  label: string;
  /** Optional Material UI icon name to render beside the label. */
  icon?: string;
  /** Optional props forwarded to the MUI <Icon> component. */
  iconProps?: Record<string, unknown>;
}

/**
 * Options accepted via `uiSchema['ui:options']` for SelectWidget.
 */
export interface SelectWidgetUIOptions {
  /** Array of options to render as menu items. */
  selectOptions?: SelectOption[];
  /** Whether the control is disabled. */
  disabled?: boolean;
  /** Whether the control is read-only (alias for disabled). */
  readonly?: boolean;
  /** Inline styles applied to the InputLabel. */
  labelStyle?: React.CSSProperties;
  /** Additional props forwarded directly to the MUI <Select> component. */
  selectProps?: Omit<SelectProps, 'value' | 'onChange' | 'name' | 'disabled' | 'renderValue' | 'variant'>;
  /** Override props for the wrapping MUI <FormControl> component. */
  FormControl?: {
    props?: Partial<FormControlProps>;
  };
}

/**
 * UI schema shape expected by SelectWidget.
 */
export interface SelectWidgetUISchema extends Reactory.Schema.IUISchema {
  /** Marks the control as disabled at the top-level ui schema. */
  disabled?: boolean;
  'ui:options'?: SelectWidgetUIOptions;
}

/**
 * Props for the SelectWidget component.
 *
 * Extends the standard Reactory widget prop contract so the widget
 * integrates with the ReactoryForm engine.
 */
export interface SelectWidgetProps
  extends Reactory.Client.IReactoryWidgetProps<
    string | number | null,
    unknown,
    Reactory.Schema.ISchema,
    SelectWidgetUISchema
  > {
  /** The currently selected value. */
  formData: string | number | null;
  /** Callback fired when the user selects a new value. Passes `null` when cleared. */
  onChange: (value: string | number | null) => void;
  /** The field name passed by the form engine. */
  name?: string;
  /** Whether a value is required (controls the "None" empty option). */
  required?: boolean;
  /** Error schema for this field. */
  errorSchema?: Reactory.Schema.IErrorSchema;
}
