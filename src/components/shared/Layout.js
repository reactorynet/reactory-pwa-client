import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { isNil } from 'lodash';
import {
  Grid,
  Typography,
  Paper,
} from '@material-ui/core';

import { withTheme, withStyles } from '@material-ui/core/styles';
import { withApi, ReactoryApi } from '../../api/ApiProvider'

const defaultLayout = {
  main: {
    container: true,
    md: 12,
    sm: 12,    
    children: {
      rowMain: {
        item: true,
        md: 12,
        sm: 12,
        component: (<p>Empty Component</p>),        
      }
    },
    args: {
      key: 'message',
      value: {
        type: 'string',
        message: 'Component not set'
      }
    }
  }
};  

class Layout extends Component {

  static styles = theme => ({
    spinning: {

    }
  });

  static propTypes = {
    layout: PropTypes.object
  }

  static defaultProps = {
    layout: defaultLayout
  }

  render(){
    const layoutDef = this.props.layout
    const { api } = this.props;
    debugger
    const components = Object.keys(layoutDef).map(( key ) => {
      const containerDef = layoutDef[key]
      const gridProps = {
        ...containerDef
      } 
      if(gridProps.args) {
        delete gridProps.args
      }

      let childLayouts = [];
      if(gridProps.children) { 
        delete gridProps.children
        childLayouts = Object.keys(containerDef.children).map((child) => {
          return (<Layout layout={containerDef.children[child]} api={api} />)
        })
      }

      let ApiComponent = null
      if(gridProps.componentFqn) {
        ApiComponent = api.getComponent(gridProps.componentFqn);
      }

      if(gridProps.component) {
        ApiComponent = gridProps.component
      }

      return (
      <Grid {...gridProps}>
         {childLayouts}
         {isNil(ApiComponent) ? <p>No component</p> : <ApiComponent />} 
      </Grid>);
    });
    
    return <Grid container spacing={0}>{components}</Grid>;
  }
}

export const LayoutThemed = compose(
  withApi,
  withTheme(),
  withStyles(Layout.styles)
)(Layout)



export const CenteredContainer = ( props ) => {
  let attrs = {...props};
  attrs['children'] = undefined;
  return (
    <Grid container {...attrs}>
      <Grid item xs={12} lg={12}>
        {props.children}
      </Grid>
    </Grid>
  )
};

export const SingleColumnLayout = CenteredContainer;

export const TwoColumnGrid = ( props ) => {
  let attrs = {...props};
  attrs['children'] = undefined;

  return (
    <Grid container {...attrs} alignItems="center">
      {props.children.map(child => {
        return(<Grid item xs={12} lg={6} alignItems="center">
          {child}
        </Grid>)
      })}      
    </Grid>
  )
};

export const paperStyles = {  
  maxWidth: 900,
  margin: '25px 5px 25px 5px',  
  padding: 20,
  textAlign: 'center',
  display: 'inline-block',  
};

export const textStyle = {
  width: '100%',
  marginTop: '10px'
}

export const centered = {
  width:'100%',
  height:'auto',
  display: 'flex',
  justifyContent: 'center'
};

export const BasicContainer = ( props ) => {

  let attrs = {...props};
  if(attrs.style) attrs.style = {...paperStyles, ...attrs.style};
  else attrs.style = {...paperStyles};
  attrs['children'] = undefined;

  return (
    <Paper {...attrs}>
      {props.title ? <Typography variant="button">{props.title}</Typography> : null}
      {props.children}
    </Paper>
  )

};


export default {
  LayoutThemed,
  CenteredContainer,
  TwoColumnGrid,
  BasicContainer,
} 
