import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import om from 'object-mapper';
import { Link, withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { isArray, isNil } from 'lodash';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { Tooltip } from '@material-ui/core';
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


export class DropDownMenu extends Component {
  
  static styles = (theme) => {
    return { }
  };

  static propTypes = {
    onSelect: PropTypes.func.isRequired,
    menus: PropTypes.array,
    propertyMap: PropTypes.object,
    open: PropTypes.bool,
  };

  static defaultProps = {
    menus: [],
    propertyMap: null,
    onSelect: DropDownMenu.noHandler,
    open: false,
  };

  static noHandler = (evt, menuItem) => {      
    //console.log('DropDownMenu requires onSelect function handler.', {evt, menuItem});
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      open: props.open || false,
      anchorEl: null,
    }
    this.handleMenu = this.handleMenu.bind(this)
  }

  handleMenu(evt){
    //console.log('Menu handle click', { evt, state: this.state });
    this.setState({ open: !this.state.open, anchorEl:  evt.currentTarget });
  }
  
  render(){ 
      const { props } = this;
      const { menus } = props;  
      const { open } = this.state;
      const ariaId = props.id || uuid();
      const menuItems = [];
      let _menus = menus;
      if(props.propertyMap) {
        _menus = om(menus, props.propertyMap)
      }
      
      if(_menus && _menus.length) {
          _menus.map(
            (menu) => {
              const onMenuItemSelect = (evt) => {
                props.onSelect(evt, menu);
              };

              let disabled = false;
              if(isNil(menu.disabled) === false && menu.disabled === true) {
                disabled = true;
              } 

              menuItems.push((
                <MenuItem key={menu.id} onClick={ onMenuItemSelect } disabled={  disabled }> 
                    { menu.icon ? <ListItemIcon><Icon color="primary" style={menu.iconProps && menu.iconProps.style ? menu.iconProps.style : {}}>{menu.icon}</Icon></ListItemIcon> : null }                      
                    { menu.title }
                </MenuItem>
              ));
            });
      }

      return (
      <IconButton
        aria-owns={open === true ? ariaId : null}
        aria-haspopup="true"
        onClick={this.handleMenu}
        color={this.props.color || "primary"}
        style={this.props.style}
        size={this.props.size || "medium"}>
        <Icon>{props.icon || 'keyboard_arrow_down'}</Icon>
        <Menu
            open={this.state.open === true}
            id={ariaId}
            anchorEl={this.state.anchorEl}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}>
            { menuItems }
        </Menu>
      </IconButton>
    )            
  }
};

DropDownMenu.muiName = 'IconMenu';

export const DropDownMenuComponent = compose(withStyles(DropDownMenu.styles), withTheme)(DropDownMenu);
export default {
  DropDownMenuComponent
};
