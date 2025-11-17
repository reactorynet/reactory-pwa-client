import React from 'react';
import { compose } from 'redux';
import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

import { template } from 'lodash';

const Label = (props: any) => {
  const theme = useTheme();
  
  const {
    value = "?",
    variant = "h6",
    reactory,
  } = props;

    let labelText = value;

    if (props.uiSchema && props.uiSchema["ui:options"]) {
      const { format, $format } = props.uiSchema["ui:options"];

      if (format) labelText = template(format)(props);
      if ($format && typeof reactory.$func[$format] === 'function') {
        labelText = reactory.$func[$format](props);
      }
    }

    return (
      <Typography variant={variant} style={{ margin: theme.spacing(1) }}>{labelText}</Typography>
    );
};






export default {
  nameSpace: 'core',
  name: 'Label',
  version: '1.0.0',
  component: Label,
  tags: ['label'],
  description: 'Basic Label',
};
