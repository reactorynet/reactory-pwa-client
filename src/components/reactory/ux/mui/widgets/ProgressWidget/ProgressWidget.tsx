import React, { Fragment } from 'react'
import {
  Typography,
  CircularProgress,
} from '@mui/material';
import uuid from 'uuid';
import { compose } from 'redux'



const ProgressWidget = (props: any) => {
  const { formData, uiSchema, schema } = props;
  let options = {} as any;
  if (uiSchema['ui:options']) options = { ...uiSchema['ui:options'] };
  return (
    <Fragment>
      <CircularProgress sx={{ display: 'block', margin: 'auto' }} variant="indeterminate" value={formData} color={'primary'} { ...options }/>
      <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', margin: 'auto' }}>{schema.title}</Typography>
    </Fragment>
  );
}

export default ProgressWidget
