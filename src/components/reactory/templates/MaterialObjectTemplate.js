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
  Input,
  Toolbar,
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
    console.log('Object template field', { props: this.props });
    let titleText = title && title.indexOf("$") >= 0 ? template(title)({formData: this.props.formData}) : title;
    const toggleExpand = () => { this.setState({ expanded: !this.state.expanded }, ()=>{
      if(containerProps && containerProps.onExpand) containerProps.onExpand(index)
    });};

   
    
    let toolbar = null          
    toolbar = (
        <Toolbar>        
          <Typography variant="h5" align="left">{titleText}</Typography>          
          { uiSchema && uiSchema.toolbar && uiSchema.toolbar.buttons && uiSchema.toolbar.buttons.map((button) => {
            const onRaiseCommand = ( command ) => {
              console.log('Raising Toolbar Command');
              api.onFormCommand(command, { formData, formContext });
            }            
            return (<Button variant={button.variant || "link"} color={button.color || "default"} onClick={onRaiseCommand}><Icon>{button.icon}</Icon></Button>)
          })}        
        </Toolbar>
    )
                 
    return (
      <Paper className={classes.root} key={key} >
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