import  * as UserComponents  from './user/index';
import * as OrganizationComponents from './organization/index';
import LoginPage, { RegisterPage } from './auth';
import Main from './home/index';
import AssessmentView from './assess/index';
import ProfileComponent from './user/Profile';
import UserSurveyComponent from './survey/UserSurvey';
import ReportComponent from './report/index';
import ReactoryRouterComponent, { ReactoryFormComponent } from './reactory'
import  { TaskListComponent, TaskDashboardComponent } from './tasks/Taskboard';
import AdminDashboardComponent from './admin/dashboard'
export default UserComponents.UserListWithData;
export const UserList = UserComponents.UserListWithData;
export const UserSearchInput = UserComponents.UserSearchInputComponent;
export const ForgotForm = UserComponents.ForgotForm;
export const Home = Main;
export const Assessment = AssessmentView;
export const OrganizationTable = OrganizationComponents.OrganizationTable;
export const OrganizationList = OrganizationComponents.OrganizationList;
export const Login = LoginPage; 
export const Profile = ProfileComponent;
export const UserSurvey = UserSurveyComponent;
export const Report = ReportComponent;
export const TaskList = TaskListComponent;
export const TaskDashboard = TaskDashboardComponent;
export const AdminDashboard = AdminDashboardComponent;
export const Register = RegisterPage;
export const ReactoryRouter = ReactoryRouterComponent;
export const ReactoryForm = ReactoryFormComponent;
