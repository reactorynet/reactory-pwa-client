import Reactory from '@reactory/reactory-core';
export type ReactoryFormUtilities = {
  ADDITIONAL_PROPERTY_FLAG: string;
  allowAdditionalItems: (schema: Reactory.Schema.ISchema) => boolean;
  getDefaultRegistry: () => Reactory.Forms.IReactoryFormUtilitiesRegistry;
  getSchemaType: (schema: any) => string;
  getWidget: (
    schema: any,
    widget: any,
    registeredWidgets?: any
  ) => React.ComponentType<any>;
  getDefaultFormState: (
    schema: any,
    formData: any,
    definitions?: any
  ) => any;
  getUiOptions: (uiSchema: any) => any;
  isObject: (thing: any) => boolean;
  mergeObjects: (
    obj1: any,
    obj2: any,
    concatArrays?: boolean
  ) => any;
  asNumber: (value: any) => number | string | undefined;
  orderProperties: (properties: string[], order: string[]) => string[];
  isConstant: (schema: any) => boolean;
  toConstant: (schema: any) => any;
  isSelect: (schema: any, definitions?: any) => boolean;
  isMultiSelect: (schema: any, definitions?: any) => boolean;
  isFilesArray: (schema: any, uiSchema: any, definitions?: any) => boolean;
  isFixedItems: (schema: Reactory.Schema.IArraySchema) => boolean;
  optionsList: (schema: Reactory.Schema.AnySchema) => any;
  retrieveSchema: (schema: Reactory.Schema.ISchema, definitions?: any, formData?:any) => Reactory.Schema.ISchema;
  toIdSchema: (schema: Reactory.Schema.ISchema, prefix: string, definitions: any, formData, idPrefix: string) => any;
};