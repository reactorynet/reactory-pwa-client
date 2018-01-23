import  * as UserComponents  from './user/index';
import * as OrganizationComponents from './organization/index';
import LoginPage from './auth';
import Main from './home/index';


export default UserComponents.UserListWithData;
export const UserList = UserComponents.UserListWithData;
export const Home = Main;
export const OrganizationTable = OrganizationComponents.OrganizationTable;
export const Login = LoginPage; 