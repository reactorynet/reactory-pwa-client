import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link, withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { isArray } from 'lodash';
import { withStyles, withTheme } from '@material-ui/core/styles';
import {
  Tooltip,
  Button,
  ListItem,
  ListItemSecondaryAction,
  Collapse,
  CircularProgress
} from '@material-ui/core';
import Drawer from '@material-ui/core/Drawer';
import Avatar from '@material-ui/core/Avatar';
import AppBar from '@material-ui/core/AppBar';
import Divider from '@material-ui/core/Divider';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import { Menu, MenuItem, InputBase } from '@material-ui/core';
import Icon from '@material-ui/core/Icon';
import { List, ListItemIcon, ListItemText } from '@material-ui/core';
import { fade } from '@material-ui/core/styles/colorManipulator';
import MenuIcon from '@material-ui/icons/Menu';
import BackIcon from '@material-ui/icons/ArrowBack';
import PowerSettingIcon from '@material-ui/icons/PowerSettingsNew';
import { getAvatar } from '../util';
import moment from 'moment';
import { withApi, ReactoryApi, ReactoryApiEventNames } from '@reactory/client-core/api';

export class ISearchConfig {
  show = true;
  placeholder = 'Search'
}

const defaultSearchConfig = new ISearchConfig()

export class Logged extends Component {

