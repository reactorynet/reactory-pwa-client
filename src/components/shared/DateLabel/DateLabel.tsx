import React from 'react';
import { compose } from 'redux';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { Typography } from '@mui/material';
import moment from 'moment';

const DateLabel = (props: any) => {
  const theme = useTheme();
  
  const {
    value,
    api,
    variant = "h6",
    classes,
    uiSchema
  } = props;

    let labelText = moment(value).format('DD  MMM YYYY HH:mm') ;
    let labelTitle = '';
    let _variant = variant;

    if (uiSchema) {
      if (uiSchema['ui:options'] && uiSchema['ui:options'].format && uiSchema['ui:options'].format != ''){
        labelText = moment(value).format(uiSchema['ui:options'].format);
      }
      if (uiSchema['ui:options'] && uiSchema['ui:options'].title && uiSchema['ui:options'].title != ''){
        labelTitle = uiSchema['ui:options'].title;
      }
      if (uiSchema['ui:options'] && uiSchema['ui:options'].variant && uiSchema['ui:options'].variant != ''){
        _variant = uiSchema['ui:options'].variant;
      }
    }

    return (
      <div>
        { labelTitle != '' && <label>{labelTitle}</label>}
        <Typography variant={_variant} style={{ margin: theme.spacing(1) }}>{labelText}</Typography>
      </div>
    );
};



export default {
  nameSpace: 'core',
  name: 'DateLabel',
  version: '1.0.0',
  component: DateLabel,
  tags: ['date', 'label'],
  description: 'Basic Date Label',
};

