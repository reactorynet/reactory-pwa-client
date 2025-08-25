
import React from 'react';
import { Route, Routes, useParams, useNavigate, useMatch } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { compose } from 'redux';
import { useReactory, withReactory } from '../../api/ApiProvider';

import ReactoryFormListDefinition from './formDefinitions/ReactoryFormList';
import ReactoryNewFormInput from './formDefinitions/ReactoryNewFormInput';
import { ReactoryForm } from './ReactoryForm';

type ReactoryFormRouterDependecies = {
  MaterialCore: Reactory.Client.Web.MaterialCore;
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

  const { routePrefix } = props;
  const [version, setVersion] = React.useState<number>(0);
  const [newFormModalVisible, setNewFormModalVisible] = React.useState(false);

  const navigate = useNavigate();

  const {
    MaterialCore,
  } = reactory.getComponents<ReactoryFormRouterDependecies>(['material-ui.MaterialCore']);

  const {
    Tooltip
  } = MaterialCore

  reactory.log('ReactoryFormRouter:render',  props);

  const user = reactory.getUser();
 
  const $formDef = {
    ...ReactoryFormListDefinition,
    defaultFormValue: { forms: reactory.formSchemas }
  }
  
  const params = useParams();  
  const { formId, mode } = params;  

  if(formId) {
    return (<ReactoryForm formId={formId} mode={mode || 'view'} formContext={{ routeParams: params }} />)
  } else {
    return (<ReactoryForm formDef={$formDef} mode='view' formData={{ forms: reactory.formSchemas }} />)
  }    
};

export const ReactoryFormRouterComponent = compose(
  withReactory
)(ReactoryFormRouter);

export default ReactoryFormRouterComponent;