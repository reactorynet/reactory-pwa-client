import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { isArray } from 'lodash';
import { useTheme } from '@mui/material/styles';
import {
  Avatar,
  AppBar,
  Divider,
  Drawer,
  Tooltip,
  Toolbar,
  Icon,
  IconButton,
  ListItem,
  ListItemSecondaryAction,
  Collapse,
  Typography,
  Box,
  List,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  InputBase,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import BackIcon from '@mui/icons-material/ArrowBack';
import PowerSettingIcon from '@mui/icons-material/PowerSettingsNew';
import { getAvatar } from '@reactory/client-core/components/util';
import moment from 'moment';
import ReactoryApi, { withReactory, ReactoryApiEventNames } from '@reactory/client-core/api';
import license from '@reactory/client-core/license';
import { useNavigate } from 'react-router';
import Reactory from '@reactory/reactory-core';
import localForage from 'localforage';
import { ReactoryAvatar } from './AvatarComponent';

// Configure localForage
localForage.config({
  driver: localForage.INDEXEDDB,
  name: 'reactory',
  version: 1.0,
  storeName: 'reactory_client',
  description: 'Reactory Client local database.'
});

// CSS classes for styling
const classes = {
  version: 'version',
  versionPrimary: 'version-primary'
};

// Custom hook for menu state management
const useMenuState = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [show, setShow] = useState(window === window.top);
  const [expanded, setExpanded] = useState({});
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState({ show: false, searchInput: '' });
  const [apiMetrics, setApiStatus] = useState({
    error: 0,
    slow: 0,
    ok: 0,
    total: 0,
    api_ok: true,
    isSlow: false,
    session: []
  });

  return {
    drawerOpen, setDrawerOpen,
    menuOpen, setMenuOpen,
    menuAnchor, setMenuAnchor,
    show, setShow,
    expanded, setExpanded,
    version, setVersion,
    search, setSearch,
    apiMetrics, setApiStatus
  };
};

// Cache component with proper theming
const CacheComponent = ({ reactory, classes }) => {
  const [cacheSize, setCacheSize] = useState('0.00');
  const theme = useTheme();

  const clearCache = () => {
    reactory.clearStoreAndCache();
  };

  useEffect(() => {
    localForage.getItem('reactory_apollo_cache').then((data: any) => {
      if (data) {
        const bytes = ((new TextEncoder().encode(data)).length / 100000).toPrecision(2);
        setCacheSize(bytes);
      }
    });
  }, []);

  return (
    <ListItem 
      key="reactory.cache" 
      onClick={clearCache}       
      sx={{        
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        '&:focus': {
          outline: 'none',
        },
      }}
    >
      <ListItemIcon>
        <Icon color="primary">storage</Icon>
      </ListItemIcon>
      <ListItemText
        primary={
          <span className={classes.versionPrimary}>
            {reactory.utils.humanNumber(cacheSize)} MB
          </span>
        }
        secondary={
          <span className={classes.version}>
            🚮&nbsp; Click to clear your cache
          </span>
        }
      />
    </ListItem>
  );
};

// Development mode toggle component
const ToggleDevelopComponent = ({ reactory, classes }) => {
  const theme = useTheme();
  const [version, setVersion] = useState(0);

  const toggle = () => {
    reactory.setDevelopmentMode(!reactory.$development_mode);
    reactory.emit('onReactoryDevelopmentModeChanged', reactory.isDevelopmentMode());
    setVersion(version + 1);
  };

  if (reactory.hasRole(["DEVELOPER"]) === false) {
    return null;
  }

  return (
    <ListItem 
      key="reactory.development_mode" 
      onClick={toggle}       
      sx={{        
        color: theme.palette.text.primary,
        borderBottom: 'none',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        '&:focus': {
          outline: 'none',
        },
      }}
    >
      <ListItemIcon>
        <Icon color="primary">build</Icon>
      </ListItemIcon>
      <ListItemText
        primary={<span>DEVELOPMENT</span>}
        secondary={<span>{reactory.$development_mode === true ? '(enabled)' : '(disabled)'}</span>}
      />
    </ListItem>
  );
};

