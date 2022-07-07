import Reactory from '@reactory/reactory-core';

const formSchema = {
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
      }
    }
  }
}

const schema = {
  type: 'object',
  title: 'Reactory Forms',
  properties: {
    recent: { ...formSchema },
    forms: { ...formSchema } 
  }
};

const uiSchema = {
  recent: {

  },
  forms: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      primaryText: '${item.name}',
      secondaryText: '${item.version}',
      showAvatar: true,
      // avatar: (item, formContext) => {
      //   const { reactory } = formContext;
      //   if (item.event.organization && item.event.organization.avatar) {
      //     return reactory.getCDNResource(`organization/${item.event.organization.id}/${item.event.organization.avatar}`)
      //   }

      //   return null;
      // },
      // avatarAlt: (item) => {
      //   // reactory.log(`Getting avatar alt for item`, { item }, 'debug');
      //   if (item.event.organization && item.event.organization.avatar) {
      //     return item.event.organization.name
      //   }

      //   return null;
      // },
      //avatarPosition: "left",
      secondaryAction: {
        component: (item, formContext, itemIndex, data) => {
          const { event, link, user, checkedIn, checkedOut, eventLinkActivated } = item;
          const { options } = event;
          const { reactory } = formContext;
          const {
            DropDownMenu,
            CheckinLinkLauncher,
            CheckoutLinkLauncher,
            UserReportViewLauncher
          } = reactory.getComponents([
            "core.DropDownMenu",
          ]);

          let nextAction = 'checkin';


          // if (options.linkOptions.checkinLinkEnabled === false) nextAction = 'launch';
          // if (checkedIn === true) nextAction = 'launch';
          // if (eventLinkActivated === true) nextAction = 'checkout';
          // if (checkedOut === true) nextAction = 'report'

          // let tooltip = 'Please click on the button to start';

          // const launcherProps: any = {
          //   event,
          //   user,
          //   link,
          //   checkedIn,
          //   checkedOut,
          //   eventLinkActivated,
          //   userEvent: item,
          //   user_event: item,
          //   variant: nextAction === 'launch' ? 'eventLink' : 'checkinLink',
          //   buttonVariant: 'iconbutton',
          // }

          // if (nextAction === 'checkout') {
          //   launcherProps.variant = 'checkoutLink';
          //   return (
          //     <Tooltip title={tooltip}>
          //       <CheckoutLinkLauncher {...launcherProps} />
          //     </Tooltip>
          //   )
          // }

          // if (nextAction === 'report') {
          //   return (
          //     <Tooltip title={tooltip}>
          //       <UserReportViewLauncher {...launcherProps} />
          //     </Tooltip>
          //   )
          // }

          // return (
          //   <Tooltip title={tooltip}>
          //     <CheckinLinkLauncher {...launcherProps} />
          //   </Tooltip>
          // )

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
      // listProps: {
      //   className: "list"
      // },
      // pagination: {
      //   pageSize: 1,
      //   variant: "page",
      //   resultMap: {
      //     'paging.page': 'page',
      //     'paging.pageSize': 'pageSize',
      //     'paging.hasNext': 'hasNext',
      //     'paging.total': 'total'
      //   }
      // },
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
  registerAsComponent: true
};

export default ReactoryFormList;