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



    const { api, formContext, uiSchema } = props;

    let options = getUiOptions(uiSchema);
    let activeTab = null;

    if(options.activeTab && typeof options.activeTab === "string") {
      try {
        activeTab = api.utils.template(options.activeTab)({...this.props});        
      } catch (templateError) {
        api.log(`Error parsing template`)
      }
    }

    this.state = {
      value: 0,
      anchorEl: null,
      activeTab,
    }
    props.api.log(`TabbedNavComponent.constructor(props, context)`, { props, context });
  }

  componentDidMount(){
    //sync root path with selected item index   
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

    const handleChange = (event, activeTab) => {
      that.setState({ activeTab });
    };

    const showMenu = (event) => {
      event.stopPropagation();
      that.setState({
        anchorEl: event.currentTarget
      });
    }

    const closeMenu = () => {
      that.setState({
        anchorEl: null
      });
    }

    const handleMenuItemClick = (menuItem) => {
      closeMenu();
      (menuItem.tab && menuItem.tab.route) ? that.props.history.push(menuItem.tab.route) : that.setState({
        activeTab: menuItem.tab.id
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

        let mainComponentProps = { key: tab.id || index };

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

        let newPanel = (tab.id || index) === state.activeTab ? (
          <TabPanel value={state.activeTab} index={(tab.id || index)} key={`panel_${(tab.id || index)}`}>
            <MainComponentToMount {...mainComponentProps} />
            {additionalComponentsToMount}
          </TabPanel>) : (
            <TabPanel value={state.activeTab} index={(tab.id || index)} key={`panel_${(tab.id || index)}`}>
              <Typography>Not Visible Yet</Typography>
            </TabPanel>);

        _tabPannels.push(newPanel);

        if (index <= 2) {          
          return <Tab label={tab.title} {...a11yProps(index)} key={(tab.id || index)} value={(tab.id || index)} onClick={() => (tab.route ? that.props.history.push(tab.route) : that.setState({ activeTab: (tab.id || index) })) } />
        } else {
          if (index == 3) {
            _additionalMenuItems.push({ index: (tab.id || index), title: tab.title, tab });
            return <Tab icon={<Icon onClick={showMenu}>more_vert</Icon>} {...a11yProps(index)} key={"more_vert"} />
          }
          _additionalMenuItems.push({ index: (tab.id || index), title: tab.title, tab });
        }
      });
    }


    const open = Boolean(this.state.anchorEl);

    let _components = [];
    

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Tabs value={this.state.activeTab} onChange={handleChange} aria-label="simple tabs example">
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
              return <MenuItem onClick={() => handleMenuItemClick(menuItem)}>{menuItem.title}</MenuItem>
            })
          }

        </Popover>
        { _components }
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