  render() {
    const { props } = this;
    const { menus, api, user, self } = props;
    const menuItems = [];

    if (menus && menus.length) {
      menus.map((menu) => {
        if (menu.target === 'top-right') {
          menu.entries.map((menuItem) => {
            let allow = true;
            if (isArray(menuItem.roles) && isArray(user.roles)) {
              allow = api.hasRole(menuItem.roles, user.roles)
            }
            if (allow === true) {
              const goto = () => {
                self.navigateTo(menuItem.link, false);
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
}

Logged.muiName = 'IconMenu';

const SubMenus = (props) => {
  const { items = [], history, user, api, self, classes } = props;
  return items.map((menu, index) => {
    const goto = () => history.push(menu.link);
    return (
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
  });
};

const Menus = (props) => {
  const { menus = [], target = 'left-nav', history, user, api, self, classes } = props;
  let menuItems = [];
  if (menus && menus.length) {
    menus.map((menu) => {
      if (menu.target === target) {
        menu.entries.map((menuItem) => {
          let subnav = null;
          let expandButton = null;
          let allow = true;
          if (isArray(menuItem.roles) && isArray(user.roles)) {
            allow = api.hasRole(menuItem.roles, user.roles);
          }
          if (allow === true) {
            const goto = () => {
              self.navigateTo(menuItem.link, true);
            };

            if (isArray(menuItem.items) === true && menuItem.items.length > 0) {
              const isExpanded = self.state.expanded[menuItem.id] && self.state.expanded[menuItem.id].value === true;
              subnav = (
                <Collapse in={isExpanded === true} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {menuItem.items.map((submenu, subindex) => {
                      const submenuGoto = () => {
                        self.navigateTo(submenu.link, true);
                      };

                      return (
                        <ListItem key={submenu.id ||subindex} button onClick={submenuGoto} style={{ cursor: 'pointer', paddingLeft: self.props.theme.spacing(4) }}>
                          <ListItemIcon>
                            {
                              submenu.icon ?
                                (<Icon color="secondary">{submenu.icon}</Icon>)
                                : null
                            }
                          </ListItemIcon>
                          {submenu.title}
                        </ListItem>
                      )
                    })}
                  </List>
                </Collapse>
              );

              const toggleMenu = (e) => {
                let currentToggle = self.state.expanded[menuItem.id];
                if(!currentToggle) currentToggle = { value: false };

                currentToggle.value = !currentToggle.value;
                const _state = {...self.state};
                _state.expanded[menuItem.id] = currentToggle;

                self.setState(_state);
              };

              expandButton = (
                <IconButton key={`${menuItem.id}`} onClick={toggleMenu}>
                  <Icon>{isExpanded === true ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</Icon>
                </IconButton>
              )
            }

            menuItems.push(
              <ListItem key={menuItem.id} onClick={goto} button>
                <ListItemIcon>
                  <Icon color="primary">{menuItem.icon}</Icon>
                </ListItemIcon>
                {menuItem.title}
                {expandButton ? <ListItemSecondaryAction>
                  {expandButton}
                </ListItemSecondaryAction> : null}
              </ListItem>);

            if(subnav) {
              menuItems.push(subnav);
            }
          }
        });
      }
    });
  }

  return menuItems;
};

/**
 * This example is taking advantage of the composability of the `AppBar`
 * to render different components depending on the application state.
 */
class ApplicationHeader extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      logged: true,
      drawerOpen: false,
      menuOpen: false,
      menuAnchor: null,
      search: props.search || defaultSearchConfig,
      expanded: {

      }
    };

    this.navigateTo = this.navigateTo.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.toggleDrawer = this.toggleDrawer.bind(this);
    this.handleMenu = this.handleMenu.bind(this);
    this.homeClicked = this.homeClicked.bind(this);
    this.inboxClicked = this.inboxClicked.bind(this);
    this.surveysClicked = this.surveysClicked.bind(this);
    this.reportsClicked = this.reportsClicked.bind(this);
    this.actionsClicked = this.actionsClicked.bind(this);
    this.adminClicked = this.adminClicked.bind(this);
    this.onLoginEvent = this.onLoginEvent.bind(this);
    this.onRouteChanged = this.onRouteChanged.bind(this);
    props.api.on(ReactoryApiEventNames.onLogin, this.onLoginEvent);
    props.api.on(ReactoryApiEventNames.onRouteChanged, this.onRouteChanged)
    this.componentDefs = this.props.api.getComponents([
      'core.SystemStatus',
      'core.FullScreenModal',
      'core.Loading',
      'forms.HelpListForm'
    ]);
    this.statusRefresh = this.statusRefresh.bind(this);
    this.doSearch = this.doSearch.bind(this);
    this.renderHelpInterface = this.renderHelpInterface.bind(this);
    
  }

  componentDidMount() {

  }

  onRouteChanged(props) {
   this.props.api.log('ApiPath changed, handle in header app', props);
   const { actionData, path } = props;
   this.navigateTo(path); 
  }

  onLoginEvent = (evt) => this.forceUpdate();

  navigateTo(where = '/', toggleDrawer = false) {
    //console.log('Need to redirect', where);
    const { history } = this.props;

    if (toggleDrawer === true) {
      this.setState({ ...this.state, drawerOpen: !this.state.drawerOpen }, () => {
        history.push(where);
      });
    } else {
      history.push(where);
    }
  }

  handleChange = (event, logged) => {
    this.setState({ logged: logged });
  };

  toggleDrawer = () => {
    this.setState({ ...this.state, drawerOpen: !this.state.drawerOpen });
  };

  handleMenu = (evt) => {
    this.setState({ menuOpen: !this.state.menuOpen, menuAnchor: evt.currentTarget })
  };

  loginClicked = (evt) => {
    this.navigateTo('/login', false);
  };

  homeClicked = (evt) => {
    this.navigateTo('/', true);
  };

  inboxClicked = (evt) => {
    this.navigateTo('/inbox', true);
  };

  surveysClicked = (evt) => {
    this.navigateTo('/surveys', true);
  };

  reportsClicked = (evt) => {
    this.navigateTo('/reports', true);
  };

  actionsClicked = (evt) => {
    this.navigateTo('/actions', true)
  };

  signOutClicked = (evt) => {
    this.props.api.logout();
    this.navigateTo('/login', false)
  };

  profileClicked = (evt) => {
    this.navigateTo('/profile/', false)
  };

  adminClicked = evt => this.navigateTo('/admin');

  statusRefresh = e => {
    this.props.api.status().catch(e => this.setState({ apiNotAvailable: true }))
  };

  doSearch() {
    this.setState({ displaySearch: true })
  }

  /**
   * This is the main render entry point for the help interface.
   * Accessible to all, use the search input as keyword filter.
   */
  renderHelpInterface() {
    const that = this;
    const { displaySearch, searchInput } = this.state;
    const { FullScreenModal, Loading } = this.componentDefs;
    const HelpListForm = this.props.api.getComponent('forms.HelpListForm@1.0.0');
    if (displaySearch !== true) return null;
    const closeSearch = e => this.setState({ searchInput: '', displaySearch: false })
    const onFilterSearch = form => this.setState({ searchInput: form.searchInput })
    return (
      <FullScreenModal open={displaySearch === true} onClose={closeSearch} title={`Searching For: ${searchInput}`}>
        <HelpListForm />
      </FullScreenModal>
    );
  }

  render() {
    //const { match } = this.props;
    const self = this;
    const { toggleDrawer } = this;
    const { theme, api, classes, history } = this.props;
    const { menuOpen } = this.state;
    const user = this.props.api.getUser();
    const menus = this.props.api.getMenus();
    let menuItems = [];
    //get the main nav



    const setSearchText = e => this.setState({ searchInput: e.target.value });
    const onSearchTextKeyPress = e => {
      if (e.charCode === 13) {
        self.doSearch();
      }
    };

    /*
    const searchControl = (<div className={classes.grow}>
      <div className={classes.search}>
        <div className={classes.searchIcon}>
          <Icon>search</Icon>
        </div>
        <InputBase
          placeholder="Search…"
          classes={{
            root: classes.inputRoot,
            input: classes.inputInput,
          }}
          onKeyPress={onSearchTextKeyPress}
          onChange={setSearchText}
          value={this.state.searchInput}
        />
      </div>
    </div>);
          */
    return (
      <Fragment>
        <AppBar position="fixed" style={{ backgroundColor: theme.palette.primary1Color }}>
          <Toolbar>
            <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer}>
              <MenuIcon />
            </IconButton>
            <Typography type="title" color="inherit" style={{ flex: 1 }}>
              {user.applicationName}
            </Typography>

            {user.anon === true ? null :
              <IconButton
                aria-owns={menuOpen ? 'top-right' : null}
                aria-haspopup="true"
                onClick={this.handleMenu}
                color="inherit">
                <PowerSettingIcon />
                <Logged open={menuOpen === true}
                  id={'top-right'}
                  anchorEl={self.state.menuAnchor}
                  menus={menus}
                  api={this.props.api}
                  user={user}
                  self={self} />
              </IconButton>}
          </Toolbar>
        </AppBar>
        <Drawer open={this.state.drawerOpen === true} className={this.props.classes.drawer}>
          <div className={this.props.classes.drawerHeader}>
            <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer}>
              <BackIcon />
            </IconButton>
            <Avatar src={user.applicationAvatar} style={{ marginTop: '2px' }} imgProps={{ style: { width: '32px', objectFit: "contain" } }} />
          </div>
          <Divider />
          <Typography variant="subtitle1" color="secondary"
            style={{ textAlign: 'center', marginTop: '20px' }}>{api.getUserFullName(user)}</Typography>
          {user.anon ? null :
            <Link to="/profile/">
              <Avatar src={getAvatar(user)}
                className={this.props.classes.loggedInUserAvatar}
              />
            </Link>}
          <Divider />
          <List className={this.props.classes.menuItems}>
            <Menus {...{ menus: menus, history: this.props.history, user, api, self, classes }} />
            <ListItem onClick={this.statusRefresh} button>
              <ListItemIcon>
                <Tooltip title={`Api Available @ ${moment(api.getUser().when).format('HH:mm:ss')} click to refresh`}>
                  <Icon color="primary">rss_feed</Icon>
                </Tooltip>
              </ListItemIcon>
            <ListItemText primary="Refresh API Status" secondary={<span className={classes.version}>Client: {api.props.$version}</span>}/>
            </ListItem>
          </List>
        </Drawer>
        {this.renderHelpInterface()}
      </Fragment>
    );
  }
}

ApplicationHeader.propTypes = {
  title: PropTypes.string,
  api: PropTypes.instanceOf(ReactoryApi).isRequired,
  search: PropTypes.instanceOf(ISearchConfig)
};

ApplicationHeader.defaultProps = {
  title: 'Reactory',
  search: {
    show: true,
    placeholder: 'Search'
  }
};

ApplicationHeader.contextTypes = {
  router: PropTypes.object,
};

ApplicationHeader.styles = theme => ({
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    minWidth: '260px',
    padding: `0 ${theme.spacing(1)}px`,
    //height: theme.spacing.
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
    backgroundColor: fade(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: fade(theme.palette.common.white, 0.25),
    },
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
  },
});

const ApplicationHeaderComponent = compose(
  withRouter,
  withApi,
  withStyles(ApplicationHeader.styles),
  withTheme
)(ApplicationHeader);

export default ApplicationHeaderComponent;
