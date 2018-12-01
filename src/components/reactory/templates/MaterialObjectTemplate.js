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
    const { title, description, properties, classes, key, disabled, containerProps, index, uiSchema, api, formData } = this.props
    // console.log('Object template field', { props: this.props });
    let titleText = title && title.indexOf("$") >= 0 ? template(title)({formData: this.props.formData}) : title;
    const toggleExpand = () => { this.setState({ expanded: !this.state.expanded }, ()=>{
      if(containerProps && containerProps.onExpand) containerProps.onExpand(index)
    });};

    const onRaiseCommand = ( command ) => {
      api.onFormCommand(command, formData);
    }
    
    let toolbar = null
    if(uiSchema.toolbar){
      if(uiSchema.toolbar.buttons){
        toolbar = (
          <Fragment>
            <Divider />
            <ExpansionPanelActions>
              { uiSchema.toolbar.buttons.map((button) => {
                return (<Button variant={button.variant || "link"} color={button.color || "default"} onClick={onRaiseCommand}><Icon>{button.icon}</Icon></Button>)
              })}
            </ExpansionPanelActions>
          </Fragment>
        )
      }
    }            
    return (
      <ExpansionPanel className={classes.root} key={key} defaultExpanded={true} disabled={disabled} onChange={toggleExpand}>
        <ExpansionPanelSummary expandIcon={<Icon>expand_more</Icon>}>
          <Typography gutterBottom variant="h5" component="h2" align="left">{titleText}</Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails style={{ display: 'block' }}>
          <Typography gutterBottom component="p">{description}</Typography>
          {properties.map(element => element.content)}
        </ExpansionPanelDetails>
        { toolbar }
      </ExpansionPanel>
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