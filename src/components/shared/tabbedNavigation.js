import React, { Component } from 'react';
import { Icon, Popover, MenuItem } from '@material-ui/core';
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
import { getUiOptions } from '../reactory/form/utils';


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
      value: 0,
      anchorEl: null
    }

    props.api.log(`TabbedNavComponent.constructor(props, context)`, { props, context });
  }

  componentDidMount(){
    //sync root path with selected item index
    const { api, formContext, uiSchema } = this.props;

    let options = getUiOptions(uiSchema);
    if(options.activeTab && typeof options.activeTab === "string") {      
      try {
        let activeTab = api.utils.template(options.activeTab)({...this.props});
      } catch (templateError) {
        api.log(`Error parsing template`)
      }
      
    }
  }

  componentWillReceiveProps(nextProps) {
    this.props.api.log(`TabbedNavComponent.componentWillReceiveProps(nextProps)`, { nextProps });
  }

  componentDidUpdate() {
    this.props.api.log(`TabbedNavComponent.componentDidUpdate(nextProps)`, { props: this.props });
  }

  render() {
    const { props, theme, state } = this;
    const { formData, uiSchema, api, formContext } = props;
    const that = this;
    const uiOptions = uiSchema["ui:options"] || {};
    const classes = props.classes;
    let _tabs = [];
    let _tabComponents = [];
    let _tabPannels = [];
    let _additionalMenuItems = [];

    api.log('TabbedNavigationComponent: RENDER', { uiSchema, formContext, uiOptions });

    if (isArray(formData) === true) {
      //making the assumption the data array contains the tabs definition
      _tabs = [...formData];
    }

    if (uiOptions.tabs && isArray(uiOptions.tabs) === true) {
      _tabs = [..._tabs, ...uiOptions.tabs];
    }

    const EmptyTab = (tab) => {
      return <Typography>NO TAB FOR {tab.componentFqn}</Typography>;
    }

    const handleChange = (event, newValue) => {
      this.setState({ value: newValue });
    };

    const showMenu = (event) => {
      event.stopPropagation();
      this.setState({
        anchorEl: event.currentTarget
      });
    }

    const closeMenu = () => {
      this.setState({
        anchorEl: null
      });
    }

    const handleMenuItemClick = (index) => {
      closeMenu();
      this.setState({
        value: index
      });
    }

    if (_tabs.length > 0) {
      _tabComponents = _tabs.map((tab, index) => {
        api.log('TabbedNavigationComponent: TAB', tab, 'debug');
        let MainComponentToMount = api.getComponent(tab.componentFqn);
        let componentFound = true;
        if (MainComponentToMount === null || MainComponentToMount === undefined) {
          componentFound = false;
          MainComponentToMount = api.getComponent("core.NotFound");
        }

        let mainComponentProps = { key: index };

        if (componentFound === true) {
          mainComponentProps = { ...tab.componentProps };
          if (tab.componentPropsMap) {
            mainComponentProps = { ...mainComponentProps, ...api.utils.objectMapper(props, tab.componentPropsMap) };
          }
          api.log('TabbedNavigationComponent: COMPONENT', { MainComponentToMount, mainComponentProps }, 'debug');
        } else {
          mainComponentProps.message = `Could not find the component ${tab.componentFqn} as MainComponent`;
        }

        // ADDITIONAL COMPONENTS TO MOUNT
        const additionalComponents = tab.additionalComponents || [];
        const additionalComponentsToMount = additionalComponents.map(({ componentFqn, componentProps, componentPropsMap }, additionalComponentIndex) => {
          let ComponentToMount = api.getComponent(componentFqn);
          api.log('TabbedNavigationComponent: ADDITIONALCOMPONENT', { componentProps, componentFqn }, 'debug');
          let additionalComponentFound = true;
          if (ComponentToMount === null || ComponentToMount === undefined) {
            additionalComponentFound = false;
            ComponentToMount = api.getComponent("core.NotFound");
          }

          let mergedProperties = {};

          if (componentPropsMap) {
            mergedProperties = api.utils.objectMapper(props, componentPropsMap)
          }


          if (additionalComponentFound === true) return <ComponentToMount {...{ ...componentProps, ...mergedProperties, key: additionalComponentIndex }} />
          else return <ComponentToMount message={`Could not load component ${componentFqn}, please check your registry loaders and namings`} key={additionalComponentIndex} />
        });

        let newPanel = index === state.value ? (
          <TabPanel value={state.value} index={index} key={`panel_${index}`}>
            <MainComponentToMount {...mainComponentProps} />
            {additionalComponentsToMount}
          </TabPanel>) : (
            <TabPanel value={state.value} index={index} key={`panel_${index}`}>
              <Typography>Not Visible Yet</Typography>
            </TabPanel>);

        _tabPannels.push(newPanel);

        if (index <= 2) {
          // Only add 3 tab items
          // return <Tab
          //   label={tab.title}
          //   {...a11yProps(index)}
          //   value={index}
          //   key={index}
          //   onClick={() => this.setState({ content: "Two" })}
          // />

          return <Tab label={tab.title} {...a11yProps(index)} key={index} value={index} onClick={() => this.setState({ value: index })} />

          // BU
          // return <Tab label={tab.title} {...a11yProps(index)} key={index} />
        } else {
          if (index == 3) {
            _additionalMenuItems.push({ index, title: tab.title });
            return <Tab icon={<Icon onClick={showMenu}>more_vert</Icon>} {...a11yProps(index)} key={index} />
          }
          _additionalMenuItems.push({ index, title: tab.title });
        }
      });
    }


    const open = Boolean(this.state.anchorEl);

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Tabs value={this.state.value} onChange={handleChange} aria-label="simple tabs example">
            {_tabComponents}
          </Tabs>
        </AppBar>

        {_tabPannels}

        <Popover
          open={open}
          anchorEl={state.anchorEl}
          onClose={closeMenu}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left"
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right"
          }}
        >
          {
            _additionalMenuItems.map(menuItem => {
              return <MenuItem onClick={() => handleMenuItemClick(menuItem.index)}>{menuItem.title}</MenuItem>
            })
          }

        </Popover>
      </div>
    );

    // BU
    // return (
    //   <div className={classes.root}>
    //     <AppBar position="static">
    //       <Tabs value={this.state.value} onChange={handleChange} aria-label="simple tabs example">
    //         {_tabComponents}
    //       </Tabs>
    //     </AppBar>
    //     {_tabPannels}
    //   </div>
    // )
  }

  static styles = (theme) => ({})
};

const TabbedNavigationComponent = compose(withApi, withRouter, withTheme, withStyles(TabbedNavComponent.styles))(TabbedNavComponent);
export default TabbedNavigationComponent;
