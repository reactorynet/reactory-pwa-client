import React, { Fragment } from 'react';
import { compose } from 'redux';
import {  
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';


const SchemaSelectorWidget = (props: any) => {
  const theme = useTheme();
  
  const { formContext } = props;
    if(formContext.$schemaSelector) {
      return formContext.$schemaSelector;
    } else {
      return (
        <Typography>No Selector</Typography>
      );
    }
};



export default SchemaSelectorWidget;
