import React, { Component } from 'react';
import { compose } from 'redux';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { Typography } from '@mui/material';
import moment from 'moment';

class DateLabel extends Component<any, any> {

  static propTypes = {
  };

  static efaultProps = {
  };

  static styles = (theme): any => {
    return {
      currency: {
        margin: theme.spacing(1)
      },
      currencyValue: {

      },
    }
  };



  render() {
    const {
      value,
      api,
      variant = "h6",
      classes,
      uiSchema
    } = this.props;

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
        <Typography variant={_variant} className={classes.label}>{labelText}</Typography>
      </div>
    );
  }
}



const DateLabelComponent = compose(
  withReactory,
  withTheme,
  withStyles(DateLabel.styles))(DateLabel);

export default {
  nameSpace: 'core',
  name: 'DateLabel',
  version: '1.0.0',
  component: DateLabelComponent,
  tags: ['date', 'label'],
  description: 'Basic Date Label',
};

