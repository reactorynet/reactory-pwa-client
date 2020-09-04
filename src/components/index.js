
import React from 'react';
import { compose } from 'redux';
import { withRouter } from 'react-router'
import Loadable from 'react-loadable';
import {
  Typography,
  Grid,
  Paper,
  Button,
  Icon,
} from '@material-ui/core';

import * as MaterialCore from '@material-ui/core'
import * as MaterialIcons from '@material-ui/icons'
import * as MaterialLab from '@material-ui/lab'
import * as MaterialStyles from '@material-ui/core/styles';
import * as MaterialPickers from '@material-ui/pickers';
import * as UserComponents from './user/index';
import * as OrganizationComponents from './organization/index';
import LoginPage, { RegisterPage } from './auth';
import Main from './home/index';
import AssessmentView from './assess/index';
import UserSurveyComponent from './survey/UserSurvey';
import ReportComponent from './report/index';
import KanbanDashboardComponent, { TaskListComponentWithData, TaskDetailWithData } from './home/kanban/KanbanDashboard';
import TowerStoneHome from './home/TowerStoneHomeComponent';
import Loading from './shared/Loading';
import LinkComponent from './shared/Link';
import ReactoryRouterComponent, { ReactoryFormComponent } from './reactory/ReactoryFormComponent'
import { TaskListComponent, TaskDashboardComponent } from './tasks/Taskboard';
import AdminDashboardComponent from './admin/dashboard'
import PaymentGatewayDashboardComponent from './payments/funisave/Dashboard';
import DateSelector from './dates/DateSelector.js';
import Calendar from './dates/Calendar';
import { LayoutThemed, SingleColumnLayout, TwoColumnGrid, BasicContainer } from './shared/Layout';
import { UserListWithSearchComponent, SurveyDelegateWidget } from './user/Widgets';
import Logo from './shared/logo';
import SlideOutLauncher from './shared/SlideOutLauncher';
import BasicModal from './shared/BasicModal';
import AotAnalyticsDashboardComponent from './tasks/analytics/AnalyticsDashboard';
import SpeedDialWidget from './shared/SpeedDialWidget';
import FullScreenDialog from './shared/FullScreenDialog';
import FramedWindow, { ReportViewerComponent, GraphiqlWindow } from './shared/FramedWindow';

import FroalaWired from './richtext/Froala';

// DREW
import TabbedNavigation from './shared/tabbedNavigation';
import ChipLabel from './shared/ChipLabel';
import MaterialInput from './shared/MaterialInput';
import FormSubmissionComponent from './shared/FormSubmissionComponent';
import ImageComponent from './shared/ImageComponent';
import ConditionalIconComponent from './shared/ConditionalIconComponent';
import LabelComponent from './reactory/widgets/LabelWidget';

import StyledCurrencyLabel from './shared/StyledCurrencyLabel';
import PricingSliderComponent from './shared/PricingSliderComponent';
import PricingLineChartComponent from './shared/PricingLineChartComponent';
import TableChildComponentWrapper from './shared/TableChildComponentWrapper';
import AccordionComponent from './shared/AccordionComponent';
import RadioGroupComponent from './shared/RadioGroupComponent';
import LookupComponent from './shared/LookupComponent';
import NotificationComponent from './shared/NotificationWidget';
import GridLayoutComponent from './shared/GridLayoutComponent';
import ProductCardComponent from './shared/ProductCardComponent';
import NotFoundComponent from './shared/NotFoundComponent';
import DocumentListComponent from './shared/DocumentListComponent';
import DocumentUploadComponent from './shared/DocumentUploadComponents';
import FreightRequestQuoteComponent from './shared/FreightRequestQuote';
import FreightRequestProductDetailComponent from './shared/FreightRequestProductDetail';

import lodash from 'lodash';

