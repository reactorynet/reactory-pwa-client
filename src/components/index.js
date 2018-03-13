import  * as UserComponents  from './user/index';
import * as OrganizationComponents from './organization/index';
import LoginPage from './auth';
import Main from './home/index';
import AssessmentView from './assess/index';
import ProfileComponent from './user/Profile';
import UserSurveyComponent from './survey/UserSurvey';

export default UserComponents.UserListWithData;
export const UserList = UserComponents.UserListWithData;
export const Home = Main;
export const Assessment = AssessmentView;
export const OrganizationTable = OrganizationComponents.OrganizationTable;
export const Login = LoginPage; 
export const Profile = ProfileComponent;
export const UserSurvey = UserSurveyComponent;