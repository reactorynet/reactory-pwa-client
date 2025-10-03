
import React from 'react';
import { Route, Routes, useParams, useNavigate, useMatch, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { compose } from 'redux';
import { useReactory, withReactory } from '../../api/ApiProvider';

import ReactoryFormListDefinition from './formDefinitions/ReactoryFormList';
import ReactoryNewFormInput from './formDefinitions/ReactoryNewFormInput';
import { ReactoryForm } from './ReactoryForm';
import FormList from '../shared/FormList';

type ReactoryFormRouterDependecies = {
  MaterialCore: Reactory.Client.Web.MaterialCore;
  FormEditorEnhanced: React.ComponentType<any>;
}

const RouteBoundForm = () => {
  const { formId, mode = 'view', id = null } = useParams<any>();

  let fprops: any = {
    formId,
    mode,
  };

  if(id) {
    fprops.formData = { id };
  }

  return <ReactoryForm {...fprops} />
}

const ReactoryFormRouter = (props) => {  
  const theme = useTheme();
  const reactory = useReactory();
  const location = useLocation();
  const navigate = useNavigate();

  const { routePrefix } = props;
  const [version, setVersion] = React.useState<number>(0);
  const [newFormModalVisible, setNewFormModalVisible] = React.useState(false);

  const {
    MaterialCore,
    FormEditorEnhanced,
  } = reactory.getComponents<ReactoryFormRouterDependecies>([
    'material-ui.MaterialCore', 
    'reactory.FormEditorEnhanced']);

  const {
    Tooltip
  } = MaterialCore

  const params = useParams();  
  const { formId, mode } = params;  

  reactory.log('ReactoryFormRouter:render', { props, location: location.pathname, params, routePrefix });

  const user = reactory.getUser();
 
  const $formDef = {
    ...ReactoryFormListDefinition,
    defaultFormValue: { forms: reactory.formSchemas }
  }

  // Debug logging for route matching
  reactory.log('ReactoryFormRouter:params', { formId, mode, pathname: location.pathname, params, routePrefix });

  // Helper function to build navigation paths using routePrefix
  const buildPath = (path: string) => {
    // If routePrefix is provided, use it as the base
    if (routePrefix) {
      const basePath = routePrefix.startsWith('/') ? routePrefix : `/${routePrefix}`;
      const result = `${basePath}${path}`;
      reactory.log('ReactoryFormRouter:buildPath:withPrefix', { path, routePrefix, basePath, result });
      return result;
    }
    
    // Otherwise, try to detect the base path from current location
    const pathSegments = location.pathname.split('/').filter(Boolean);
    // Find the base path for forms (everything up to and including 'forms')
    const formsIndex = pathSegments.findIndex(segment => segment === 'forms');
    if (formsIndex >= 0) {
      const basePath = '/' + pathSegments.slice(0, formsIndex + 1).join('/');
      reactory.log('ReactoryFormRouter:buildPath:detected', { path, basePath, result: `${basePath}${path}` });
      return `${basePath}${path}`;
    }
    
    // Fallback to current directory approach
    const basePath = location.pathname.replace(/\/[^/]*$/, '');
    reactory.log('ReactoryFormRouter:buildPath:fallback', { path, basePath, result: `${basePath}${path}` });
    return `${basePath}${path}`;
  };

  // Enhanced routing logic - routes are relative to router mount point
  // Debug the current route matching
  reactory.log('ReactoryFormRouter:route-matching', { 
    pathname: location.pathname, 
    formId, 
    mode, 
    routePrefix,
    currentPathSegments: location.pathname.split('/').filter(Boolean)
  });

  // Enhanced routing logic using conditional rendering instead of Routes
  // Parse the current path to determine what to render
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Remove the routePrefix from the path segments to get the relative path
  let relativePath = pathSegments;
  if (routePrefix) {
    const prefixSegments = routePrefix.split('/').filter(Boolean);
    relativePath = pathSegments.slice(prefixSegments.length);
  }
  
  reactory.log('ReactoryFormRouter:conditional-routing', {
    pathname: location.pathname,
    pathSegments,
    relativePath,
    routePrefix,
    formId,
    mode
  });

  // Determine what to render based on the relative path
  const renderComponent = () => {
    // Handle empty path or just "/"
    if (relativePath.length === 0) {
      return (
        <FormList 
          mode="list" 
          routePrefix={routePrefix}
          onFormSelect={(form) => {
            navigate(buildPath(`/${form.id}/view`));
          }}
          onCreateNew={() => {
            navigate(buildPath('/new/develop'));
          }}
        />
      );
    }

    // Handle /list
    if (relativePath.length === 1 && relativePath[0] === 'list') {
      return (
        <FormList 
          mode="list" 
          routePrefix={routePrefix}
          onFormSelect={(form) => {
            navigate(buildPath(`/${form.id}/view`));
          }}
          onCreateNew={() => {
            navigate(buildPath('/new/develop'));
          }}
        />
      );
    }

    // Handle /favourites
    if (relativePath.length === 1 && relativePath[0] === 'favourites') {
      return (
        <FormList 
          mode="favourites" 
          routePrefix={routePrefix}
          onFormSelect={(form) => {
            navigate(buildPath(`/${form.id}/view`));
          }}
          onCreateNew={() => {
            navigate(buildPath('/new/develop'));
          }}
        />
      );
    }

    // Handle /new/develop
    if (relativePath.length === 2 && relativePath[0] === 'new' && relativePath[1] === 'develop') {
      return (
        <div style={{ padding: '20px', background: 'lightgreen' }}>
          <h2>NEW/DEVELOP - Conditional Route Working!</h2>
          <FormEditorEnhanced 
            formId="new"
            mode="develop"
            onSave={(formDefinition) => {
              console.log('Saving new form:', formDefinition);
              reactory.createNotification('Success', {
                type: 'success',
                message: 'Form saved successfully'
              });
              navigate(buildPath(`/${formDefinition.id}/develop`));
            }}
          />
        </div>
      );
    }

    // Handle /{formId}/develop
    if (relativePath.length === 2 && relativePath[1] === 'develop') {
      const currentFormId = relativePath[0];
      return (
        <FormEditorEnhanced 
          formId={currentFormId}
          mode="develop"
          onSave={(formDefinition) => {
            console.log('Saving form:', formDefinition);
            reactory.createNotification('Success', {
              type: 'success',
              message: 'Form saved successfully'
            });
          }}
        />
      );
    }

    // Handle /{formId}/edit
    if (relativePath.length === 2 && relativePath[1] === 'edit') {
      const currentFormId = relativePath[0];
      return (
        <FormEditorEnhanced 
          formId={currentFormId}
          mode="edit"
          onSave={(formDefinition) => {
            console.log('Saving form:', formDefinition);
            reactory.createNotification('Success', {
              type: 'success',
              message: 'Form saved successfully'
            });
          }}
        />
      );
    }

    // Handle /{formId}/view
    if (relativePath.length === 2 && relativePath[1] === 'view') {
      const currentFormId = relativePath[0];
      return (
        <ReactoryForm 
          formId={currentFormId}
          mode="view"
        />
      );
    }

    // Handle /{formId}/{mode}/{id} - form with specific record ID
    if (relativePath.length === 3) {
      const currentFormId = relativePath[0];
      const currentMode = relativePath[1];
      const recordId = relativePath[2];
      
      return (
        <ReactoryForm 
          formId={currentFormId}
          mode={currentMode}
          formData={{ id: recordId }}
        />
      );
    }

    // Handle /{formId}/{mode} - legacy support
    if (relativePath.length === 2) {
      const currentFormId = relativePath[0];
      const currentMode = relativePath[1];
      
      // Check if mode is 'develop' or 'edit' and use FormEditorEnhanced
      if (currentMode === 'develop' || currentMode === 'edit') {
        return (
          <FormEditorEnhanced 
            formId={currentFormId}
            mode={currentMode}
            onSave={(formDefinition) => {
              console.log('Saving form:', formDefinition);
              reactory.createNotification('Success', {
                type: 'success',
                message: 'Form saved successfully'
              });
            }}
          />
        );
      } else {
        return (
          <ReactoryForm 
            formId={currentFormId}
            mode={currentMode}
          />
        );
      }
    }

    // Handle /{formId} - defaults to view mode
    if (relativePath.length === 1) {
      const currentFormId = relativePath[0];
      return (
        <ReactoryForm 
          formId={currentFormId}
          mode="view"
        />
      );
    }

    // Fallback - show form list
    return (
      <div style={{ padding: '20px', background: 'lightyellow' }}>
        <h3>Unmatched Route</h3>
        <p>Path: {location.pathname}</p>
        <p>Relative Path: {relativePath.join('/')}</p>
        <FormList 
          mode="list" 
          routePrefix={routePrefix}
          onFormSelect={(form) => {
            navigate(buildPath(`/${form.id}/view`));
          }}
          onCreateNew={() => {
            navigate(buildPath('/new/develop'));
          }}
        />
      </div>
    );
  };

  return renderComponent();
};

export const ReactoryFormRouterComponent = compose(
  withReactory
)(ReactoryFormRouter);

export default ReactoryFormRouterComponent;