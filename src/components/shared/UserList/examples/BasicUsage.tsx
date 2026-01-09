/**
 * BasicUsage Example
 * 
 * Demonstrates basic usage of the UserList component
 * 
 * @module UserList/examples/BasicUsage
 */

import React from 'react';
import { UserList } from '../UserList';
import type { UserListProps } from '../types';
import { REACTORY_USER_LIST_QUERY } from '../graphql/queries';

/**
 * Example 1: Simple list with no selection
 */
export const SimpleUserList: React.FC = () => {
  return (
    <UserList
      query={REACTORY_USER_LIST_QUERY}
      selectionMode="none"
      enableSearch={true}
      viewMode="list"
      itemVariant="compact"
    />
  );
};

/**
 * Example 2: User list with single selection
 */
export const SingleSelectionUserList: React.FC = () => {
  const [selectedUser, setSelectedUser] = React.useState<any>(null);

  const handleSelectionChange = (selected: any[]) => {
    setSelectedUser(selected[0] || null);
  };

  return (
    <div>
      <UserList
        query={REACTORY_USER_LIST_QUERY}
        selectionMode="single"
        onSelectionChange={handleSelectionChange}
        enableSearch={true}
        viewMode="list"
        itemVariant="compact"
      />
      {selectedUser && (
        <div>Selected: {selectedUser.fullName}</div>
      )}
    </div>
  );
};

/**
 * Example 3: User list with multiple selection
 */
export const MultipleSelectionUserList: React.FC = () => {
  const [selectedUsers, setSelectedUsers] = React.useState<any[]>([]);

  const handleSelectionChange = (selected: any[]) => {
    setSelectedUsers(selected);
  };

  return (
    <div>
      <UserList
        query={REACTORY_USER_LIST_QUERY}
        selectionMode="multiple"
        onSelectionChange={handleSelectionChange}
        enableSearch={true}
        viewMode="list"
        itemVariant="detailed"
      />
      <div>
        Selected {selectedUsers.length} user(s)
      </div>
    </div>
  );
};

/**
 * Example 4: User list with all features enabled
 */
export const FullFeaturedUserList: React.FC = () => {
  const handleAddUser = () => {
    console.log('Add user clicked');
  };

  const handleDeleteUsers = (users: any[]) => {
    console.log('Delete users:', users);
  };

  const handleUserClick = (user: any) => {
    console.log('User clicked:', user);
  };

  return (
    <UserList
      query={REACTORY_USER_LIST_QUERY}
      selectionMode="multiple"
      enableSearch={true}
      searchPlaceholder="Search by name, email..."
      enableQuickFilters={true}
      quickFilters={[
        { 
          id: 'active', 
          label: 'Active Users', 
          filter: { field: 'deleted', value: false, operator: 'eq' }
        },
        { 
          id: 'admins', 
          label: 'Admins', 
          filter: { field: 'roles', value: 'ADMIN', operator: 'in' }
        },
      ]}
      enableAdvancedFilters={true}
      advancedFilterFields={[
        { 
          field: 'roles', 
          label: 'Role', 
          type: 'select',
          operators: ['in', 'not-in'],
        },
        { 
          field: 'deleted', 
          label: 'Status', 
          type: 'boolean',
          operators: ['eq'],
        },
      ]}
      viewMode="list"
      allowViewModeChange={true}
      itemVariant="detailed"
      enableAddUser={true}
      onAddUser={handleAddUser}
      enableDeleteUsers={true}
      onDeleteUsers={handleDeleteUsers}
      canDelete={true}
      onUserClick={handleUserClick}
      initialPage={1}
      initialPageSize={25}
      pageSizeOptions={[10, 25, 50, 100]}
    />
  );
};

/**
 * Example 5: User list with custom item renderer
 */
export const CustomRendererUserList: React.FC = () => {
  const customItemRenderer = (user: any, options: any) => {
    return (
      <div 
        key={user.id}
        style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginBottom: '8px',
          backgroundColor: options.selected ? '#e3f2fd' : 'white',
          cursor: 'pointer',
        }}
        onClick={() => options.onSelect(user)}
      >
        <h3>{user.fullName}</h3>
        <p>{user.email}</p>
        <p>Roles: {user.roles?.join(', ')}</p>
      </div>
    );
  };

  return (
    <UserList
      query={REACTORY_USER_LIST_QUERY}
      selectionMode="multiple"
      itemVariant="custom"
      customItemRenderer={customItemRenderer}
      enableSearch={true}
    />
  );
};

/**
 * Example 6: Compact user list for dialogs/modals
 */
export const CompactUserList: React.FC = () => {
  return (
    <UserList
      query={REACTORY_USER_LIST_QUERY}
      selectionMode="single"
      enableSearch={true}
      viewMode="list"
      itemVariant="compact"
      dense={true}
      height="400px"
      initialPageSize={10}
      pageSizeOptions={[5, 10, 20]}
    />
  );
};

