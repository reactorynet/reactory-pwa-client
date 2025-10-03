
export interface ArrayTemplateState {
  formData: any[],
  isDirty: boolean
  expanded: boolean[],
  selected: boolean[],
  onChangeTimer: any
}

export interface ArrayTemplateProps<TData = Array<unknown>> {
  schema: Reactory.Schema.IArraySchema,
  uiSchema: Reactory.Schema.IUISchema,
  formContext: any,
  registry: {

  },
  formData?: TData
  idSchema: Reactory.Schema.IDSchema
  onChange: (formData: TData, errorSchema?: any) => void
  [key: string]: any
}

export interface ArrayFieldItemProps {
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  itemSchema: any;
  itemIdSchema: any;
  itemErrorSchema?: any;
  itemData: any;
  itemUiSchema?: any;
  autofocus?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  parentSchema: any;
  isDragging?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  rawErrors?: any;
  formContext?: any;
  dragProvided?: any;
  dragSnapshot?: any;
}

export type MaterialArrayFieldType = Reactory.Forms.ReactoryFieldComponent<any[]>;