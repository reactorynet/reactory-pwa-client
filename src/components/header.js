import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link, withRouter } from 'react-router-dom';
import Paper from 'material-ui/Paper';
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
import { withTheme } from 'material-ui/styles';
import DefaultProfileImage from '../assets/images/profile/default.png';

const MyIcon = (props) => (<i {...props} className="material-icons" aria-hidden="true">{props.children}</i>);

const navigation = {
    ProductLeader: [
        { id: '1', title: 'Product Ideas', link: '/reactory/product-ideas', icon: 'plus' },
        { id: '2', title: 'Feature Ideas', link: '/reactory/feature-ideas', icon: 'plus' },
        { id: '3', title: 'Validations', link: '/reactory/validations', icon: 'plus' },
        { id: '4', title: 'Estimations', link: '/reactory/estimations', icon: 'plus' },
        { id: '5', title: 'My Priorities', link: '/reactory/priorities', icon: 'plus' },
        { id: '6', title: 'Feasibility Map', link: '/reactory/feasibility-map', icon: 'plus' },
        { id: '7', title: 'Product Plan', link: '/reactory/product-plan', icon: 'plus' },
        { id: '8', title: 'Team Dynamics', link: '/reactory/team-dynamics', icon: 'plus' },                
        { id: '9', title: 'My Profile', link: '/reactory/dashboard', icon: 'build' },
        { id: '10', title: 'Administration', link: '/reactory/administration', icon: 'build' },
        { id: '11', title: 'Sparky Bot', link: '/reactory/spark-bot', icon: 'build' },
    ]
};

/**
 * 
 * <MenuItem onClick={ this.homeClicked } >
    <ListItemIcon><HomeIcon /></ListItemIcon>
    <ListItemText inset primary="Dashboard" />                                         
</MenuItem>

<MenuItem onClick={ this.inboxClicked }>
    <ListItemIcon><InboxIcon /></ListItemIcon>
    <ListItemText inset primary="Inbox" />
</MenuItem>

<MenuItem onClick={ this.surveysClicked }>
    <ListItemIcon><AssessmentIcon /></ListItemIcon>
    <ListItemText inset primary="Surveys" />
</MenuItem>

<MenuItem onClick={ this.reportsClicked } leftIcon={<Icon>timeline</Icon>}>
    <ListItemIcon><TimelineIcon /></ListItemIcon>
    <ListItemText inset primary="Reports" />
</MenuItem>

<MenuItem onClick={ this.actionsClicked } leftIcon={<Icon>alarm</Icon>}>
    <ListItemIcon><AlarmIcon /></ListItemIcon>
    <ListItemText inset primary="Actions" />
</MenuItem>

<MenuItem onClick={ this.adminClicked } leftIcon={<Icon>build</Icon>}>
    <ListItemIcon><BuildIcon /></ListItemIcon>
    <ListItemText inset primary="Admin" />
</MenuItem>
 * 
 */

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

        const menuItems = navigation.ProductLeader.map((naventry) => {
                    const goto = () => {                        
                        self.navigateTo(naventry.link);
                    }
                    return (
                    <MenuItem key={naventry.id} onClick={ goto } leftIcon={<MyIcon>{naventry.icon}</MyIcon>}> 
                        <ListItemIcon><MyIcon>{naventry.icon}</MyIcon></ListItemIcon>                       
                        <ListItemText inset primary={`${naventry.title}`} />
                    </MenuItem>)
                }) 

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
                  color="inherit"                  
                >
                  <PowerSettingIcon />
                  <Logged open={menuOpen === true} 
                    id={'menu-appbar'} 
                    anchorEl={self.state.menuAnchor}
                    onMyProfileClicked={self.profileClicked}
                    onSignOutClicked={self.signOutClicked}
                    />
                </IconButton>
            </Toolbar>
            </AppBar>
             <Drawer open={this.state.drawerOpen} style={{minWidht: '250px'}}>     
                <IconButton color="inherit" aria-label="Menu" onClick={toggleDrawer }>
                    <BackIcon />    
                </IconButton>           
                                                                                                                   
                <Avatar src={DefaultProfileImage} style={{ height:120, width:120, margin:20, marginLeft:'auto', marginRight:'auto' }} />                
                {menuItems}                                        
              </Drawer>
            </div>
        );
    }    
}

AssessorHeaderBar.propTypes = {
    title: PropTypes.string
}

AssessorHeaderBar.defaultProps = {
    title: 'TowerStone Learning Centre'
}

AssessorHeaderBar.contextTypes = {
    router: PropTypes.object,    
}

export default withRouter(withTheme()(AssessorHeaderBar));