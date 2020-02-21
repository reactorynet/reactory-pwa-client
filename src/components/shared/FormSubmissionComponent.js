import React, { Component } from 'react';
import { Icon } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import { template, isFunction } from 'lodash';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Link, withRouter } from 'react-router-dom';
import { withApi } from '@reactory/client-core/api/ApiProvider';
//REQUIREMENTS
// Text
// Color
// Icon

class SubmissionComponent extends Component {

  constructor(props, context) {
    super(props, context)
  }

  render() {
    const { props, theme } = this;
    let buttonText = 'SUBMIT';
    let icon = null;

    let args = {
      variant: "contained",
      color: "primary",      
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
        let IconComponent = custom !== undefined ? theme.extensions[custom].icons[uiOptions.icon] : null;
        if (IconComponent) {
          icon = <IconComponent {...iconProps} />
        } else {
          icon = <Icon {...iconProps}>{uiOptions.icon}</Icon>
        }
      }
    }

    const submit = () => {      
      if(props.formContext && isFunction(props.formContext.$submit) === true) {
        props.api.log('Submitting Form, via Submission Component', {props}, 'debug');
        props.formContext.$submit()  
      }
    }

    

    return (
      <Button {...args} startIcon={icon} onClick={submit}>{buttonText}</Button>
    )
  }
  // static styles = (theme) => ({})
};

const FormSubmissionComponent = compose(withTheme, withApi)(SubmissionComponent);
export default FormSubmissionComponent;
