import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link, withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import Avatar from '@material-ui/core/Avatar';
import AppBar from '@material-ui/core/AppBar';
import Divider from '@material-ui/core/Divider';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import { Menu, MenuItem } from '@material-ui/core';
import Icon from '@material-ui/core/Icon';
import { List, ListItemIcon, ListItemText } from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';
import BackIcon from '@material-ui/icons/ArrowBack';
import PowerSettingIcon from '@material-ui/icons/PowerSettingsNew';
import AccountCircle from '@material-ui/icons/AccountCircle';
import LockIcon from '@material-ui/icons/Lock';
import { getAvatar } from '../util';
import { withApi, ReactoryApi } from '../../api/ApiProvider';

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

export class Logged extends Component {
    
    
    render(){ 
        const { props } = this;
        return(<Menu
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
            </Menu>)
    }
};

Logged.muiName = 'IconMenu';

/**
 * This example is taking advantage of the composability of the `AppBar`
 * to render different components depending on the application state.
 */
class ApplicationHeader extends Component {
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
        this.setState({...this.state, drawerOpen: !this.state.drawerOpen});
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
        this.props.api.logout();
        this.navigateTo('/login', false)
    }

    profileClicked = ( evt ) => {        
        this.navigateTo('/profile', false)
    }

    adminClicked = evt => this.navigateTo('/admin')
            
    render() {
        //const { match } = this.props;
        const self = this;
        const { toggleDrawer } = this;
        const { theme } = this.props;
        const { menuOpen } = this.state;
        const user = this.props.api.getUser();

        let menuItems = [];
        //get the main nav        
        const { content } = theme;
        if(content.navigation && user.anon !== true) {
            content.navigation.map((nav) => {
                if(nav.id === 'main_nav') {
                    menuItems = nav.entries.map((naventry) => {
                        const goto = () => {                        
                            self.navigateTo(naventry.link, true);
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
                        {user.anon === true ? null : <IconButton
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
                        </IconButton>}
                    </Toolbar>
                </AppBar>
                <Drawer open={this.state.drawerOpen} className={this.props.classes.drawer}>     
                    <div className={this.props.classes.drawerHeader}>                        
                        <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer}>
                            <BackIcon />    
                        </IconButton>
                    </div>
                    <Divider />
                    { user.anon ? null : 
                    <Link to="/profile">
                        <Avatar src={getAvatar(user)} style={{ height:120, width:120, margin:20, marginLeft:'auto', marginRight:'auto' }} />                                    
                    </Link> }
                    <Divider />
                    {menuItems}
                </Drawer>
            </div>
        );
    }    
}

ApplicationHeader.propTypes = {
    title: PropTypes.string,
    api: PropTypes.instanceOf(ReactoryApi)
}

ApplicationHeader.defaultProps = {
    title: 'Reactory'
}

ApplicationHeader.contextTypes = {
    router: PropTypes.object,    
}

ApplicationHeader.styles = theme => ({
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: '260px',
        padding: `0 ${theme.spacing.unit}px`,
      },    
})

const ApplicationHeaderComponent = compose(
    withRouter,
    withApi,
    withStyles(ApplicationHeader.styles),
    withTheme()
  )(ApplicationHeader);

export default ApplicationHeaderComponent;