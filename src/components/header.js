import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link, withRouter } from 'react-router-dom';
import { compose } from 'redux';
import Paper from 'material-ui/Paper';
import { withStyles, withTheme } from 'material-ui/styles';
import { Card, CardActions, CardHeader, CardMedia, CardTitle, CardText } from 'material-ui/Card';
import Drawer from 'material-ui/Drawer';
import Avatar from 'material-ui/Avatar';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import IconButton from 'material-ui/IconButton';
import Button from 'material-ui/Button';
import Menu, { MenuItem } from 'material-ui/Menu';
import Icon from 'material-ui/Icon';
import MenuIcon from 'material-ui-icons/Menu';
import HomeIcon from 'material-ui-icons/Home';
import BackIcon from 'material-ui-icons/ArrowBack';
import InboxIcon from 'material-ui-icons/Inbox';
import TimelineIcon from 'material-ui-icons/Timeline';
import AlarmIcon from 'material-ui-icons/Alarm';
import AssessmentIcon from 'material-ui-icons/Assessment';
import PowerSettingIcon from 'material-ui-icons/PowerSettingsNew';
import AccountCircle from 'material-ui-icons/AccountCircle';
import BuildIcon from 'material-ui-icons/Build';
import LockIcon from 'material-ui-icons/Lock';
import { ListItemIcon, ListItemText } from 'material-ui/List';
import DefaultProfileImage from '../assets/images/profile/default.png';
import { getAvatar } from './util';
import { withApi, ReactoryApi } from '../api/ApiProvider';

class Login extends Component {
    
    static muiName = 'FlatButton';

    render() {
        const { match } = this.props;
        return (
            <Link to={`${match.url}/rendering`}>                
                <Button {...this.props} label="Login" />
            </Link>
            
        );
    }
}

const Logged = (props) => (
    <Menu
        open={props.open}
        id='menu-appbar'
        anchorEl={props.anchorEl}        
        anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}>        
        <MenuItem onClick={ props.surveysClicked }>
            <ListItemIcon><AccountCircle /></ListItemIcon>
            <ListItemText inset primary="My Profile" onClick={props.onMyProfileClicked}/>
        </MenuItem>
        <MenuItem>
            <ListItemIcon><LockIcon /></ListItemIcon>
            <ListItemText inset primary="Sign Out" onClick={props.onSignOutClicked}/>        
        </MenuItem>

    </Menu>
);

Logged.muiName = 'IconMenu';

/**
 * This example is taking advantage of the composability of the `AppBar`
 * to render different components depending on the application state.
 */
class AssessorHeaderBar extends Component {
    constructor(props, context){
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

    }

    navigateTo( where = '/', toggleDrawer = true){
        const that = this;
        const { history } = this.props;

        if(toggleDrawer === true){
            this.setState({...this.state, drawerOpen: !this.state.drawerOpen}, ( ) => { 
                history.push(where);
            });
        } else {
            history.push(where);
        }                
    }
    
    handleChange = (event, logged) => {
        this.setState({ logged: logged });
    };

    toggleDrawer = ( ) => {        
        this.setState({...this.state, drawerOpen: !this.state.drawerOpen})
    }

    handleMenu = ( evt ) => {
        this.setState({ menuOpen: !this.state.menuOpen, menuAnchor: evt.currentTarget })
    }

    loginClicked = ( evt ) => {
        this.navigateTo('/login', true);
    }

    homeClicked = ( evt ) => {
        this.navigateTo('/', true);
    }   

    inboxClicked = ( evt ) => {
        this.navigateTo('/inbox', true);
    }

    surveysClicked = ( evt ) => {
        this.navigateTo('/surveys', true);
    }

    reportsClicked = ( evt ) => {
        this.navigateTo('/reports', true);
    }

    actionsClicked = ( evt ) => {
        this.navigateTo('/actions', true)
    }

    signOutClicked = ( evt ) => {
        localStorage.setItem('auth_token', null)
    }

    profileClicked = ( evt ) => {
        this.navigateTo('/profile')
    }

    adminClicked = evt => this.navigateTo('/admin')
            
    render() {
        //const { match } = this.props;
        const self = this;
        const { toggleDrawer } = this;
        const { theme } = this.props;
        const { menuOpen } = this.state;
        let menuItems = [];
        //get the main nav        
        const { content } = theme;
        if(content.navigation) {
            content.navigation.map((nav) => {
                if(nav.id === 'main_nav') {
                    menuItems = nav.entries.map((naventry) => {
                        const goto = () => {                        
                            self.navigateTo(naventry.link);
                        }
                        return (
                        <MenuItem key={naventry.id} onClick={ goto }> 
                            <ListItemIcon><Icon color="primary">{naventry.icon}</Icon></ListItemIcon>                       
                            <ListItemText inset primary={`${naventry.title}`} />
                        </MenuItem>)
                    });
                }
            });
        }
                        
        return (
            <div>
                <AppBar position="fixed" style={{backgroundColor:theme.palette.primary1Color}}>
                    <Toolbar >
                        <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer}>
                            <MenuIcon />
                        </IconButton>
                        <Typography type="title" color="inherit" style={{flex:1}}>
                            {theme.content.appTitle}
                        </Typography>

                        <IconButton
                            aria-owns={menuOpen ? 'menu-appbar' : null}
                            aria-haspopup="true"
                            onClick={this.handleMenu}
                            color="inherit">
                        <PowerSettingIcon />
                        <Logged open={menuOpen === true} 
                            id={'menu-appbar'} 
                            anchorEl={self.state.menuAnchor}
                            onMyProfileClicked={self.profileClicked}
                            onSignOutClicked={self.signOutClicked} />
                        </IconButton>
                    </Toolbar>
                </AppBar>
                <Drawer open={this.state.drawerOpen} style={{minWidht: '250px'}}>     
                    <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer}>
                        <BackIcon />    
                    </IconButton>
                    <Avatar src={getAvatar(this.props.api.getUser())} style={{ height:120, width:120, margin:20, marginLeft:'auto', marginRight:'auto' }} />                
                    {menuItems}
                </Drawer>
            </div>
        );
    }    
}

AssessorHeaderBar.propTypes = {
    title: PropTypes.string,
    api: PropTypes.instanceOf(ReactoryApi)
}

AssessorHeaderBar.defaultProps = {
    title: 'TowerStone Learning Centre'
}

AssessorHeaderBar.contextTypes = {
    router: PropTypes.object,    
}

const AssessorHeaderBarComponent = compose(
    withRouter,
    withApi,
    withStyles(AssessorHeaderBar.styles),
    withTheme()
  )(AssessorHeaderBar);

export default AssessorHeaderBarComponent;