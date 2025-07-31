import React, { Component } from 'react';
import { Button, Icon } from '@mui/material';

import { template, isFunction } from 'lodash';
import { compose } from 'redux';
import { withTheme, withStyles } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
//REQUIREMENTS
// Text
// Color
// Icon

const SubmissionComponent = (props: any) => {

  
  let buttonText = 'SUBMIT';
  let icon = null;

  let args: any = {
    variant: "contained",
    color: "primary", 
    // type: "submit",     
  }

  if (props.uiSchema && props.uiSchema["ui:options"]) {
    const uiOptions = props.uiSchema["ui:options"];

    if (uiOptions.text) {
      buttonText = template(uiOptions.text)(props)
    }

    if(uiOptions.props) {
      args = {...args, ...uiOptions.props};
    }

    if (uiOptions.icon) {
      // const iconProps = { styles: { marginLeft: theme.spacing(1) } };
      const iconProps = {};
      const custom = uiOptions.iconType
      let IconComponent = custom !== undefined ? props.theme.extensions[custom].icons[uiOptions.icon] : null;
      if (IconComponent) {
        icon = <IconComponent {...iconProps} />
      } else {
        icon = <Icon {...iconProps}>{uiOptions.icon}</Icon>
      }
    }
  }

  const submit = () => {      
    if(props.formContext && isFunction(props.formContext.$submit) === true) {
      props.reactory.log('Submitting Form, via Submission Component', {props});
      props.formContext.$submit()
      props.formContext.refresh(); 
    }
  }

  

  return (
    <Button {...args} startIcon={icon} onClick={submit}>{buttonText}</Button>
  )
};

const FormSubmissionComponent = compose(withTheme, withReactory)(SubmissionComponent);
export default FormSubmissionComponent;
