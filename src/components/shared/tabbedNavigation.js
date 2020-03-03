import React, { Component } from 'react';
import { Icon } from '@material-ui/core';
import { template } from 'lodash';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Link, withRouter } from 'react-router-dom';

import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import ApiProvider, { withApi } from '@reactory/client-core/api/ApiProvider';
import { isArray } from 'util';


function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box p={3}>{children}</Box>
    </Typography>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

class TabbedNavComponent extends Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      value: 0
    }

    props.api.log(`TabbedNavComponent.constructor(props, context)`, {props, context});
  }

  componentWillReceiveProps(nextProps) {
    this.props.api.log(`TabbedNavComponent.componentWillReceiveProps(nextProps)`, {nextProps});
  }

  componentDidUpdate(){
    this.props.api.log(`TabbedNavComponent.componentDidUpdate(nextProps)`, {props: this.props});
  }

  render() {
    const { props, theme, state } = this;
    const { formData, uiSchema, api, formContext } = props;
    const that = this;
    const uiOptions = uiSchema["ui:options"] || {};

    api.log('TabbedNavigationComponent: RENDER', { uiSchema, formContext, uiOptions });    

    let _tabs = [];
    let _tabComponents = [];
    let _tabPannels = [];
    if(isArray(formData) === true) {
      //making the assumption the data array contains the tabs definition
      _tabs = [...formData];
    }

    if (uiOptions.tabs && isArray(uiOptions.tabs) === true) {
      _tabs = [..._tabs, ...uiOptions.tabs];
    }

    const EmptyTab = (tab) => {
      return <Typography>NO TAB FOR {tab.componentFqn}</Typography>;
    }

    if(_tabs.length > 0) {        
      _tabComponents = _tabs.map((tab, index) => {
        api.log('TabbedNavigationComponent: TAB', tab, 'debug');
        let MainComponentToMount = api.getComponent(tab.componentFqn);
        let componentFound = true;
        if(MainComponentToMount === null || MainComponentToMount === undefined) {
          componentFound = false;
          MainComponentToMount = api.getComponent("core.NotFound");
        }
        
        let mainComponentProps = {};

        if(componentFound === true) {
          mainComponentProps = { ...tab.componentProps };
          if(tab.componentPropsMap) {
            mainComponentProps = { ...mainComponentProps, ...api.utils.objectMapper(props, tab.componentPropsMap) };
          }
          api.log('TabbedNavigationComponent: COMPONENT', { MainComponentToMount, mainComponentProps }, 'debug');          
        } else {
          mainComponentProps.message = `Could not find the component ${tab.componentFqn} as MainComponent`;
        }
        

        // ADDITIONAL COMPONENTS TO MOUNT
        const additionalComponents = tab.additionalComponents || [];                       
        const additionalComponentsToMount = additionalComponents.map(({ componentFqn, componentProps }) => {
          let ComponentToMount = api.getComponent(componentFqn);
          api.log('TabbedNavigationComponent: ADDITIONALCOMPONENT', { componentProps, componentFqn }, 'debug');
          let additionalComponentFound = true;
          if(ComponentToMount === null || ComponentToMount === undefined) {
            additionalComponentFound = false;
            ComponentToMount = api.getComponent("core.NotFound");
          }

          if(additionalComponentFound === true) return <ComponentToMount {...componentProps}/>
          else return <ComponentToMount message={`Could not load component ${tab.componentFqn}, please check your registry loaders and namings`}/>
        });

        let newPanel = index === state.value ? (
        <TabPanel value={state.value} index={index} >
          <MainComponentToMount {...mainComponentProps} />
          {additionalComponentsToMount}
        </TabPanel>) : (
        <TabPanel value={state.value} index={index} >
            <Typography>Not Visible Yet</Typography>
        </TabPanel>); 

        _tabPannels.push(newPanel);
        return <Tab label={tab.title} {...a11yProps(index)} key={index} />
      })
    }

    const classes = props.classes;

    const handleChange = (event, newValue) => {
      this.setState({ value: newValue });
    };


    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Tabs value={this.state.value} onChange={handleChange} aria-label="simple tabs example">
            {_tabComponents}
          </Tabs>
        </AppBar>
        {_tabPannels}
      </div>
    )
  }

  static styles = (theme) => ({})
};

const TabbedNavigationComponent = compose(withApi, withRouter, withTheme, withStyles(TabbedNavComponent.styles))(TabbedNavComponent);
export default TabbedNavigationComponent;
