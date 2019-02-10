import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Link, withRouter} from 'react-router-dom';
import {compose} from 'redux';
import {isArray} from 'lodash';
import {withStyles, withTheme} from '@material-ui/core/styles';
import {Tooltip} from '@material-ui/core';
import Drawer from '@material-ui/core/Drawer';
import Avatar from '@material-ui/core/Avatar';
import AppBar from '@material-ui/core/AppBar';
import Divider from '@material-ui/core/Divider';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import {Menu, MenuItem} from '@material-ui/core';
import Icon from '@material-ui/core/Icon';
import {List, ListItemIcon, ListItemText} from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';
import BackIcon from '@material-ui/icons/ArrowBack';
import PowerSettingIcon from '@material-ui/icons/PowerSettingsNew';
import {getAvatar} from '../util';
import moment from 'moment';
import {withApi, ReactoryApi, ReactoryApiEventNames} from '../../api/ApiProvider';


export class Logged extends Component {

  render() {
    const {props} = this;
    const {menus, api, user, self} = props;
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
                  <ListItemText inset primary={`${menuItem.title}`}/>
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
      menuAnchor: null
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
    props.api.on(ReactoryApiEventNames.onLogin, this.onLoginEvent);
    this.componentDefs = this.props.api.getComponents(['core.SystemStatus']);
    this.statusRefresh = this.statusRefresh.bind(this)
  }

  componentDidMount() {

  }

  onLoginEvent = (evt) => this.forceUpdate();

  navigateTo(where = '/', toggleDrawer = false) {
    console.log('Need to redirect', where);
    debugger; //eslint-disable-line
    const {history} = this.props;

    if (toggleDrawer === true) {
      this.setState({...this.state, drawerOpen: !this.state.drawerOpen}, () => {
        history.push(where);
      });
    } else {
      history.push(where);
    }
  }

  handleChange = (event, logged) => {
    this.setState({logged: logged});
  };

  toggleDrawer = () => {
    this.setState({...this.state, drawerOpen: !this.state.drawerOpen});
  };

  handleMenu = (evt) => {
    this.setState({menuOpen: !this.state.menuOpen, menuAnchor: evt.currentTarget})
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
    this.navigateTo('/profile', false)
  };

  adminClicked = evt => this.navigateTo('/admin');

  statusRefresh = e => {
    this.props.api.status().catch(e => this.setState({apiNotAvailable: true}))
  };

  render() {
    //const { match } = this.props;
    const self = this;
    const {toggleDrawer} = this;
    const {theme, api} = this.props;
    const {menuOpen} = this.state;
    const user = this.props.api.getUser();
    const menus = this.props.api.getMenus();
    let menuItems = [];
    //get the main nav
    if (menus && menus.length && user.anon !== true) {
      menus.map((menu) => {
        if (menu.target === 'left-nav') {
          menu.entries.map((menuItem) => {
            let allow = true;
            if (isArray(menuItem.roles) && isArray(user.roles)) {
              allow = api.hasRole(menuItem.roles, user.roles)
            }
            if (allow === true) {
              const goto = () => {
                self.navigateTo(menuItem.link, true);
              };
              menuItems.push((
                <MenuItem key={menuItem.id} onClick={goto}>
                  <ListItemIcon><Icon color="primary">{menuItem.icon}</Icon></ListItemIcon>
                  <ListItemText inset primary={`${menuItem.title}`}/>
                </MenuItem>));
            }
          });
        }

      });
    }

    return (
      <div>
        <AppBar position="fixed" style={{backgroundColor: theme.palette.primary1Color}}>
          <Toolbar>
            <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer}>
              <MenuIcon/>
            </IconButton>
            <Typography type="title" color="inherit" style={{flex: 1}}>
              {user.applicationName}
            </Typography>
            {user.anon === true ? null :
              <IconButton
                aria-owns={menuOpen ? 'top-right' : null}
                aria-haspopup="true"
                onClick={this.handleMenu}
                color="inherit">
                <PowerSettingIcon/>
                <Logged open={menuOpen === true}
                        id={'top-right'}
                        anchorEl={self.state.menuAnchor}
                        menus={menus}
                        api={this.props.api}
                        user={user}
                        self={self}/>
              </IconButton>}
          </Toolbar>
        </AppBar>
        <Drawer open={this.state.drawerOpen === true} className={this.props.classes.drawer}>
          <div className={this.props.classes.drawerHeader}>
            <Avatar src={user.applicationAvatar}/>
            <Typography variant="subtitle1" style={{textAlign: 'center'}}>{theme.content.appTitle}</Typography>
            <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer}>
              <BackIcon/>
            </IconButton>
          </div>
          <Divider/>
          <Typography variant="subtitle1" color="secondary"
                      style={{textAlign: 'center', marginTop: '20px'}}>{api.getUserFullName(user)}</Typography>
          {user.anon ? null :
            <Link to="/profile">
              <Avatar src={getAvatar(user)}
                      style={{height: 120, width: 120, margin: 20, marginLeft: 'auto', marginRight: 'auto'}}/>
            </Link>}
          <Divider/>
          {menuItems}
          <div className={this.props.classes.apiStatus}>
            <Tooltip title={`Api Available @ ${moment(api.getUser().when).format('HH:mm:ss')} click to refresh`}>
              <IconButton onClick={this.statusRefresh}>
                <Icon>rss_feed</Icon>
              </IconButton>
            </Tooltip>
          </div>
        </Drawer>

      </div>
    );
  }
}

ApplicationHeader.propTypes = {
  title: PropTypes.string,
  api: PropTypes.instanceOf(ReactoryApi)
};

ApplicationHeader.defaultProps = {
  title: 'Reactory'
};

ApplicationHeader.contextTypes = {
  router: PropTypes.object,
};

ApplicationHeader.styles = theme => ({
  drawerHeader: {
    display: 'flex',
    alignItems: 'space-between',
    justifyContent: 'flex-end',
    minWidth: '260px',
    padding: `0 ${theme.spacing.unit}px`,
  },
  apiStatus: {
    bottom: '10px',
    position: 'absolute',
  }
});

const ApplicationHeaderComponent = compose(
  withRouter,
  withApi,
  withStyles(ApplicationHeader.styles),
  withTheme()
)(ApplicationHeader);

export default ApplicationHeaderComponent;