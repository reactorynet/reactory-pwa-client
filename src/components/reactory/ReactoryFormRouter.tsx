
import React from 'react';
import { Route, Routes, useParams, useNavigate } from 'react-router-dom';
import { withTheme } from '@mui/styles';
import { compose } from 'redux';
import { useReactory, withReactory } from '../../api/ApiProvider';

import ReactoryFormListDefinition from './formDefinitions/ReactoryFormList';
import ReactoryNewFormInput from './formDefinitions/ReactoryNewFormInput';
import { ReactoryForm } from './ReactoryFormComponent';

const RouteBoundForm = (props) => {
  const { formId, mode, id } = useParams<any>();

  return <ReactoryForm
          formId={formId || props.formId || 'ReactoryFormList'} 
          mode={mode || props.mode || 'view'} 
          formData={{ id }} />
}


const ReactoryFormRouter = (props) => {

  const reactory = useReactory();

  const { match, routePrefix } = props;
  const [version, setVersion] = React.useState<number>(0);
  const [newFormModalVisible, setNewFormModalVisible] = React.useState(false);

  const navigate = useNavigate();

  const {
    AlertDialog,
    MaterialCore,
  } = reactory.getComponents(['core.AlertDialog', 'material-ui.MaterialCore',]);

  const {
    Tooltip
  } = MaterialCore

  reactory.log('ReactoryFormRouter:render', { props: props }, 'debug');

  const all_forms = reactory.getComponentsByType('form');

  const user = reactory.getUser();

  const uiSchema = {
    'ui:field': 'GridLayout',
    'ui:options': {},
    'ui:grid-layout': [
      {
        forms: { xs: 12, lg: 12 }
      }
    ],
    forms: {
      'ui:widget': 'MaterialListWidget',
      'ui:options': {
        primaryText: '${item.event.title} ${item.event.eventType}',
        secondaryText: 'Starts: ${props.reactory.utils.moment(item.event.startDate).format("DD MMM YYYY")} Ends: ${props.reactory.utils.moment(item.event.endDate).format("DD MMM YYYY")}',
        showAvatar: true,
        avatar: (item, formContext) => {
          const { reactory } = formContext;
          if (item.event.organization && item.event.organization.avatar) {
            return reactory.getCDNResource(`organization/${item.event.organization.id}/${item.event.organization.avatar}`)
          }

          return null;
        },
        avatarAlt: (item) => {
          reactory.log(`Getting avatar alt for item`, { item }, 'debug');
          if (item.event.organization && item.event.organization.avatar) {
            return item.event.organization.name
          }

          return null;
        },
        avatarPosition: "left",
        secondaryAction: {
          component: (item, formContext, itemIndex, data) => {
            const { event, link, user, checkedIn, checkedOut, eventLinkActivated } = item;
            const { options } = event;
            const { reactory } = formContext;
            const {
              DropDownMenu,          
            } = reactory.getComponents([
              "core.DropDownMenu",
            ]);

            const onMenuSelect = (menu) => {

            }

            const menus = [
              {
                id: 'edit',
                icon: 'pencil',
                title: 'Edit',
              },
              {
                id: 'view',
                icon: 'open',
                title: 'Open'
              },
              {
                id: 'copy',
                icon: 'copy',
                title: 'Copy'
              }
            ];

            return (
              <Tooltip title={'Use the drop down to perform additional functions'} >
                <DropDownMenu menus={menus} onSelect={onMenuSelect}/>
              </Tooltip>
            )

          }
        },
        remoteData: false,
        // query: 'events',
        // variables: {
        //   'formContext.formData.events.$one_on_one': 'eventTypes[0]',
        //   'formContext.formData.events.$focus_group': 'eventTypes[1]',
        //   'paging.page': 'paging.page',
        //   'paging.pageSize': 'paging.pageSize'
        // },
        // resultKey: 'events',
        listProps: {
          className: "list"
        },
        pagination: {
          pageSize: 1,
          variant: "page",
          resultMap: {
            'paging.page': 'page',
            'paging.pageSize': 'pageSize',
            'paging.hasNext': 'hasNext',
            'paging.total': 'total'
          }
        },
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
            maxWidth: '800px',
            margin: 'auto',
            maxHeight: '80%',
            minHeight: '80%',
            overflowY: 'scroll',

          }
        }
      }
    },
  };

  const $formDef = {
    ...ReactoryFormListDefinition,
  }

  /**
   *  <AlertDialog
      open={newFormModalVisible === true}
      onClose={() => { setNewFormModalVisible(false) }}
      title={'ADD NEW FORM'}
    >
      <ReactoryForm formDef={ReactoryNewFormInput} onSubmit={({ formData }) => {
        //save the form definition to localStorage and bump on the forms list with a basic schema.
        const formId = `${formData.nameSpace}.${formData.name}@${formData.version}`
        const formDef = {
          id: formId,
          name: formData.name,
          nameSpace: formData.nameSpace,
          version: '1.0.0',
          local: true,
          uiFramework: 'material',
          uiSupport: ['material'],
          uiResources: [],
          tags: [],
          roles: [],
          author: {
            fullName: `${user.loggedIn.user.firstName} ${user.loggedIn.user.lastName}`,
            email: `${user.loggedIn.user.email}`,
          },
          helpTopics: [
            'ReactoryFormList',
          ],
          schema: {
            type: 'string',
            title: formData.name,
            defaultValue: ''
          },
          defaultFormValue: 'Hallo form',
          uiSchema: {

          }
        }
        reactory.formSchemas.push(formDef);

        const component = ($props) => {

          const $children = $props.children || null;

          if ($children) {
            delete $props.children;
          }

          return (
            <ReactoryForm
              formId={formDef.id}
              key={formDef.id}
              onSubmit={$props.onSubmit}
              onChange={$props.onChange}
              formData={formDef.defaultFormValue || $props.formData || $props.data}
              before={$props.before}
              {...$props}
            >
              {$children}
            </ReactoryForm>);
        };

        reactory.registerComponent(formDef.nameSpace, formDef.name, formDef.version, component, formDef.tags, formDef.roles, true, [], 'form')
        navigate(`${routePrefix}/${formId}/`);

      }} />
    </AlertDialog>
   */
  const RootElement = (props) => (<>
    <ReactoryForm formDef={$formDef} mode='view' formData={all_forms} />
  </>)

  return (
    <Routes>
      <Route path="/" element={RootElement({})} />
      <Route path={':formId/*'} element={RouteBoundForm} />
    </Routes>

  )
};

export const ReactoryFormRouterComponent = compose(
  withReactory,
  withTheme)(ReactoryFormRouter);

export default ReactoryFormRouterComponent;