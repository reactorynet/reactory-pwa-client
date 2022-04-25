'use explicit'
import React from 'react';

import lodash from 'lodash';
import * as MaterialCore from '@mui/material'
import * as MaterialCoreStyles from '@mui/styles'
import * as MaterialIcons from '@mui/icons-material'
import * as MaterialLab from '@mui/lab'
import * as MaterialStyles from '@mui/styles';

import * as DropZone from 'react-dropzone';
import * as ReactRouter from 'react-router'
import * as ReactBigCalendar from 'react-big-calendar';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

//import * as OrganizationComponents from './organization/index';


import IntersectionVisible from './utility/IntersectionVisible';

import Loading from './shared/Loading';
import LinkComponent from './shared/Link';
import ReactoryRouterComponent, { ReactoryFormComponent } from './reactory/ReactoryFormComponent'
import DateSelector from './dates/DateSelector';
import Calendar from './dates/Calendar';
import { LayoutThemed, SingleColumnLayout, TwoColumnGrid, BasicContainer } from './shared/Layout';
import Logo from './shared/logo';
import SlideOutLauncher from './shared/SlideOutLauncher';
import BasicModal from './shared/BasicModal';
import SpeedDialWidget from './shared/SpeedDialWidget';
import FullScreenDialog from './shared/ReactoryCoreDialog';
import FramedWindow, { ReportViewerComponent, GraphiqlWindow } from './shared/FramedWindow';

import TabbedNavigation from './shared/TabbedNavigation';
import ChipLabel from './shared/ChipLabel';
import MaterialInput from './shared/MaterialInput';
import FormSubmissionComponent from './shared/FormSubmissionComponent';
import ImageComponent from './shared/ImageComponent';
import ConditionalIconComponent from './shared/ConditionalIconComponent';
import LabelComponent from './reactory/widgets/LabelWidget';
import ReactoryDropZone from './reactory/widgets/ReactoryDropZone';

import StyledCurrencyLabel from './shared/StyledCurrencyLabel';

import TableChildComponentWrapper from './shared/TableChildComponentWrapper';
import AccordionComponent from './shared/AccordionComponent';
import RadioGroupComponent from './shared/RadioGroupComponent';
import LookupComponent from './shared/LookupComponent';
import NotificationComponent from './shared/NotificationWidget';
import GridLayoutComponent from './shared/GridLayoutComponent';

import NotFoundComponent from './shared/NotFoundComponent';
import DocumentListComponent from './shared/DocumentListComponent';
import DocumentUploadComponent from './shared/DocumentUploadComponents';
import Cropper from './shared/image/Cropper';

import * as utils from './util';
import { compose } from 'redux';
import { DropDownMenuComponent } from './shared/menus/DropDownMenu';

import { ErrorBoundary } from '../api/ErrorBoundary';

import * as MaterialReactoryWidgets from './reactory/widgets'

export const AdminDashboard = <NotFoundComponent key={'AdminDashboard - Deprecated'}/>;
export const ReactoryRouter = ReactoryRouterComponent;
export const ReactoryForm = ReactoryFormComponent;
export const CompanyLogo = (props) => {
  const { organization } = props;
  const logoProps = {
    backgroundSrc: utils.CDNOrganizationResource(organization.id, organization.logo),
    ...props,
  };
  return <Logo {...logoProps} />
};

