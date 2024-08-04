import React from 'react';
import Reactory from '@reactory/reactory-core';
import { useNavigate } from 'react-router';

const formSchema: Reactory.Schema.IArraySchema = {
  type: 'array',
  title: 'Forms',
  items: {
    type: 'object',
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
      },
      userCount: {
        type: 'number',
        title: 'Active users'
      },
      description: {
        type: 'string',
        title: 'Description'
      }
    }
  }
}

const schema = {
  type: 'object',
  title: 'Reactory Forms',
  properties: {     
    forms: { ...formSchema } 
  }
};

const uiSchema = {
  'ui:title': null,  
  forms: {
    'ui:widget': 'MaterialListWidget',
    'ui:title': null,
    'ui:options': {
      primaryText: '${item.title}',
      secondaryText: '${item.description} [${item.nameSpace}.${item.name}@${item.version}]',      
      showAvatar: false,
      showTitle: true,
      showLabel: false,
      // avatar: (item, formContext) => {
      //   const { reactory } = formContext;
      //   if (item.event.organization && item.event.organization.avatar) {
      //     return reactory.getCDNResource(`organization/${item.event.organization.id}/${item.event.organization.avatar}`)
      //   }

      //   return null;
      // },
      // avatarAlt: (item) => {
      //   // reactory.log(`Getting avatar alt for item`, { item });
      //   if (item.event.organization && item.event.organization.avatar) {
      //     return item.event.organization.name
      //   }

      //   return null;
      // },
      //avatarPosition: "left",
      secondaryAction: {
        component: (item, formContext, itemIndex, data) => {
          const { id, name, nameSpace, version } = item;
          
          const { reactory } = formContext;

          const [showModal, setShowModal] = React.useState<boolean>(false);
          const [action, setAction] = React.useState<string>(null);

          const navigate = useNavigate();

          const {
            DropDownMenu,
            AlertDialog,
            FullScreenModal,
            ReactoryFormEditor,
            MaterialCore,            
          } = reactory.getComponents([
            "core.DropDownMenu",
            'core.AlertDialog',
            'core.FullScreenModal',
            'core.ReactoryFormEditor',
            'material-ui.MaterialCore'
          ]);

          const {
            Tooltip
          } = MaterialCore

          const onMenuSelect = (evt, menu) => {
            //do the thing
            // setAction(menu.id);
            // setShowModal(true);            
            navigate(`${item.id}/${menu.id}`, {});            
          }

          const menus = [
            {
              id: 'edit',
              icon: 'edit',
              title: 'Edit',              
            },
            {
              id: 'view',
              icon: 'launch',
              title: 'Open',
            },
            {
              id: 'new',
              icon: 'add',
              title: "New"
            },
            {
              id: 'develop',
              icon: 'developer_mode',
              title: "Develop"
            }
          ];

          return <DropDownMenu menus={menus} onSelect={onMenuSelect} />         
        }
      },
      remoteData: false,
      
      title: 'Reactory Forms',
      titleClass: 'title',
      jss: {
        root: {
          display: 'flex',
          flexDirection: 'column',
        },
        title: {
          fontSize: '20px',
          fontWeight: 'bold',
          textAlign: 'center',
        },
        list: {
          minWidth: '70%',          
          margin: 'auto',
          maxHeight: '80%',
          minHeight: '80%',
        }
      }
    }
  },
}

/**
 * 
 * 
 * 
 * 
 * 
 */
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
  schema: schema,
  uiSchema: uiSchema,
  uiSchemas: [{
    id: 'list',
    icon: 'list',
    title: 'List',
    uiSchema: uiSchema,
    description: 'List view',
    key: 'list'
  },
    {
      id: 'def',
      icon: 'grid',
      title: 'Grid',
      uiSchema: {},
      description: 'Empty ui Schema',
      key: 'def'
    }
],
  registerAsComponent: true
};

export default ReactoryFormList;