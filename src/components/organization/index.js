import OrganizationGQLTable from './OrganizationTable';
import OrganizationGQLList from './OrganizationList';
import DefaultOrganizationForm from './forms/Admin';
import Demographics from './Demographics';

const OrganizationTable = OrganizationGQLTable;
const OrganizationList = OrganizationGQLList;
export {Demographics, OrganizationTable, OrganizationList}
export const Forms = {
  Default: DefaultOrganizationForm
};