export const componentRegistery = [
  {
    nameSpace: 'react',
    name: 'React',
    version: '1.0.0',
    component: React
  },
  {
    nameSpace: 'core',
    name: 'ErrorBoundary',
    version: '1.0.0',
    component: ErrorBoundary,
  },
  {
    nameSpace: 'core',
    name: 'IntersectionVisible',
    version: '1.0.0',
    component: IntersectionVisible,
  },
  {
    nameSpace: 'lodash',
    name: 'lodash',
    version: '1.0.0',
    component: lodash
  },
  {
    nameSpace: 'core',
    name: 'ReactoryDropZone',
    version: '1.0.0',
    component: ReactoryDropZone
  },
  {
    nameSpace: 'core',
    name: 'ChipLabel',
    component: ChipLabel,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ImageComponent',
    component: ImageComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ConditionalIconComponent',
    component: ConditionalIconComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'MaterialInput',
    component: MaterialInput,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'FormSubmissionComponent',
    component: FormSubmissionComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'LabelComponent',
    component: LabelComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'StyledCurrencyLabel',
    component: StyledCurrencyLabel,
    version: '1.0.0',
  },
  // {
  //   nameSpace: 'core',
  //   name: 'PricingSliderComponent',
  //   component: PricingSliderComponent,
  //   version: '1.0.0',
  // },
  {
    nameSpace: 'core',
    name: 'SelectWithDataWidget',
    component: require('./reactory/widgets/SelectWithData'),
    version: '1.0.0',
  },
  // {
  //   nameSpace: 'core',
  //   name: 'PricingLineChartComponent',
  //   component: PricingLineChartComponent,
  //   version: '1.0.0',
  // },
  {
    nameSpace: 'core',
    name: 'TableChildComponentWrapper',
    component: TableChildComponentWrapper,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'AccordionComponent',
    component: AccordionComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'RadioGroupComponent',
    component: RadioGroupComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'LookupComponent',
    component: LookupComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'NotificationComponent',
    component: NotificationComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'GridLayoutComponent',
    component: GridLayoutComponent,
    version: '1.0.0',
  }, 
  {
    nameSpace: 'core',
    name: 'TabbedNavigation',
    component: TabbedNavigation,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'DataTable',
    component: (props) => { return (<span>core.DataTable deprecated use MuiDataTables instead.</span>) },
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Link',
    component: LinkComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'SingleColumnLayout',
    component: SingleColumnLayout,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'TwoColumnGrid',
    component: TwoColumnGrid,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'BasicContainer',
    component: BasicContainer,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'Logo',
    component: Logo,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'CompanyLogo',
    version: '1.0.0',
    component: CompanyLogo,
  },
  {
    nameSpace: 'core',
    name: 'Cropper',
    version: '1.0.0',
    component: Cropper,
  },
  {
    nameSpace: 'core',
    name: 'EmptyComponent',
    component: <p>Component Not Found</p>,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'FramedWindow',
    version: '1.0.0',
    component: FramedWindow,
  },
  {
    nameSpace: 'core',
    name: 'ReportViewer',
    version: '1.0.0',
    component: ReportViewerComponent
  },
  {
    nameSpace: 'core',
    name: 'RouteNotHandled',
    component: <p>Invalid Application Path</p>,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ErrorMessage',
    component: (props) => (<p>{props.message || 'Invalid Application Path'}</p>),
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Loading',
    version: '1.0.0',
    component: Loading
  },
  {
    nameSpace: 'core',
    name: 'NotFound',
    component: NotFoundComponent,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'DocumentListComponent',
    component: DocumentListComponent,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'DocumentUploadComponent',
    component: DocumentUploadComponent,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'UserListWithSearch',
    component: () => '',
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'HelpMe',
    version: '1.0.0',
    component: require('../components/shared/HelpMe')
  },
  
  {
    nameSpace: 'core',
    name: 'ResetPassword',
    component: () => new Error('Complete core.ResetPassword Migratation to reactory-user plugin'),
    version: '1.0.0'
  },  
  {
    nameSpace: 'core',
    name: 'DateSelector',
    component: DateSelector,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Calendar',
    version: '1.0.0',
    component: Calendar
  },
  
  {
    nameSpace: 'core',
    name: 'Administration',
    component: AdminDashboard,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ReactoryRouter',
    component: ReactoryRouter,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ReactoryForm',
    component: ReactoryForm,
    version: '1.0.0',
  },  
  {
    nameSpace: 'core',
    name: 'Layout',
    version: '1.0.0',
    component: LayoutThemed
  },
  {
    nameSpace: 'core',
    name: 'BasicModal',
    version: '1.0.0',
    component: BasicModal
  },
  {
    nameSpace: 'core',
    name: 'FullScreenModal',
    version: '1.0.0',
    component: FullScreenDialog
  },

  {
    nameSpace: 'core',
    name: 'RememberCredentials',
    version: '1.0.0',
    component: () => (<>Complete Migration to reactory-user plugin</>),
  },
  {
    nameSpace: 'core',
    name: 'SpeedDial',
    version: '1.0.0',
    component: SpeedDialWidget
  },
 
  {
    nameSpace: 'material-ui',
    name: 'MaterialCore',
    version: '1.0.0',
    component: {
      ...MaterialCore,
      styles: {
        ...MaterialCoreStyles
      }
    }
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialIcons',
    version: '1.0.0',
    component: MaterialIcons,
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialLab',
    version: '1.0.0',
    component: MaterialLab,
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialStyles',
    version: '1.0.0',
    component: MaterialStyles,
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialPickers',
    version: '1.0.0',
    component: (<NotFoundComponent key={'material-ui.MaterialPickers is deprecated'}/>),
  },
  {
    nameSpace: 'material-ui',
    name: 'Material',
    version: '1.0.0',
    component: {
      MaterialCore,
      MaterialIcons,
      MaterialLab,
      MaterialStyles,
      MaterialPickers: (<NotFoundComponent key={'material-ui.MaterialPickers is deprecated'} />),
      MaterialTable: (<NotFoundComponent key={'material-ui.MaterialTable is deprecated'} />)
    },
  },
  {
    nameSpace: 'core',
    name: 'DropDownMenu',
    version: '1.0.0',
    component: DropDownMenuComponent
  },  
 
  {
    nameSpace: 'core',
    name: 'MaterialFormWidgets',
    version: '1.0.0',
    component: MaterialReactoryWidgets
  },
  GraphiqlWindow.meta,
  SlideOutLauncher.meta,
  // require('./shared/currency/CurrencyLabel'),
  // require('./shared/DateLabel'),
  // require('./shared/StaticContent').meta,
  // require('./shared/Label'),
  // require('./shared/AlertDialog'),  
  {
    nameSpace: 'reactory-core',
    name: 'ReactBeautifulDnD',
    version: '1.0.0',
    component: {
      DragDropContext, Droppable, Draggable
    },
  },

  {
    nameSpace: 'apollo-client',
    name: 'ApolloClient',
    version: '3.2.7',
    component: {
      core: require('@apollo/client'),
      react: require('@apollo/client/react'),
      hoc: require('@apollo/client/react/hoc'),
      components: require('@apollo/client/react/components'),
    }
  },
  {
    nameSpace: 'core',
    name: 'ReactoryColorPicker',
    component: require('./reactory/widgets/ReactoryColorPicker').default,
    version: '1.0.0'
  },
  {
    nameSpace: 'exceljs',
    name: 'ExcelJS',
    version: '3.4.0',
    component: require('exceljs'),
  },

  {
    nameSpace: 'hooks',
    name: 'useSizeSpec',
    component: require('./hooks/useSizeSpec').useSizeSpec,
    version: '1.0.0',
  },
  {
    nameSpace: 'reactory',
    name: 'Footer',
    component: require('./shared/Footer').Footer,
    version: '1.0.0',
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialUIColor',
    component: (<NotFoundComponent key={'material-ui.MaterialUIColor is deprecated'} />),
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'ReactBigCalendar',
    component: ReactBigCalendar,
    version: '1.0.0',
  },
  {
    nameSpace: 'react-router',
    name: 'ReactRouter',
    component: ReactRouter,
    version: '1.0.0'
  },
  {
    nameSpace: 'dropzone',
    name: 'DropZone',
    version: '1.0.0',
    component: DropZone
  },
  {
    nameSpace: 'recompose',
    name: 'Recompose',
    version: '1.0.0',
    component: compose,
  },
  {
    nameSpace: 'core',
    name: 'UserDemographics',
    version: '1.0.0',
    component: <>complete import from reactory-user plugin</>,
  }
]



