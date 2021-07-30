import OrganizationGQLTable from './OrganizationTable';
import OrganizationGQLList from './OrganizationList';
import DefaultOrganizationForm from './forms/Admin';


const OrganizationTable = OrganizationGQLTable;
const OrganizationList = OrganizationGQLList;
export { OrganizationTable, OrganizationList }
export const Forms = {
  Default: DefaultOrganizationForm
};