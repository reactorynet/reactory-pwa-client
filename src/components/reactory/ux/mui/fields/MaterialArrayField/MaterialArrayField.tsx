import React, { Fragment } from 'react';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';
import {
  Card,
  Grid,
  Paper,
} from '@mui/material'

import MaterialDefaultArrayField from './MaterialDefaultArrayField';

import {
  Div,
  Section,
  Article,
  Paragraph
} from '@reactory/client-core/components/reactory/ux/mui/fields/HtmlContainers'

const DEFAULT_OPTIONS: Reactory.Schema.IUISchemaOptions = {
  container: 'Paper',
  showTitle: true,
  showDescription: true,
};

interface ArrayTemplateState {
  formData: any[],
  isDirty: boolean
  expanded: boolean[],
  selected: boolean[],
  onChangeTimer: any
}

interface ArrayTemplateProps<TData = Array<unknown>> {
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

const MaterialArrayField: React.FC<ArrayTemplateProps> = (props) => {
  const {
    canAdd,
    className,
    disabled,
    idSchema,
    items,
    onAddClick,
    readonly,
    required,
    schema,
    uiSchema,
    title,
    description,
    formContext,
    formData,
    errorSchema,
    autofocus,
    onBlur,
    onFocus,
    idPrefix,
    onChange,
  } = props;

  const reactory = useReactory();  
  const uiOptions: Reactory.Schema.IUISchemaOptions | null = (uiSchema['ui:options'] as Reactory.Schema.IUISchemaOptions) || DEFAULT_OPTIONS
  const uiWidget: string | null = uiSchema['ui:widget'] || null;
  const utils = reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');
  const registry = utils.getDefaultRegistry();
  const {
    TitleField,
    DescriptionField,
    UnsupportedField
  } = registry.fields;
  if (!schema.hasOwnProperty("items")) {
    return (
      <UnsupportedField
        schema={schema}
        idSchema={idSchema}
        reason={reactory.i18n.t('reactory:reactory-core.form.errors.schema.missingItemsSchema', {
          defaultValue: `Missing items key in schema for array field ${idSchema.$id}`
        })}
      />
    );
  }

  let Container: React.ComponentType<any> = null;
  let ArrayComponent: React.ComponentType<any> = null;
  let ArrayElementComponent: React.ComponentType<any> = null;

  const { container = 'none' } = uiSchema['ui:options'] as Reactory.Schema.IUISchemaOptions || DEFAULT_OPTIONS;
  const definitions = registry.definitions;


  let arrayComponentProps: any = {};
  if (uiWidget !== null) {
    if (!ArrayComponent && uiWidget.indexOf('.') > 0) {
      ArrayComponent = reactory.getComponent(uiWidget);
    } else {
      if (registry.widgets[uiWidget]) ArrayComponent = registry.widgets[uiWidget]
    }

    if (uiOptions && uiOptions.componentProps) {  //map properties to the component
      Object.keys(arrayComponentProps).map(property => {
        arrayComponentProps[property] = formData[uiOptions.componentProps[property]]
      })
    }
  }

  const resolveField = (field: string | Reactory.FQN): React.ComponentType<any> => {
    if (typeof field === 'string') {
      if (field.indexOf('.') > 0 && reactory.getComponent(field)) {
        return reactory.getComponent(field);
      } else {
        if (registry.fields[field]) {
          return registry.fields[field];
        } else if (registry.widgets[field]) {
          return registry.widgets[field];
        }
      }
    }

    return null;
  }

  if (ArrayComponent === null) {
    // Create the default ArrayComponent if there is none
    ArrayComponent = MaterialDefaultArrayField;
  }

  switch (container) {
    case 'Fragment': {
      Container = Fragment;
      break;
    }
    case 'Grid': {
      Container = Grid;
      break;
    }
    case 'Paper': {
      Container = Paper;
      break;
    }
    case 'Card': {
      Container = Card;
      break;
    }
    case 'div': {
      Container = Div;
      break;
    }
    case 'section': {
      Container = Section;
      break;
    }
    case 'article': {
      Container = Article;
      break;
    }
    case 'p': {
      Container = Paragraph;
      break;
    }
    default: {
      if ((container as string).indexOf('.') > 0) {
        Container = reactory.getComponent(container as string);
      }
      break;
    }
  }

  if (!Container) Container = Paper;

  let containerProps = {}
  // @ts-ignore
  return (
    <Container {...containerProps}>
      <ArrayComponent 
        {...props}
      />
    </Container>
  );
};

export default MaterialArrayField;