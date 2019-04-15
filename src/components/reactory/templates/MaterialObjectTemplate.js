import React, { Component, Fragment } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import { template } from 'lodash';
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
      padding: theme.spacing.unit,
      margin: theme.spacing.unit
    }
  })

  constructor(props, context) {
    super(props, context)
    this.state = {
      expanded: props.expanded === true
    }
  }

  
  render() {
    const { title, description, properties, classes, key, disabled, containerProps, index, uiSchema, api, formData, formContext } = this.props
    // //console.log('Object template field', { props: this.props, uiSchema });
    let titleText = title && title.indexOf("$") >= 0 ? template(title)({formData: this.props.formData}) : title;
    const toggleExpand = () => { this.setState({ expanded: !this.state.expanded }, ()=>{
      if(containerProps && containerProps.onExpand) containerProps.onExpand(index)
    });};

   
    
    let toolbar = null          
    if( uiSchema && uiSchema['ui:toolbar']){
      ////console.log('Toolbar detected', {toolb: uiSchema['ui:toolbar']});
      if(uiSchema && uiSchema['ui:toolbar']){    
        const buttons = uiSchema['ui:toolbar'].map((button) => {
          const api = formContext.api
          const onRaiseCommand = ( evt ) => {        
            ////console.log('Raising Toolbar Command', api);
            if(api) api.raiseFormCommand(button.command, { formData: formData, formContext: formContext });
            //else //console.log('No API to handle form command');
          }            
          return (<Tooltip key={button.id} title={button.tooltip || button.id}><IconButton color={button.color || "secondary"} onClick={onRaiseCommand}><Icon>{button.icon}</Icon></IconButton></Tooltip>)
        });
        toolbar = (
          <Toolbar>
            {buttons}
          </Toolbar>)
      }         
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
  withTheme())(ObjectTemplate)

const MaterialObjectTemplateFunction = (props) => {
  return (<MaterialObjectTemplate {...props} />)
}
export default MaterialObjectTemplateFunction