import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Drawer from 'material-ui/Drawer';
import MenuItem from 'material-ui/MenuItem';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import IconMenu from 'material-ui/IconMenu';
import FlatButton from 'material-ui/FlatButton';
import Toggle from 'material-ui/Toggle';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import NavigationMenu from 'material-ui/svg-icons/navigation/menu';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';

class Login extends Component {
    
    static muiName = 'FlatButton';

    render() {
        const { match } = this.props;
        return (
            <Link to={`${match.url}/rendering`}>                
                <FlatButton {...this.props} label="Login" />
            </Link>
            
        );
    }
}

const Logged = (props) => (
    <IconMenu
        {...props}
        iconButtonElement={
            <IconButton><MoreVertIcon /></IconButton>
        }
        targetOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}>
        <MenuItem primaryText="Refresh" />
        <MenuItem primaryText="Help" />
        <MenuItem primaryText="Sign out" />
    </IconMenu>
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
            drawerOpen: false
        };

        this.handleChange = this.handleChange.bind(this);
        this.toggleDrawer = this.toggleDrawer.bind(this);
        
    }
    

    handleChange = (event, logged) => {
        this.setState({ logged: logged });
    };

    toggleDrawer = ( event ) => {
        this.setState({...this.state, drawerOpen: !this.state.drawerOpen})
    }

    render() {
        const { match } = this.props;
        return (
            <div>
            <AppBar
                title={this.props.title}
                iconElementLeft={<IconButton onClick={this.toggleDrawer}>< NavigationMenu /></IconButton>}
                iconElementRight={this.state.logged ? <Logged /> : <Login />}
            />
             <Drawer open={this.state.drawerOpen}>
                <IconButton><NavigationArrowBack onClick={this.toggleDrawer}/></IconButton>
                <hr/>
                <Link to={'/'} onClick={this.toggleDrawer}>
                    <MenuItem>
                        Home                                            
                    </MenuItem>
                </Link>
                <Link to={'/users'} >
                    <MenuItem onClick={this.toggleDrawer}>
                        Users                                            
                    </MenuItem>
                </Link>
                <Link to={'/organizations'} >
                    <MenuItem onClick={this.toggleDrawer}>
                        Organizations
                    </MenuItem>
                </Link>
              </Drawer>
            </div>
        );
    }
}

AssessorHeaderBar.propTypes = {
    title: PropTypes.String
}

AssessorHeaderBar.defaultProps = {
    title: 'TowerStone Learning Centre'
}

export default AssessorHeaderBar;