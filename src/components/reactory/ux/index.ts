import Reactory from '@reactory/reactory-core';
// import MaterialPackage from './mui';

interface IReactoryUxPackage {
  fields: {
    ArrayField: Reactory.Client.AnyValidComponent
    BooleanField: Reactory.Client.AnyValidComponent
    DescriptionField: Reactory.Client.AnyValidComponent
    NumberField: Reactory.Client.AnyValidComponent
    ObjectField: Reactory.Client.AnyValidComponent
    SchemaField: Reactory.Client.AnyValidComponent
    StringField: Reactory.Client.AnyValidComponent
    TitleField: Reactory.Client.AnyValidComponent
    GridLayout: Reactory.Client.AnyValidComponent
    TabbedLayout: Reactory.Client.AnyValidComponent
    UnsupportedField: Reactory.Client.AnyValidComponent
    [key: string]: Reactory.Client.AnyValidComponent
  },
  widgets?: {
    [key: string]: Reactory.Client.AnyValidComponent
  },
  templates?: {
    ArrayFieldTemplate: Reactory.Client.AnyValidComponent
    DateFieldTemplate: Reactory.Client.AnyValidComponent
    FieldTemplate: Reactory.Client.AnyValidComponent
    FormErrorList: Reactory.Client.AnyValidComponent
    ObjectTemplate: Reactory.Client.AnyValidComponent    
    [key: string]: Reactory.Client.AnyValidComponent
  }
}

interface IReactoryUxPackages {
  [key: string]: IReactoryUxPackage
}

const ReactoryUxPackages: IReactoryUxPackages = {
  //@ts-ignore
  // "material": MaterialPackage
}

export default ReactoryUxPackages;