import React, { Component, useState } from 'react';
import { Icon, Popover, MenuItem } from '@material-ui/core';
import { template } from 'lodash';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Link, withRouter } from 'react-router-dom';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { Button, Toolbar } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import ApiProvider, { withApi } from '@reactory/client-core/api/ApiProvider';
import { isArray } from 'util';
import { getUiOptions } from '../reactory/form/utils';


const useStyles = makeStyles((theme) => ({

  

  selectedMenuLabel: {
    color: theme.palette.primary.main,
    paddingRight: theme.spacing(1.5),
    paddingLeft: theme.spacing(1)
  },
  prepend: {
    // color: 'rgb(34, 39, 50)',
    opacity: 0.7,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1)
  },
  selected: {
    // color: 'rgb(34, 39, 50)',
    opacity: 1,
    paddingLeft: theme.spacing(1)
  }

}));

const CustomTab = (props) => {
  const classes = useStyles();
  const [anchorElm, setAnchorElm] = useState(null);

  const tabButtonClickHandler = (event) => {
    event.stopPropagation();
    setAnchorElm(event.currentTarget);
  }

  const closeMenu = () => {
    setAnchorElm(null);
  }

  const menuItemSelectedHandler = (menuItem) => {
    closeMenu();
    props.menuItemSelected(menuItem)
  }

  let SelectedItem = null;
  const selectedMenuItem = props.menuItems.find(mi => mi.index == props.selectedItem);
  if (selectedMenuItem)
    SelectedItem = (<span className={classes.selectedMenuLabel}>{selectedMenuItem.title}</span>)

  let menuPrepend = null;
  if (props.prepend)
    menuPrepend = (<span className={(SelectedItem ? classNames(classes.prepend, classes.selected) : classes.prepend)}>{props.prepend}</span>)

  return (
    <Button onClick={tabButtonClickHandler}>
      {menuPrepend}
      <Icon color="primary">more_vert</Icon>
      {SelectedItem}
      <Popover
        open={anchorElm != null}
        anchorEl={anchorElm}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        key={props.key}
      >
        {
          props.menuItems.map(menuItem => {
            return <MenuItem onClick={() => menuItemSelectedHandler(menuItem)}>{menuItem.title}</MenuItem>
          })
        }
      </Popover>
    </Button>
  )
}

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
    super(props);
    const { api, formContext, uiSchema } = props;
    let options = getUiOptions(uiSchema);
    let activeTab = null;

    if (options.activeTab && typeof options.activeTab === "string") {
      try {
        activeTab = api.utils.template(options.activeTab)({ ...this.props });
      } catch (templateError) {
        api.log(`Error parsing template`)
      }
    }

    this.state = {
      value: 0,
      anchorEl: null,
      activeTab,
      activeSubTab: '',
    }
    props.api.log(`TabbedNavComponent.constructor(props, context)`, { props, context });
  }

  componentDidCatch(error) {
    this.props.api.log(`Caught out of boundary error TabbedNavigation Component`, { error }, 'error')
  }


  render() {
    const { props, theme, state } = this;
    const { formData, uiSchema, api, formContext } = props;
    const that = this;
    const uiOptions = uiSchema["ui:options"] || {};
    const classes = props.classes;
    let _tabs = props.tabs || [];
    let _tabComponents = [];
    let _tabPannels = [];
    let _additionalMenuItems = [];

    let _visibleTabCount = 10;
    let _menuLabelText = '';

    let _components = [];
    let _buttons = [];

    if (uiOptions.buttons) {
      uiOptions.buttons.forEach((fqn, bIdx) => {
        const ButtonComponent = api.getComponent(fqn);
        if (ButtonComponent) _buttons.push(<ButtonComponent {...this.props} key={bIdx} />)
      })
    }

    api.log('TabbedNavigationComponent: RENDER', { uiSchema, formContext, uiOptions, _buttons });

    if (Array.isArray(formData) === true) {
      //making the assumption the data array contains the tabs definition
      _tabs = [...formData];
    }

    if (uiOptions.tabs && isArray(uiOptions.tabs) === true) {
      _tabs = [..._tabs, ...uiOptions.tabs];
    }

    if (uiOptions.numberOfVisibleTabs)
      _visibleTabCount = uiOptions.numberOfVisibleTabs;

    if (uiOptions.tabMenuLabel)
      _menuLabelText = uiOptions.tabMenuLabel;

    const EmptyTab = (tab) => {
      return <Typography>NO TAB FOR {tab.componentFqn}</Typography>;
    }

    const handleChange = (event, activeTab) => {
      that.setState({ activeTab, activeSubTab: '' });
    };

    const handleMenuItemClick = (menuItem) => {

      (menuItem.tab && menuItem.tab.route) ? that.props.history.push(menuItem.tab.route) : that.setState({
        activeTab: menuItem.tab.id,
        activeSubTab: menuItem.tab.id
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


        if (index <= _visibleTabCount - 1) {



          const onTabClicked = () => {
            that.setState({ activeTab: (tab.id || index) }, () => {

              if (tab.route) that.props.history.push(tab.route);
            });
          }

          return <Tab label={tab.title} {...a11yProps(index)} key={(tab.id || index)} value={(tab.id || index)} onClick={onTabClicked} />
        } else {
          _additionalMenuItems.push({ index: (tab.id || index), title: tab.title, tab });
          if (index == _visibleTabCount) {

            return <Tab
              {...a11yProps(index)}
              key={"more_vert"}
              value={state.activeSubTab}
              component={() => {
                return <CustomTab
                  key={'more_vert_custom'}
                  menuItemSelected={handleMenuItemClick}
                  menuItems={_additionalMenuItems}
                  selectedItem={state.activeTab}
                  prepend={_menuLabelText}
                />
              }}
            />
          }
        }
      });
    }

    const open = Boolean(this.state.anchorEl);
    return (
      <div className={classes.root}>
        <AppBar position="static" color="transparent">
          <Toolbar>
            <Tabs classes={{ indicator: classes.indicator }} value={this.state.activeTab} onChange={handleChange} aria-label="">
              {_tabComponents}
            </Tabs>
            {_buttons}
          </Toolbar>
        </AppBar>

        {_tabPannels}
        {_components}
      </div>
    );
  }

  static styles = (theme) => {
    return {
      indicator: {
        backgroundColor: theme.palette.primary.main,
      }
    }
  }
};

const TabbedNavigationComponent = compose(withApi, withRouter, withTheme, withStyles(TabbedNavComponent.styles))(TabbedNavComponent);
export default TabbedNavigationComponent;
