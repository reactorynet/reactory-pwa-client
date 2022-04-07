import React, { Component, Fragment } from 'react';
import { compose } from 'redux';
import { withStyles, withTheme } from '@mui/styles';
import { withApi } from '../../../api/ApiProvider';
import { template, isNil, isEmpty, isArray } from 'lodash';
import * as Widgets from '../widgets';
import {
  Button,
  Typography,
  AccordionSummary,
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
} from '@mui/material';

const MaterialObjectTemplateStyles = (theme) => ({
    root: {
      padding: theme.spacing(1),
      margin: theme.spacing(1)
    }
  })

const MaterialObjectTemplateHOC = (props) => {

      
  
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
      idSchema,
      uiSchema, 
      reactory, 
      formData, 
      formContext 
    } = props;

    
    
    // //console.log('Object template field', { props: this.props, uiSchema });
    let titleText = title && title.indexOf("$") >= 0 ? template(title)({formData: props.formData}) : title;    
            
    const uiOptions = uiSchema['ui:options'] || null;
    const uiWidget = uiSchema['ui:widget'] || null;
    const uiToolbar = uiSchema['ui:toolbar'] || null;    

    let _componentName = 'default';


    let Widget = null;
    let toolbar = null;

    if(uiToolbar){
        if(isArray(uiToolbar.buttons) === true) {
          const buttons = uiToolbar.buttons.map((button) => {
            const api = formContext.api
            const onRaiseCommand = ( evt ) => {                      
              if(api) reactory.raiseFormCommand(button.command,  { formData: formData, formContext: formContext });              
            };            
            return (<Tooltip key={button.id} title={button.tooltip || button.id}><IconButton color={button.color || "secondary"} onClick={onRaiseCommand}><Icon>{button.icon}</Icon></IconButton></Tooltip>)
          });
          toolbar = (<Toolbar>{buttons}</Toolbar>);
        }
    }
    
    if(hidden === true) {
      return <Fragment>{children}</Fragment>
    }
    
    if(uiOptions && uiOptions.componentFqn && typeof uiOptions.componentFqn === 'string')  {
      Widget = reactory.getComponent(uiOptions.componentFqn);
      _componentName = uiOptions.componentFqn;
    }
        
    if(typeof uiWidget === 'string' && Widget === null)  {
      Widget = reactory.getComponent(uiWidget);
      _componentName = uiWidget;
    }

    if(typeof uiWidget === 'string' && Widget === null && Widgets[uiWidget] !== null ) {
      Widget = Widgets[uiWidget];
      _componentName = uiWidget;
    }
     
    let _props = {...props};
    
    if(uiOptions && uiOptions.props) {
      _props = {..._props, ...uiOptions.props };
    }
    
    if(uiOptions && uiOptions.componentPropsMap) {
      let mappedProps = reactory.utils.objectMapper(_props, uiOptions.componentPropsMap);
      if(mappedProps) {
        _props = {..._props, ...mappedProps}
      }
    }

    if(uiOptions &&  uiOptions.propsMap) {
      let mappedProps = reactory.utils.objectMapper(_props, uiOptions.propsMap);
      if(mappedProps) {
        _props = {..._props, ...mappedProps}
      }
    }

    if(Widget) {
      return (<Widget {..._props} />)
    }

    let signature = `${formContext.signature}\n\t<${_componentName} id=${idSchema.$id} />`;

    
    reactory.log(`MaterialObjectTemplate ${signature}`, { props }, 'debug');

    let ContainerComponent = Paper;
    let ContainerStyles = {};

    if(uiOptions && uiOptions.container) {      
      if( typeof uiOptions.containerStyles === 'object') {
        ContainerStyles = { ...uiOptions.containerStyles }
      }      

      switch(uiOptions.container) {
        case "React.Fragment":
        case "Fragment": {
          ContainerComponent = React.Fragment;
          break;
        }
        case "div": {          
          ContainerComponent = (props) => {             
            return (<div className={props.className} key={key} style={props.style || {}}>{props.children}</div>) 
          }
          break;
        }
        case "Custom" : {
          ContainerComponent = reactory.getComponent(uiOptions.componentFqn);
          break;
        }
        case "Paper": 
        default: {
          ContainerComponent = Paper;
          break;
        }
      }
    }

    if(uiOptions && uiOptions.style) {
      ContainerStyles = { ...uiOptions.style, ...ContainerStyles }
    }
            
    return (
      <ContainerComponent className={classes.root} key={key} style={ContainerStyles}>
        { isNil(titleText) === false && isEmpty(titleText) === false ? <Typography gutterBottom>{titleText}</Typography> : null }
        {isNil(description) === false ? <Typography gutterBottom component="p">{template(description)({ formData: props.formData })}</Typography> : null }
        {toolbar}
        {properties.map(element => element.content)}
      </ContainerComponent>
    );  
}

const MaterialObjectTemplate = compose(
  withApi,
  withStyles(MaterialObjectTemplateStyles),
  withTheme)(MaterialObjectTemplateHOC)

const MaterialObjectTemplateFunction = (props) => {
  return (<MaterialObjectTemplate {...props} />)
};
export default MaterialObjectTemplateFunction