// {
//   nameSpace: 'core',
//   name: 'AddressLookupComponent',
//   version: '1.0.0',
//   component: AddressLookupComponent
// },


// {
  //   nameSpace: 'core',
  //   name: 'Profile',
  //   component: Profile,
  //   version: '1.0.0',
  // },


  // {
  //   nameSpace: 'core',
  //   name: 'TaskList',
  //   component: TaskList,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'UserTaskListWithData',
  //   component: TaskListComponentWithData,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'UserTaskDetailWithData',
  //   component: TaskDetailWithData,
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'TaskDashboard',
  //   component: TaskDashboard,
  //   version: '1.0.0',
  // },


   // {
  //   nameSpace: 'core',
  //   name: 'PageIntegrations',
  //   version: '1.0.0',
  //   component: require('./template/integrations/index')
  // },
  // {
  //   nameSpace: 'boxcommerce',
  //   name: 'PageEditorHome',
  //   version: '1.0.0',
  //   component: require('./template/PageTemplate').PageBuilderComponent
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'FroalaEditor',
  //   version: '1.0.0',
  //   component: FroalaWired
  // },

  // {
  //   nameSpace: 'core',
  //   name: 'CreateProfile',
  //   version: '1.0.0',
  //   component: UserComponents.CreateProfile,
  // },
  // {
  //   nameSpace: 'aot',
  //   name: 'AnalyticsDashboard',
  //   version: '1.0.0',
  //   component: AotAnalyticsDashboardComponent
  // },

  // {
  //   nameSpace: 'aot',
  //   name: 'Dashboard',
  //   component: KanbanDashboard,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'Task',
  //   component: KanbanDashboard,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'towerstone',
  //   name: 'Dashboard',
  //   component: TowerStoneHome,
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'InboxComponent',
  //   version: '1.0.0',
  //   component: UserInbox,
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'Logout',
  //   version: '1.0.0',
  //   component: UserComponents.LogoutComponent,
  // },
  // {
  //   nameSpace: 'funisave-gw',
  //   name: 'Dashboard',
  //   version: '1.0.0',
  //   component: FuniSaveDashboard
  // },

  // {
  //   nameSpace: 'core',
  //   name: 'Home',
  //   component: Home,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'towerstone',
  //   name: 'Assessment',
  //   component: Assessment,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'towerstone',
  //   name: 'TowerStone180Assessment',
  //   component: require('./assess/DefaultView').default,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'towerstone',
  //   name: 'TowerStone360Assessment',
  //   component: require('./assess/DefaultView').default,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'plc',
  //   name: 'PlcDefaultAssessment',
  //   component: require('./assess/DefaultView').default,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'OrganizationLabelForId',
  //   component: require('./organization/OrganizationList').OrganizationLabelForIdComponent,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'OrganizationTable',
  //   component: OrganizationTable,
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'OrganizationList',
  //   component: OrganizationList,
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'BusinessUnitList',
  //   component: require('./businessunit').BusinessUnitListWithToolbar,
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'BusinessUnitForm',
  //   component: require('./businessunit').BusinessUnitForm,
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'BusinessUnitFormWithQuery',
  //   component: require('./businessunit').BusinessUnitFormWithQuery,
  //   version: '1.0.0'
  // },

  // {
  //   nameSpace: 'core',
  //   name: 'UserSearch',
  //   component: UserComponents.UserSearchInputComponent,
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'ForgotPassword',
  //   component: ForgotForm,
  //   version: '1.0.0'
  // },


   // {
  //   nameSpace: 'core',
  //   name: 'UserList',
  //   component: UserComponents.UserListWithData,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'UserListItem',
  //   component: UserComponents.UserListItem,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'UserWithQuery',
  //   component: UserComponents.UserWithQuery,
  //   version: '1.0.0',
  // },
  // {
  //   nameSpace: 'core',
  //   name: 'ApplicationUserListItem',
  //   component: withTheme((props: any) => {
  //     const { UserListItem } = UserComponents;
  //     if (props.theme && props.theme.key) {
  //       return <UserListItem user={{ firstName: props.firstName || 'Reactory', lastName: props.lastName || 'System', id: props.id || `${props.theme.key}_app`, avatar: 'avatar.png' }} message={props.message} />
  //     }

  //     return <UserListItem user={{ firstName: 'Reactory', lastName: 'System', id: 'reactory_app', avatar: 'avatar.png' }} message={props.message} />
  //   }),
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'towerstone',
  //   name: 'OwlyListItem',
  //   component: (props) => {
  //     const { UserListItem } = UserComponents;
  //     return <UserListItem user={{ firstName: 'TowerStone Leadership', lastName: 'Centre', id: 'towerstone_app', avatar: 'avatar.png' }} message={props.message} />
  //   },
  //   version: '1.0.0'
  // },
  // {
  //   nameSpace: 'towerstone',
  //   name: 'OwlyListItem',
  //   component: (props) => {
  //     const { UserListItem } = UserComponents;
  //     return <UserListItem user={{ firstName: 'TowerStone Leadership', lastName: 'Centre', id: 'towerstone_app', avatar: 'avatar.png' }} message={props.message} />
  //   },
  //   version: '1.0.0'
  // },


  //  {
  //   nameSpace: 'widgets',
  //   name: 'UserListItemWidget',
  //   version: '1.0.0',
  //   component: UserListItemWidget
  // },