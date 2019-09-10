import React, { Component, Fragment } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import { template } from 'lodash';
import * as Widgets from '../widgets';
import {
  Button,
  Typography,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  ExpansionPanelActions,
  Divider,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Icon,
  IconButton,
  Input,
  Toolbar,
  Tooltip,
  Paper,
} from '@material-ui/core'

class ObjectTemplate extends Component {

  static styles = (theme) => ({
    root: {
      padding: theme.spacing(1),
      margin: theme.spacing(1)
    }
  })

  constructor(props, context) {
    super(props, context)
    this.state = {
      expanded: props.expanded === true
    }
  }

  
  render() {
    const { 
      title, 
      description, 
      properties,
      children, 
      classes, 
      key, 
      disabled, 
      containerProps, 
      index, 
      hidden,
      uiSchema, 
      api, 
      formData, 
      formContext 
    } = this.props
    // //console.log('Object template field', { props: this.props, uiSchema });
    let titleText = title && title.indexOf("$") >= 0 ? template(title)({formData: this.props.formData}) : title;    
    const toggleExpand = () => { 
      this.setState({ expanded: !this.state.expanded }, 
        ()=>{
          if(containerProps && containerProps.onExpand) containerProps.onExpand(index)
        });
    };
    
    
    const uiOptions = uiSchema['ui:options'] || null;
    const uiWidget = uiSchema['ui:widget'] || null;
    const uiToolbar = uiSchema['ui:toolbar'] || null;    

    let Widget = null;
    let toolbar = null;

    if(uiToolbar){
        if(isArray(uiToolbar.buttons) === true) {
          const buttons = uiToolbar.buttons.map((button) => {
            const api = formContext.api
            const onRaiseCommand = ( evt ) => {                      
              if(api) api.raiseFormCommand(button.command, { formData: formData, formContext: formContext });              
            };            
            return (<Tooltip key={button.id} title={button.tooltip || button.id}><IconButton color={button.color || "secondary"} onClick={onRaiseCommand}><Icon>{button.icon}</Icon></IconButton></Tooltip>)
          });
          toolbar = (<Toolbar>{buttons}</Toolbar>);
        }
    }
    
    if(hidden === true) {
      return <Fragment>{children}</Fragment>
    }
    
    if(uiOptions && uiOptions.componentFqn && typeof uiOptions.componentFqn === 'string') 
      Widget = api.getComponent(uiOptions.componentFqn);          
        
    if(typeof uiWidget === 'string' && Widget === null) 
      Widget = api.getComponent(uiWidget);

    if(typeof uiWidget === 'string' && Widget === null && Widgets[uiWidget] !== null ) 
      Widget = Widgets[uiWidget];
     
    if(Widget) {
      return (<Widget {...this.props} />)
    }

    
    
    return (
      <Paper className={classes.root} key={key} >
        <Typography gutterBottom>{titleText}</Typography>        
        {toolbar}        
        <Typography gutterBottom component="p">{description}</Typography>        
        {properties.map(element => element.content)}        
      </Paper>
    );
  }
}

const MaterialObjectTemplate = compose(
  withApi,
  withStyles(ObjectTemplate.styles),
  withTheme)(ObjectTemplate)

const MaterialObjectTemplateFunction = (props) => {
  return (<MaterialObjectTemplate {...props} />)
}
export default MaterialObjectTemplateFunction