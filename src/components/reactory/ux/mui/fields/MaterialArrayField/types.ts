
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

export type MaterialArrayFieldType = Reactory.Forms.ReactoryFieldComponent<any[]>;