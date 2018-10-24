
import React from 'react';

import { 
  Typography
} from '@material-ui/core';
import  * as UserComponents  from './user/index';
import * as OrganizationComponents from './organization/index';
import LoginPage, { RegisterPage } from './auth';
import Main from './home/index';
import AssessmentView from './assess/index';
import ProfileComponent from './user/Profile';
import UserSurveyComponent from './survey/UserSurvey';
import ReportComponent from './report/index';
import KanbanDashboardComponent from './home/kanban/KanbanDashboard';
import TowerStoneHome from './home/TowerStoneHomeComponent';
import Loading from './shared/Loading';
import ReactoryRouterComponent, { ReactoryFormComponent } from './reactory'
import  { TaskListComponent, TaskDashboardComponent } from './tasks/Taskboard';
import AdminDashboardComponent from './admin/dashboard'
import PaymentGatewayDashboardComponent from './payments/funisave/Dashboard';
import DateSelector from './dates/DateSelector.js';
import Layout from './shared/Layout';
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



export const componentRegistery = [
  {
    nameSpace: 'core',
    name: 'EmptyComponent', 
    component: <p>Component Not Found</p>, 
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'RouteNotHandled', 
    component: <p>Invalid Application Path</p>, 
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
    name: 'Profile',
    component: Profile,
    version: '1.0.0',
  },
  { 
    nameSpace: 'core', 
    name: 'UserSurvey',
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
    component: Layout
  }
];