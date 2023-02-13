import React, { Component, Fragment, SyntheticEvent } from 'react';
import PropTypes, { any } from 'prop-types';
import { compose } from 'redux';
import { isArray, find } from 'lodash';
import { withTheme, makeStyles, styled } from '@mui/styles';
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
} from '@mui/material';
import { Menu, MenuItem, InputBase } from '@mui/material';
import { List, ListItemIcon, ListItemText } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import BackIcon from '@mui/icons-material/ArrowBack';
import PowerSettingIcon from '@mui/icons-material/PowerSettingsNew';
import { getAvatar } from '../util';
import moment from 'moment';
import { withReactory, ReactoryApiEventNames } from '@reactory/client-core/api';
import license from '@reactory/client-core/license';
import { useNavigate } from 'react-router';
import Reactory from '@reactory/reactory-core';
import localForage from 'localforage';

export class ISearchConfig {
  show: boolean = false;
  placeholder: string = "Search";

  constructor(params: { show: boolean, placeholder: string } = { show: false, placeholder: 'Search' }) {
    this.show = params.show || true;
    this.placeholder = params.placeholder || 'Search';
  }
}

localForage.config({
  driver: localForage.INDEXEDDB, // Force WebSQL; same as using setDriver()
  name: 'reactory',
  version: 1.0,
  //size: 4980736, // Size of database, in bytes. WebSQL-only for now.
  storeName: 'reactory_client', // Should be alphanumeric, with underscores.
  description: 'Reactory Client local database.'
});

const defaultSearchConfig = new ISearchConfig()

export const Logged = (props) => {

  const { menus, reactory, user } = props;
  const navigate = useNavigate();
  const menuItems = [];

  if (menus && menus.length) {
    menus.map((menu) => {
      if (menu.target === 'top-right') {
        menu.entries.map((menuItem) => {
          let allow = true;
          if (isArray(menuItem.roles) && isArray(user.roles)) {
            allow = reactory.hasRole(menuItem.roles, user.roles)
          }
          if (allow === true) {
            const goto = () => {
              navigate(menuItem.link)
            };
            menuItems.push((
              <MenuItem key={menuItem.id} onClick={goto}>
                <ListItemIcon><Icon color="primary">{menuItem.icon}</Icon></ListItemIcon>
                {menuItem.title}
              </MenuItem>));
          }
        });
      }

    });
  }

  return (<Menu
    open={props.open}
    id='top-right'
    anchorEl={props.anchorEl}
    anchorOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}>
    {menuItems}
  </Menu>)
}

Logged.muiName = 'IconMenu';

const SubMenus = (props) => {
  const { items = [], user, reactory, self, classes } = props;

  const submenus = [];

  const navigate = useNavigate();

  items.forEach((menu, index) => {
    let allow = true;
    if (isArray(menu.roles) && isArray(user.roles) === true) {
      allow = reactory.hasRole(menu.roles, user.roles);
    }

    if (allow === true) {
      const goto = () => navigate(menu.link);
      submenus.push(
        <ListItem key={menu.id || index} onClick={goto} style={{ cursor: 'pointer' }}>
          <ListItemIcon>
            {
              menu.icon ?
                (<Icon color="primary">{menu.icon}</Icon>)
                : null
            }
          </ListItemIcon>
          {menu.title}
        </ListItem>)
    }
  });

  return submenus;
};

const CacheButton = (props) => {

  const { reactory, classes } = props;
  const [version, setVersion] = React.useState(0);
  const [cacheSize, setCacheSize] = React.useState<string>('0.00');

  const clearCache = () => {

    reactory.clearStoreAndCache();
    setVersion(version + 1);    
  }

  React.useEffect(() => {
    localForage.getItem('reactory_apollo_cache').then(( data: string ) => {      
      const bytes: string = ((new TextEncoder().encode(data)).length / 100000).toPrecision(2);
      setCacheSize(bytes);
    });

  })

  return (
    (<ListItem key={'reactory.cache'} onClick={clearCache} button>
      <ListItemIcon>
        <Icon color="primary">storage</Icon>
      </ListItemIcon>
      <ListItemText
        primary={<span className={classes.versionPrimary}>Using {reactory.utils.humanNumber(cacheSize)} MB of local storage</span>}
        secondary={<span className={classes.version}>🚮&nbsp; Click to clear your cache</span>}
      />
    </ListItem>)
  )

}

