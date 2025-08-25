import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { Icon, Popover, MenuItem, Theme } from '@mui/material';
import { template } from 'lodash';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';

import classNames from 'classnames';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Button, Toolbar } from '@mui/material';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { getUiOptions } from '@reactory/client-core/components/reactory/form/utils';


const PREFIX = 'TabbedNavigationComponent';

const classes = {
  selectedMenuLabel: `${PREFIX}-selectedMenuLabel`,
  prepend: `${PREFIX}-prepend`,
  selected: `${PREFIX}-selected`
};

const Root = styled('div')(({ theme }: { theme: Theme }) => ({
  [`& .${classes.selectedMenuLabel}`]: {
    color: theme.palette.primary.main,
    paddingRight: theme.spacing(1.5),
    paddingLeft: theme.spacing(1)
  },

  [`& .${classes.prepend}`]: {
    // color: 'rgb(34, 39, 50)',
    opacity: 0.7,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1)
  },

  [`& .${classes.selected}`]: {
    // color: 'rgb(34, 39, 50)',
    opacity: 1,
    paddingLeft: theme.spacing(1)
  }
}));

const CustomTab = (props) => {

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

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const TabbedNavComponent = (props: any) => {
  const theme = useTheme();
  const { reactory, formContext, uiSchema, formData } = props;
  let options = getUiOptions(uiSchema);
  let activeTab = null;

  if (options.activeTab && typeof options.activeTab === "string") {
    try {
      activeTab = reactory.utils.template(options.activeTab)({ ...props });
    } catch (templateError) {
      reactory.log(`Error parsing template`)
    }
  }

  const [state, setState] = React.useState({
    value: 0,
    anchorEl: null,
    activeTab,
    activeSubTab: '',
  });
 

  const that = { setState };
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
      const ButtonComponent = reactory.getComponent(fqn);
      if (ButtonComponent) _buttons.push(<ButtonComponent {...props} key={bIdx} />)
    })
  }

  reactory.log('TabbedNavigationComponent: RENDER', { uiSchema, formContext, uiOptions, _buttons });

  if (Array.isArray(formData) === true) {
    //making the assumption the data array contains the tabs definition
    _tabs = [...formData];
  }

  if (uiOptions.tabs && Array.isArray(uiOptions.tabs) === true) {
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
    setState({ ...state, activeTab, activeSubTab: '' });
  };

  const handleMenuItemClick = (menuItem) => {

    (menuItem.tab && menuItem.tab.route) ? props.history.push(menuItem.tab.route) : setState({ ...state,
      activeTab: menuItem.tab.id,
      activeSubTab: menuItem.tab.id
    });
  }

  if (_tabs.length > 0) {
    _tabComponents = _tabs.map((tab, index) => {
      reactory.log('TabbedNavigationComponent: TAB', tab);
      let MainComponentToMount = reactory.getComponent(tab.componentFqn);
      let componentFound = true;
      if (MainComponentToMount === null || MainComponentToMount === undefined) {
        componentFound = false;
        MainComponentToMount = reactory.getComponent("core.NotFound");
      }

      let mainComponentProps: any = { key: tab.id || index };

      if (componentFound === true) {
        mainComponentProps = { ...tab.componentProps };
        if (tab.componentPropsMap) {
          mainComponentProps = { ...mainComponentProps, ...reactory.utils.objectMapper(props, tab.componentPropsMap) };
        }
        reactory.log('TabbedNavigationComponent: COMPONENT', { MainComponentToMount, mainComponentProps });
      } else {
        mainComponentProps.message = `Could not find the component ${tab.componentFqn} as MainComponent`;
      }

      // ADDITIONAL COMPONENTS TO MOUNT
      const additionalComponents = tab.additionalComponents || [];
      const additionalComponentsToMount = additionalComponents.map(({ componentFqn, componentProps, componentPropsMap }, additionalComponentIndex) => {
        let ComponentToMount = reactory.getComponent(componentFqn);
        reactory.log('TabbedNavigationComponent: ADDITIONALCOMPONENT', { componentProps, componentFqn });
        let additionalComponentFound = true;
        if (ComponentToMount === null || ComponentToMount === undefined) {
          additionalComponentFound = false;
          ComponentToMount = reactory.getComponent("core.NotFound");
        }

        let mergedProperties = {};

        if (componentPropsMap) {
          mergedProperties = reactory.utils.objectMapper(props, componentPropsMap)
        }

        if (additionalComponentFound === true) return <ComponentToMount {...{ ...componentProps, ...mergedProperties, key: additionalComponentIndex }} />
        else return <ComponentToMount message={`Could not load component ${componentFqn}, please check your registry loaders and namings`} key={additionalComponentIndex} />
      });

      let newPanel = (tab.id || index) === state.activeTab ? (
        <TabPanel
          value={state.activeTab}
          index={(tab.id || index)}
          key={`panel_${(tab.id || index)}`}>
          <MainComponentToMount {...mainComponentProps} />
          {additionalComponentsToMount}
        </TabPanel>) : (
        <TabPanel
          value={state.activeTab}
          index={(tab.id || index)}
          key={`panel_${(tab.id || index)}`}>
        </TabPanel>);

      _tabPannels.push(newPanel);


      if (index <= _visibleTabCount - 1) {



        const onTabClicked = () => {
          setState({ ...state, activeTab: (tab.id || index) });
          if (tab.route) props.history.push(tab.route);
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

  const open = Boolean(state.anchorEl);
  return (
    <Root className={classes.root}>
      <AppBar position="static" color="transparent">
        <Toolbar>
          <Tabs
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
              },
            }}
            value={state.activeTab}
            onChange={handleChange}
            aria-label=""
          >
            {_tabComponents}
          </Tabs>
          {_buttons}
        </Toolbar>
      </AppBar>
      {_tabPannels}
      {_components}
    </Root>
  );
};
//@ts-ignore
const TabbedNavigationComponent = compose(withReactory)(TabbedNavComponent);
export default TabbedNavigationComponent;
