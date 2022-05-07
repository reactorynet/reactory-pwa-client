import Reactory from '@reactory/reactory-core';

const schema = {
  type: 'object',
  title: 'Reactory Forms',
  properties: {
    recent: {
      type: 'array',
      title: 'Recent',
      items: {
        properties: {
          id: {
            type: 'string',
            title: 'Recent'
          },
        }
      }
    },
    forms: {
      type: 'array',
      title: 'Reactory Forms',
      items: {
        properties: {
          id: {
            type: 'string',
            title: 'Form Id'
          },
          name: {
            type: 'string',
            title: 'Form Name',
          },
          nameSpace: {
            type: 'string',
            title: 'Version Name',
          },
          version: {
            type: 'string',
            title: 'Version'
          }
        }
      }
    }
  }
};


const uiSchema = {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      forms: { xs: 12, lg: 12 }
    }
  ],
  forms: {
    title: 'Reactory Forms',
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Form Id',
          field: 'id',
          component: 'core.Link@1.0.0',
          props: {
            link: '${formContext.routePrefix}\/${rowData.name}\/',
            uiSchema: {
              'ui:options': {
                format: '${formContext.routePrefix}\/${rowData.name}\/',
                title: '${rowData.nameSpace}.${rowData.name}@${rowData.version}',
                userouter: false,
              },
            },
          },
        },
        { title: 'Name', field: 'name' },
        { title: 'NameSpace', field: 'nameSpace', defaultGroupOrder: 0 },
        { title: 'version', field: 'version' },
      ],
      options: {
        grouping: true,
      },
      actions: [{
        icon: 'add',
        tooltip: 'ADD NEW FORM',
        iconProps: {
          color: 'success'
        },
        variables: {
          'selected': 'newClient.organization',
        },
        isFreeAction: true,
        event: {
          name: 'onNewFormClicked',
          via: 'form',
        }
      },],
      title: 'Reactory Forms',
    },
  },
};


const ReactoryFormList: Reactory.Forms.IReactoryForm = {
  id: 'ReactoryFormList',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Available Forms',
  tags: ['reactory forms', 'forms'],
  name: 'ReactoryFormList',
  nameSpace: 'core',
  version: '1.0.0',
  description: 'Provides a list of forms available to your user account.',
  author: {
    fullName: 'Werner Weber',
    email: 'werner.weber@gmail.com',
  },
  helpTopics: [
    'ReactoryFormList',
  ],
  schema,
  uiSchema,
  registerAsComponent: true
};

export default ReactoryFormList;