const CacheComponent = compose(withReactory)(CacheButton);

const ToggleDevelopMode = (props: Reactory.IReactoryComponentProps) => {  
  const { reactory } = props;

  const [version, setVersion] = React.useState(0)
  const data = localStorage.getItem('') || "";

  const toggle = () => {
    reactory.setDevelopmentMode(!reactory.$development_mode);
    reactory.emit('onReactoryDevelopmentModeChanged', reactory.isDevelopmentMode());
    setVersion(version + 1);
  }

  if(reactory.hasRole(["DEVELOPER"]) === false) {
    return null;
  }


  return (<ListItem key={'reactory.development_mode'} onClick={toggle} button>
    <ListItemIcon>
      <Icon color="primary">build</Icon>
    </ListItemIcon>
    <ListItemText
      primary={<span>DEVELOPMENT</span>}
      secondary={<span>{reactory.$development_mode === true ? '(enabled)' : '(disabled)'}</span>}
    />
  </ListItem>)
};

const ToggleDevelopComponent = compose(withReactory)(ToggleDevelopMode);

/**
 * This example is taking advantage of the composability of the `AppBar`
 * to render different components depending on the application state.
 */
const ApplicationHeader = (props) => {

  const { reactory, theme } = props;

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


  const [logged, setLogged] = React.useState<boolean>(true);
  const [drawerOpen, setDrawerOpen] = React.useState<boolean>(false);
  const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
  const [menuAnchor, setMenuAnchor] = React.useState<any>(null);
  const [show, setShow] = React.useState<boolean>(window === window.top);
  const [expanded, setExpanded] = React.useState<any>({});
  const [version, setVersion] = React.useState<number>(0);
  const [search, setSearch] = React.useState<any>({ show: false, searchInput: '' });
  const [apiStatus, setApiStatus] = React.useState({
    error: 0,
    slow: 0,
    ok: 0,
    total: 0,
    api_ok: true,
    isSlow: false,
    session: []
  });

  const navigate = useNavigate();

  const classes: any = makeStyles((theme: any): any => {
    return {
      drawerHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        minWidth: '260px',
        padding: `0 ${theme.spacing(1)}`,
      },
      nested: {
        paddingLeft: theme.spacing(4),
      },
      loggedInUserAvatar: {
        height: 120,
        width: 120,
        margin: 20,
        marginLeft: 'auto',
        marginRight: 'auto'
      },
      busyIndicator: {
        outline: '1px solid black',
      },
      version: {
        fontSize: '10px',
      },
      versionPrimary: {
        fontSize: '12px',
      },
      root: {
        width: '100%',
      },
      grow: {
        flexGrow: 1,
      },
      menuItem: {
        cursor: 'pointer'
      },
      menuButton: {
        marginLeft: -12,
        marginRight: 20,
      },
      title: {
        display: 'none',
        [theme.breakpoints.up('sm')]: {
          display: 'block',
        },
      },
      search: {
        position: 'relative',
        borderRadius: theme.shape.borderRadius,
        
        marginLeft: 0,
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          marginLeft: theme.spacing(1),
          width: 'auto',
        },
      },
      searchIcon: {
        width: theme.spacing(9),
        height: '100%',
        position: 'absolute',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      inputRoot: {
        color: 'inherit',
        width: '100%',
      },
      inputInput: {
        paddingTop: theme.spacing(1),
        paddingRight: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        paddingLeft: theme.spacing(10),
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          width: 120,
          '&:focus': {
            width: 200,
          },
        },
      }
    }
  })();

  const onShowMenu = () => {
    setShow(true);
  };

  const onHideMenu = () => {
    setShow(false);
  };


  const onRouteChanged = (routeProps) => {
    reactory.log('ApiPath changed, handle in header app', routeProps);
    const { actionData, path } = routeProps;
    navigateTo(path);
  }

  const onLoginEvent = (evt) => {
    setVersion(version + 1);
  }

  const onApiStatusTotalsChanged = (totals: any) => {
    setApiStatus(totals);
  }

  const navigateTo = (where = '/', toggleDrawer = false) => {
    //console.log('Need to redirect', where);


    const nav = () => {
      if (where.trim().indexOf('http') === 0) {
        window.open(where, '_new');
      } else {
        navigate(where);
      }
    }

    if (toggleDrawer === true) {
      setDrawerOpen(!drawerOpen);
    }

    nav();
  }

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleMenu = (evt: SyntheticEvent) => {
    setMenuAnchor(evt.currentTarget)
    setMenuOpen(!menuOpen);
  };

  const loginClicked = (evt) => {
    navigateTo('/login', false);
  };

  const signOutClicked = (evt) => {
    reactory.logout();
    navigateTo('/', false)
  };


  const statusRefresh = e => {
    reactory.status().catch(e => {
      reactory.createNotification('Unable to refresh API status. API may be offline.', { type: 'warning' });
    });
  };

  const doSearch = () => {
    setSearch({ ...search, show: true });
  }

  /**
   * This is the main render entry point for the help interface.
   * Accessible to all, use the search input as keyword filter.
   */
  const renderHelpInterface = () => {
    const { show, searchInput } = search;
    const HelpListForm = reactory.getComponent('forms.HelpListForm@1.0.0');
    if (show !== true) return null;
    const closeSearch = e => setSearch({ searchInput: '', show: false })
    return (
      <FullScreenModal open={show === true} onClose={closeSearch} title={`Searching For: ${searchInput}`}>
        <HelpListForm />
      </FullScreenModal>
    );
  }

  const Menus = () => {
    // const { menus = [], target = 'left-nav', user, reactory, self, classes, append, expanded } = props;    
    let menuItems = [];
    if (menus && menus.length) {
      menus.map((menu, menu_id) => {
        if (menu.target === 'left-nav') {
          menu.entries.map((menuItem: any, mid: number) => {
            let subnav = null;
            let expandButton = null;
            let allow = false;

            if (isArray(menuItem.roles) && isArray(user.roles) === true) {
              allow = reactory.hasRole(menuItem.roles, user.roles);
            }

            if (allow === true) {
              const goto = () => {
                navigateTo(menuItem.link, true);
              };

              if (isArray(menuItem.items) === true && menuItem.items.length > 0) {
                const isExpanded = expanded[menuItem.id] && expanded[menuItem.id].value === true;
                subnav = (
                  <Collapse in={isExpanded === true} timeout="auto" unmountOnExit key={`${menuItem.id || mid}-collapse`} >
                    <List component="div" disablePadding>
                      {
                        menuItem.items.map((menu, index) => {
                          const goto = () => navigate(menu.link);
                          const sub_item = (
                            <ListItem key={menu.id || index} onClick={goto} style={{ cursor: 'pointer', paddingLeft: theme.spacing(4) }}>
                              <ListItemIcon>
                                {
                                  menu.icon ?
                                    (<Icon color="primary">{menu.icon}</Icon>)
                                    : null
                                }
                              </ListItemIcon>
                              {menu.title}
                            </ListItem>);

                          if (!menu.roles || menu.roles.length === 0) return sub_item;

                          if (isArray(menu.roles) && isArray(user.roles) === true) {
                            if (reactory.hasRole(menu.roles, user.roles) === true)
                              return sub_item;
                          }
                        })
                      }
                    </List>
                  </Collapse>
                );

                const toggleMenu = (e) => {
                  let currentToggle = expanded[menuItem.id];
                  if (!currentToggle) currentToggle = { value: false };

                  currentToggle.value = !currentToggle.value;
                  const $expanded = { ...expanded };
                  $expanded[menuItem.id] = currentToggle;
                  setExpanded($expanded);
                };

                expandButton = (
                  <IconButton key={`${menuItem.id}`} onClick={toggleMenu} size="large">
                    <Icon>{isExpanded === true ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</Icon>
                  </IconButton>
                )
              }

              menuItems.push(
                <ListItem key={menuItem.id || mid} onClick={goto} button>
                  <ListItemIcon>
                    <Icon color="primary">{menuItem.icon}</Icon>
                  </ListItemIcon>
                  {menuItem.title}
                  {expandButton ? <ListItemSecondaryAction>
                    {expandButton}
                  </ListItemSecondaryAction> : null}
                </ListItem>);

              if (subnav) {
                menuItems.push(subnav);
              }
            }
          });
        }
      });
    }

    //if (append) menuItems.push(append);
    menuItems.push(<ListItem key={'reactory.status'} onClick={statusRefresh} >
      <ListItemIcon>
        <Tooltip title={`Api Available @ ${moment(reactory.getUser().when).format('HH:mm:ss')} click to refresh`}>
          <Icon color="primary">rss_feed</Icon>
        </Tooltip>
      </ListItemIcon>
      <ListItemText
        primary={<span className={classes.versionPrimary}>Client ver: {reactory.props.$version}</span>}
        secondary={<span className={classes.version}>📡&nbsp;{server && server.id ? server.id : 'development'} ver: {server && server.version ? server.version : 'waiting'} </span>}
      />
    </ListItem>);

    menuItems.push(<CacheComponent classes={classes} />);
    menuItems.push(<ToggleDevelopComponent classes={classes} />);

    return (<>{menuItems.map((menu) => menu)}</>);
  };




  React.useEffect(() => {
    reactory.on(ReactoryApiEventNames.onHideMenu, onHideMenu);
    reactory.on(ReactoryApiEventNames.onShowMenu, onShowMenu);
    reactory.on(ReactoryApiEventNames.onLogin, onLoginEvent);
    reactory.on(ReactoryApiEventNames.onRouteChanged, onRouteChanged)
    reactory.on('onApiStatusTotalsChange', onApiStatusTotalsChanged);

    return () => {
      reactory.removeListener(ReactoryApiEventNames.onHideMenu, onHideMenu);
      reactory.removeListener(ReactoryApiEventNames.onShowMenu, onShowMenu);
      reactory.removeListener(ReactoryApiEventNames.onLogin, onLoginEvent);
      reactory.removeListener(ReactoryApiEventNames.onRouteChanged, onRouteChanged);
    }
  }, []);

  const user = reactory.$user;
  const menus = reactory.getMenus();

  const setSearchText = e => setSearch({ ...search, searchInput: e.target.value });
  const onSearchTextKeyPress = e => {
    if (e.charCode === 13) {
      doSearch();
    }
  };

  const toggleDarkMode = () => {
    if (theme.palette.mode === 'dark') {
      localStorage.setItem("$reactory$theme_mode", 'light');
    } else {
      localStorage.setItem("$reactory$theme_mode", 'dark');
    }

    reactory.emit('onThemeChanged');
  }




  const getNavigationComponents = () => {
    if (user) {
      return user.navigationComponents || [];
    }
    return [];
  }

  const avatarComponent = (profileLink) => {
    let AvatarComponentDef = find(getNavigationComponents(), { contextType: 'DEFAULT_HEADER_AVATAR' });
    let AvatarComponent: any = null;

    let styles = {
      height: 120,
      width: 120,
      margin: 20,
      marginLeft: 'auto',
      marginRight: 'auto'
    }

    if (AvatarComponentDef && AvatarComponentDef.componentFqn) {
      AvatarComponent = reactory.getComponent(AvatarComponentDef.componentFqn);
      if (AvatarComponent) {
        //@ts-ignore
        // AvatarComponent = styled(AvatarComponent)(styles);

        return (<AvatarComponent  {...{ user, profileLink, ...AvatarComponentDef.componentProps }} />)
      }
    }

    
    // AvatarComponent = styled(Avatar)(styles);
    return <Avatar sx={{ width: 120, height: 120 }} src={getAvatar(user, `${user.firstName} ${user.lastName}`)} className={classes.loggedInUserAvatar} />
  }

  const avatarTitle = () => {
    let TitleComponentDef = find(getNavigationComponents(), { contextType: 'DEFAULT_HEADER_TITLE' });
    let TitleComponent = null;

    if (TitleComponentDef && TitleComponentDef.componentFqn) {
      TitleComponent = reactory.getComponent(TitleComponentDef.componentFqn);
      if (TitleComponent) {
        return (<TitleComponent {...{ user, ...TitleComponentDef.componentProps }} />);
      }
    }

    return (
      <Typography
        variant="subtitle1"
        color="secondary"
        style={{
          textAlign: 'center',
          marginTop: '20px'
        }}>{reactory.getUserFullName(user)}
      </Typography>
    );
  };

  const { server } = reactory.$user;
  const { isSlow, total } = apiStatus;
  const menuItems = Menus();

  let title = reactory.i18n.t(user.applicationName)

  return (
    <Fragment>
      <AppBar 
        position="sticky" 
        color="inherit" 
        id="reactory_default_app_bar" 
        style={{ visibility: show === true ? 'visible' : 'collapse' }}>
        <Toolbar variant="dense">
          <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer} size="large">
            <MenuIcon />
          </IconButton>
          <Typography variant="body2" color="inherit" style={{ flex: 1 }}>
            <span>{ title }</span>
            {apiStatus.api_ok === false && <span style={{ color: theme.palette.error.main }}> - OFFLINE</span>}
            {isSlow === true && total > 2 && <span style={{ color: theme.palette.warning.main }}><Icon>sensors</Icon></span>}
          </Typography>

          <>
            <Typography variant="caption">
              {reactory.$user.id === "anon" ? 'LOGIN' : 'LOGOUT'}
            </Typography>
            <IconButton
              aria-owns={menuOpen ? 'top-right' : null}
              aria-haspopup="true"
              onClick={handleMenu}
              style={{ 
                color: reactory.$user.id === "anon" ? "inherit" : reactory && reactory.muiTheme ? reactory.muiTheme.palette.success.main : "inherit"
              }}
              size="large">
              <PowerSettingIcon />
              <Logged open={menuOpen === true}
                id={'top-right'}
                anchorEl={menuAnchor}
                menus={menus}
                reactory={reactory}
                user={user}
                self={self} />
            </IconButton>
          </>
        </Toolbar>
      </AppBar>
      <Drawer variant={'temporary'} open={drawerOpen === true} className={classes.drawer} PaperProps={{ style: { width: '320px', maxWidth: '320px', overflowX: 'hidden' } }}>
        <div className={classes.drawerHeader}>
          <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer} size="large">
            <BackIcon />
          </IconButton>

          <IconButton onClick={toggleDarkMode} size="large">
            <Icon>{theme.palette.mode === 'dark' ? 'dark_mode' : 'light_mode'}</Icon>
          </IconButton>

          <Avatar src={user.applicationAvatar} style={{ marginTop: '2px' }} imgProps={{ style: { width: '32px', objectFit: "contain" } }} />
        </div>
        <Divider />
        {avatarTitle()}
        {user.anon ? null : avatarComponent("/profile/")}
        <Divider />
        <List className={classes.menuItems}>
          {menuItems}
        </List>
      </Drawer>
      {renderHelpInterface()}
    </Fragment>
  );
};



const ApplicationHeaderComponent = compose(  
  withReactory,
  withTheme
)(ApplicationHeader);

export default ApplicationHeaderComponent;

