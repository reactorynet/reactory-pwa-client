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
import ApiProvider, { withApi } from 'api/ApiProvider';
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
  }

  render() {
    const { props, theme, state } = this;
    const { formData, uiSchema, api } = props;

    const uiOptions = uiSchema["ui:options"] || {};

    api.log('TabbedNavigationComponent: RENDER', { uiSchema });
    api.log('TabbedNavigationComponent: OPTIONS', uiOptions);

    let _tabs = [];
    let _tabPannels = [];

    if (uiOptions.tabs && isArray(uiOptions.tabs) === true) {
      _tabs = uiOptions.tabs.map((tab, index) => {

        api.log('TabbedNavigationComponent: TAB', tab);

        const MainComponentToMount = api.getComponent(tab.componentFqn);
        const mainComponentProps = { ...tab.componentProps };
        api.log('TabbedNavigationComponent: COMPONENT', MainComponentToMount);

        // ADDITIONAL COMPONENTS TO MOUNT
        const additionalComponents = tab.additionalComponents || [];

        const additionalComponentsToMount = additionalComponents.map(({ componentFqn, componentProps }) => {
          const ComponentToMount = api.getComponent(componentFqn);

          api.log('TabbedNavigationComponent: ADDITIONALCOMPONENT', { componentProps, componentFqn });

          return <ComponentToMount {...componentProps}/>
        });

        const newPanel = <TabPanel value={this.state.value} index={index}>
          <MainComponentToMount {...mainComponentProps} />
          {additionalComponentsToMount}
        </TabPanel>

        _tabPannels.push(newPanel);

        return <Tab label={tab.title} {...a11yProps(index)} />
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
            {_tabs}
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