import * as utils from './util';
import { withTheme } from '@material-ui/styles';
export const UserList = UserComponents.UserListWithData;
export const UserSearchInput = UserComponents.UserSearchInputComponent;
export const ForgotForm = UserComponents.ForgotForm;
export const ResetPasswordForm = UserComponents.ResetPasswordForm;
export const UserInbox = UserComponents.UserInbox;
export const Home = Main;
export const Assessment = AssessmentView;
export const OrganizationTable = OrganizationComponents.OrganizationTable;
export const OrganizationList = OrganizationComponents.OrganizationList;
export const Login = LoginPage;
export const Profile = UserComponents.UserProfile;
export const UserSurvey = UserSurveyComponent;
export const Report = ReportComponent;
export const TaskList = TaskListComponent;
export const TaskDashboard = TaskDashboardComponent;
export const AdminDashboard = AdminDashboardComponent;
export const Register = RegisterPage;
export const ReactoryRouter = ReactoryRouterComponent;
export const ReactoryForm = ReactoryFormComponent;
export const KanbanDashboard = KanbanDashboardComponent;
export const FuniSaveDashboard = PaymentGatewayDashboardComponent
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
    nameSpace: 'lodash',
    name: 'lodash',
    version: '1.0.0',
    component: lodash
  },

  // TO IMPLEMENT IN LASEC PLUGINS
  {
    nameSpace: 'lasec',
    name: 'FreightRequestQuoteComponent',
    component: FreightRequestQuoteComponent,
    version: '1.0.0'
  },
  {
    nameSpace: 'lasec',
    name: 'FreightRequestProductDetailComponent',
    component: FreightRequestProductDetailComponent,
    version: '1.0.0'
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
  {
    nameSpace: 'core',
    name: 'PricingSliderComponent',
    component: PricingSliderComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'SelectWithDataWidget',
    component: require('./reactory/widgets/SelectWithData'),
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'PricingLineChartComponent',
    component: PricingLineChartComponent,
    version: '1.0.0',
  },
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
    nameSpace: 'lasec',
    name: 'ProductCardComponent',
    component: ProductCardComponent,
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
    component: (props) => (<span>core.DataTable deprecated -> use MuiDataTables instead.</span>),
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
    component: require('./shared/image/Cropper').Cropper,
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
    name: 'UserList',
    component: UserComponents.UserListWithData,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'UserListItem',
    component: UserComponents.UserListItem,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'UserWithQuery',
    component: UserComponents.UserWithQuery,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ApplicationUserListItem',
    component: withTheme((props) => {
      const { UserListItem } = UserComponents;
      if (props.theme && props.theme.key) {
        return <UserListItem user={{ firstName: props.firstName || 'Reactory', lastName: props.lastName || 'System', id: props.id || `${props.theme.key}_app`, avatar: 'avatar.png' }} message={props.message} />
      }

      return <UserListItem user={{ firstName: 'Reactory', lastName: 'System', id: 'reactory_app', avatar: 'avatar.png' }} message={props.message} />
    }),
    version: '1.0.0'
  },
  {
    nameSpace: 'towerstone',
    name: 'OwlyListItem',
    component: (props) => {
      const { UserListItem } = UserComponents;
      return <UserListItem user={{ firstName: 'TowerStone Leadership', lastName: 'Centre', id: 'towerstone_app', avatar: 'avatar.png' }} message={props.message} />
    },
    version: '1.0.0'
  },
  {
    nameSpace: 'towerstone',
    name: 'OwlyListItem',
    component: (props) => {
      const { UserListItem } = UserComponents;
      return <UserListItem user={{ firstName: 'TowerStone Leadership', lastName: 'Centre', id: 'towerstone_app', avatar: 'avatar.png' }} message={props.message} />
    },
    version: '1.0.0'
  },
  {
    nameSpace: 'towerstone',
    name: 'SurveyDelegateWidget',
    component: SurveyDelegateWidget,
    version: '1.0.0',
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
    component: UserListWithSearchComponent,
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
    name: 'UserSearch',
    component: UserComponents.UserSearchInputComponent,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'ForgotPassword',
    component: ForgotForm,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'ResetPassword',
    component: ResetPasswordForm,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'Home',
    component: Home,
    version: '1.0.0',
  },
  {
    nameSpace: 'towerstone',
    name: 'Assessment',
    component: Assessment,
    version: '1.0.0',
  },
  {
    nameSpace: 'towerstone',
    name: 'TowerStone180Assessment',
    component: require('./assess/DefaultView').default,
    version: '1.0.0',
  },
  {
    nameSpace: 'towerstone',
    name: 'TowerStone360Assessment',
    component: require('./assess/DefaultView').default,
    version: '1.0.0',
  },
  {
    nameSpace: 'plc',
    name: 'PlcDefaultAssessment',
    component: require('./assess/DefaultView').default,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'OrganizationLabelForId',
    component: require('./organization/OrganizationList').OrganizationLabelForIdComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'OrganizationTable',
    component: OrganizationTable,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'OrganizationList',
    component: OrganizationList,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'BusinessUnitList',
    component: require('./businessunit').BusinessUnitListWithToolbar,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'BusinessUnitForm',
    component: require('./businessunit').BusinessUnitForm,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'BusinessUnitFormWithQuery',
    component: require('./businessunit').BusinessUnitFormWithQuery,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'Login',
    component: Login,
    version: '1.0.0',
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
    name: 'Profile',
    component: Profile,
    version: '1.0.0',
  },
  {
    nameSpace: 'towerstone',
    name: 'Surveys',
    component: UserSurvey,
    version: '1.0.0',
  },
  {
    nameSpace: 'towerstone',
    name: 'Report',
    component: Report,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'TaskList',
    component: TaskList,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'UserTaskListWithData',
    component: TaskListComponentWithData,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'UserTaskDetailWithData',
    component: TaskDetailWithData,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'TaskDashboard',
    component: TaskDashboard,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Administration',
    component: AdminDashboard,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Register',
    component: Register,
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
    nameSpace: 'aot',
    name: 'Dashboard',
    component: KanbanDashboard,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Task',
    component: KanbanDashboard,
    version: '1.0.0',
  },
  {
    nameSpace: 'towerstone',
    name: 'Dashboard',
    component: TowerStoneHome,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'InboxComponent',
    version: '1.0.0',
    component: UserInbox,
  },
  {
    nameSpace: 'core',
    name: 'Logout',
    version: '1.0.0',
    component: UserComponents.LogoutComponent,
  },
  {
    nameSpace: 'funisave-gw',
    name: 'Dashboard',
    version: '1.0.0',
    component: FuniSaveDashboard
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
    name: 'CreateProfile',
    version: '1.0.0',
    component: UserComponents.CreateProfile,
  },
  {
    nameSpace: 'aot',
    name: 'AnalyticsDashboard',
    version: '1.0.0',
    component: AotAnalyticsDashboardComponent
  },
  {
    nameSpace: 'core',
    name: 'RememberCredentials',
    version: '1.0.0',
    component: require('./user/Forms/index').RememberCredentialsComponent,
  },
  {
    nameSpace: 'core',
    name: 'SpeedDial',
    version: '1.0.0',
    component: SpeedDialWidget
  },
  {
    nameSpace: 'core',
    name: 'PageIntegrations',
    version: '1.0.0',
    component: require('./template/integrations/index')
  },
  {
    nameSpace: 'boxcommerce',
    name: 'PageEditorHome',
    version: '1.0.0',
    component: require('./template/PageTemplate').PageBuilderComponent
  },
  {
    nameSpace: 'core',
    name: 'FroalaEditor',
    version: '1.0.0',
    component: FroalaWired
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialCore',
    version: '1.0.0',
    component: MaterialCore,
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
    component: MaterialPickers,
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
      MaterialPickers,
    },
  },
  {
    nameSpace: 'core',
    name: 'DropDownMenu',
    version: '1.0.0',
    component: require('./shared/menus/DropDownMenu').DropDownMenuComponent,
  },
  {
    nameSpace: 'core',
    name: 'AssessmentList',
    version: '1.0.0',
    component: require('./assess/AssessmentList'),
  },
  {
    nameSpace: 'core',
    name: 'AssessmentTable',
    version: '1.0.0',
    component: require('./assess/AssessmentList').AssessmentTableComponent
  },
  {
    nameSpace: 'widgets',
    name: 'UserListItemWidget',
    version: '1.0.0',
    component: require('./reactory/widgets').UserListItemWidget
  },
  {
    nameSpace: 'core',
    name: 'MaterialFormWidgets',
    version: '1.0.0',
    component: require('./reactory/widgets')
  },
  GraphiqlWindow.meta,
  SlideOutLauncher.meta,
  require('./shared/currency/CurrencyLabel'),
  require('./shared/DateLabel'),
  require('./shared/StaticContent').meta,
  require('./shared/Label'),
  require('./shared/AlertDialog')
  // require('./reactory/widgets/LabelWidget'),
  // require('./shared/MaterialInput')
];