// Top-right menu component
const Logged = ({ id, apiStatus, reactory, open, anchorEl }) => {
  const { menus, loggedIn } = apiStatus;
  const navigate = useNavigate();
  const menuItems = [];

  if (menus && menus.length) {
    menus.forEach((menu) => {
      if (menu.target === 'top-right') {
        menu.entries.forEach((menuItem, idx) => {
          let allow = true;
          if (isArray(menuItem.roles) && isArray(loggedIn.roles)) {
            allow = reactory.hasRole(menuItem.roles, loggedIn.roles);
          }
          if (allow === true) {
            const goto = () => navigate(menuItem.link);
            menuItems.push((
              <MenuItem key={menuItem.id || `menu_item_${idx}`} onClick={goto}>
                <ListItemIcon>
                  <Icon color="primary">{menuItem.icon}</Icon>
                </ListItemIcon>
                {menuItem.title}
              </MenuItem>
            ));
          }
        });
      }
    });
  }

  return (
    <Menu
      open={open}
      id={id}
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      {menuItems}
    </Menu>
  );
};

Logged.muiName = 'IconMenu';

// Main header component
const ApplicationHeader = ({ reactory, theme: propTheme }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const {
    SystemStatus,
    FullScreenModal,
    Loading,
    HelpListForm
  } = reactory.getComponents([
    'core.SystemStatus',
    'core.FullScreenModal',
    'core.Loading',
    'forms.HelpListForm'
  ]);

  const {
    drawerOpen, setDrawerOpen,
    menuOpen, setMenuOpen,
    menuAnchor, setMenuAnchor,
    show, setShow,
    expanded, setExpanded,
    version, setVersion,
    search, setSearch,
    apiMetrics, setApiStatus
  } = useMenuState();

  // Event handlers
  const onShowMenu = () => setShow(true);
  const onHideMenu = () => setShow(false);
  const onRouteChanged = (routeProps) => {
    reactory.log('ApiPath changed, handle in header app', routeProps);
    const { path } = routeProps;
    navigateTo(path);
  };
  const onLoginEvent = () => setVersion(version + 1);
  const onApiStatusTotalsChanged = (totals) => setApiStatus(totals);

  const navigateTo = (where = '/', toggleDrawer = false) => {
    const nav = () => {
      if (where.trim().indexOf('http') === 0) {
        window.open(where, '_new');
      } else {
        navigate(where);
      }
    };

    if (toggleDrawer === true) {
      setDrawerOpen(!drawerOpen);
    }
    nav();
  };

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);
  const handleMenu = (evt) => {
    setMenuAnchor(evt.currentTarget);
    setMenuOpen(!menuOpen);
  };

  const toggleDarkMode = () => {
    if (theme.palette.mode === 'dark') {
      localStorage.setItem("$reactory$theme_mode", 'light');
    } else {
      localStorage.setItem("$reactory$theme_mode", 'dark');
    }
    reactory.emit('onThemeChanged');
  };

  const doSearch = () => {
    if (search.searchInput && search.searchInput.trim().length > 0) {
      reactory.emit('onSearch', { query: search.searchInput.trim() });
    }
  };

  const closeSearch = () => setSearch({ ...search, show: false });

  // Menu rendering function
  const renderMenuItems = () => {
    const menuItems = [];
    const apiStatus = reactory.$user;
    const { server } = apiStatus;

    if (apiStatus?.menus?.length) {
      apiStatus.menus.forEach((menu) => {
        if (menu.target === 'left-nav') {
          menu.entries.forEach((menuItem, mid) => {
            let allow = true;
            if (isArray(menuItem.roles) && isArray(apiStatus.loggedIn.roles)) {
              allow = reactory.hasRole(menuItem.roles, apiStatus.loggedIn.roles);
            }

            if (allow === true) {
              const goto = () => navigateTo(menuItem.link, true);
              let expandButton = null;
              let subnav = null;

              if (menuItem.items && menuItem.items.length > 0) {
                const isExpanded = expanded[menuItem.id] && expanded[menuItem.id].value === true;
                
                subnav = (
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit key={`${menuItem.id || mid}-collapse`}>
                    <List component="div" disablePadding>
                      {menuItem.items.map((menu, index) => {
                        const goto = () => navigateTo(menu.link);
                        const sub_item = (
                          <ListItem 
                            key={menu.id || index} 
                            onClick={goto}
                            sx={{                              
                              color: theme.palette.text.primary,
                              paddingLeft: theme.spacing(4),
                              '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                              },
                            }}
                          >
                            <ListItemIcon>
                              {menu.icon && <Icon color="primary">{menu.icon}</Icon>}
                            </ListItemIcon>
                            <ListItemText primary={menu.title} />
                          </ListItem>
                        );

                        if (!menu.roles || menu.roles.length === 0) return sub_item;
                        if (isArray(menu.roles) && isArray(apiStatus.loggedIn.roles)) {
                          if (reactory.hasRole(menu.roles, apiStatus.loggedIn.roles)) {
                            return sub_item;
                          }
                        }
                        return null;
                      })}
                    </List>
                  </Collapse>
                );

                const toggleMenu = (e) => {
                  e.stopPropagation();
                  e.preventDefault(); 
                  let currentToggle = expanded[menuItem.id];
                  if (!currentToggle) currentToggle = { value: false };
                  currentToggle.value = !currentToggle.value;
                  const $expanded = { ...expanded };
                  $expanded[menuItem.id] = currentToggle;
                  setExpanded($expanded);
                };

                expandButton = (
                  <IconButton key={menuItem.id} onClick={toggleMenu} size="large">
                    <Icon>{isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</Icon>
                  </IconButton>
                );
              }

              menuItems.push(
                <ListItem 
                  key={menuItem.id || mid} 
                  onClick={goto}                   
                  sx={{                    
                    color: theme.palette.text.primary,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                    '&:focus': {
                      outline: 'none',
                    },
                  }}
                >
                  <ListItemIcon>
                    <Icon color="primary">{menuItem.icon}</Icon>
                  </ListItemIcon>
                  <ListItemText primary={menuItem.title} />
                  {expandButton}
                </ListItem>
              );

              if (subnav) {
                menuItems.push(subnav);
              }
            }
          });
        }
      });
    }

    // Status item
    menuItems.push(
      <ListItem 
        key="reactory.status" 
        onClick={() => setVersion(version + 1)}
        sx={{          
          color: theme.palette.text.primary,          
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <ListItemIcon>
          <Tooltip title={`Api Available @ ${moment(reactory.getUser().when).format('HH:mm:ss')} click to refresh`}>
            <Icon color="primary">rss_feed</Icon>
          </Tooltip>
        </ListItemIcon>
        <ListItemText
          primary={<span className={classes.versionPrimary}>Client ver: {reactory.props.$version}</span>}
          secondary={
            <span className={classes.version}>
              📡&nbsp;{server && server.id ? server.id : 'development'} ver: {server && server.version ? server.version : 'waiting'}
            </span>
          }
        />
      </ListItem>
    );

    // Cache and development components
    menuItems.push(<CacheComponent key="cache" reactory={reactory} classes={{}} />);
    menuItems.push(<ToggleDevelopComponent key="dev" reactory={reactory} classes={{}} />);

    return menuItems;
  };

  // Effects
  useEffect(() => {
    reactory.on(ReactoryApiEventNames.onHideMenu, onHideMenu);
    reactory.on(ReactoryApiEventNames.onShowMenu, onShowMenu);
    reactory.on(ReactoryApiEventNames.onLogin, onLoginEvent);
    reactory.on(ReactoryApiEventNames.onRouteChanged, onRouteChanged);
    reactory.on('onApiStatusTotalsChange', onApiStatusTotalsChanged);

    return () => {
      reactory.removeListener(ReactoryApiEventNames.onHideMenu, onHideMenu);
      reactory.removeListener(ReactoryApiEventNames.onShowMenu, onShowMenu);
      reactory.removeListener(ReactoryApiEventNames.onLogin, onLoginEvent);
      reactory.removeListener(ReactoryApiEventNames.onRouteChanged, onRouteChanged);
    };
  }, []);

  // Render functions
  const renderHelpInterface = () => {
    if (search.show === false) return null;
    
    return (
      <FullScreenModal open={search.show} onClose={closeSearch} title={`Searching For: ${search.searchInput}`}>
        <HelpListForm />
      </FullScreenModal>
    );
  };

  const renderSearchInterface = () => {
    if (search.show === false) return null;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', width: 400 }}>
        <InputBase
          placeholder="Search..."
          value={search.searchInput}
          onChange={(e) => setSearch({ ...search, searchInput: e.target.value })}
          onKeyPress={(e) => e.charCode === 13 && doSearch()}
          sx={{ flex: 1, color: 'inherit' }}
        />
        <IconButton onClick={doSearch} size="large">
          <Icon>search</Icon>
        </IconButton>
      </Box>
    );
  };

  const apiStatus = reactory.$user;
  const { server } = apiStatus;
  const { isSlow, total } = apiMetrics;
  const menuItems = renderMenuItems();
  const title = reactory.i18n.t(apiStatus.applicationName);

  return (
    <Box sx={{ width: '100%' }}>
      <AppBar 
        position="sticky" 
        color="inherit" 
        id="reactory_default_app_bar" 
        sx={{ visibility: show ? 'visible' : 'collapse' }}
      >
        <Toolbar variant="dense">
          <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer} size="large">
            <MenuIcon />
          </IconButton>
          
          <Typography variant="body2" color="inherit" sx={{ flex: 1 }}>
            <span>{title}</span>
            {apiMetrics.api_ok === false && (
              <span style={{ color: theme.palette.error.main }}> - OFFLINE</span>
            )}
            {isSlow === true && total > 2 && (
              <span style={{ color: theme.palette.warning.main }}>
                <Icon>sensors</Icon>
              </span>
            )}
          </Typography>

          {renderSearchInterface()}

          <IconButton onClick={toggleDarkMode} size="large">
            <Icon>{theme.palette.mode === 'dark' ? 'dark_mode' : 'light_mode'}</Icon>
          </IconButton>
          
          <Typography variant="caption">
            {reactory.hasRole(['ANON']) ? 'LOGIN' : 'LOGOUT'}
          </Typography>
          
          <IconButton
            aria-owns={menuOpen ? 'top-right' : null}
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{ 
              color: reactory.hasRole(['ANON']) ? "inherit" : 
                (reactory && reactory.muiTheme ? reactory.muiTheme.palette.success.main : "inherit")
            }}
            size="large"
          >
            <PowerSettingIcon />
            <Logged 
              open={menuOpen} 
              id="top-right" 
              anchorEl={menuAnchor}                
              reactory={reactory} 
              apiStatus={apiStatus} 
            />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer 
        variant="temporary" 
        open={drawerOpen} 
        onClose={toggleDrawer}
        anchor="left"
        sx={{
          '& .MuiDrawer-paper': {
            width: 320,
            maxWidth: 320,
            overflowX: 'hidden',            
            color: theme.palette.text.primary,
          },
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          minWidth: 260, 
          padding: theme.spacing(0, 1),          
          color: theme.palette.text.primary,
        }}>
          <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer} size="large">
            <BackIcon />
          </IconButton>
          <ReactoryAvatar />
        </Box>
        
        <Divider />
        
        <List sx={{ 
          paddingTop: 0,
          paddingBottom: 0,          
          '& .MuiListItem-root': {            
            color: theme.palette.text.primary,
            borderBottom: `1px solid ${theme.palette.divider}`,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            '&:focus': {
              outline: 'none',
            },
          },
          // Version text styling
          '& .version-primary': {
            fontSize: theme.typography.body2.fontSize,
            fontWeight: theme.typography.body2.fontWeight,
          },
          '& .version': {
            fontSize: theme.typography.caption.fontSize,
            color: theme.palette.text.secondary,
          },
        }}>
          {menuItems}
        </List>
      </Drawer>      
      {renderHelpInterface()}
    </Box>
  );
};

const ApplicationHeaderComponent = compose(withReactory)(ApplicationHeader);

export default ApplicationHeaderComponent;

