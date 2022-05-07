import React, { Component } from "react";
import PropTypes from "prop-types";
import { v4 as uuid } from "uuid";
import om from "object-mapper";
import { compose } from "redux";
import { isNil } from "lodash";
import { withStyles, withTheme, makeStyles } from "@mui/styles";
import { Theme, Tooltip } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { Menu, MenuItem } from "@mui/material/";
import Icon from "@mui/material/Icon";
import { ListItemIcon } from "@mui/material";


const noHandler = (evt, menuItem) => {
  //console.log('DropDownMenu requires onSelect function handler.', {evt, menuItem});
};


export const DropDownMenu = (props) => {

  const [open, setIsOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const handleMenu = (evt) => {
    setIsOpen(!open);
    setAnchorEl(evt.currentTarget);
  }

  const { menus, tooltip, theme } = props;
  const ariaId = props.id || uuid();
  const menuItems = []; 

  let _menus = menus;
  if (props.propertyMap) {
    _menus = om(menus, props.propertyMap);
  }

  if (_menus && _menus.length) {
    _menus.map((menu, mindex) => {
      const onMenuItemSelect = (evt) => {
        props.onSelect(evt, menu);
      };

      let disabled = false;
      if (isNil(menu.disabled) === false && menu.disabled === true) {
        disabled = true;
      }

      let selected = menu.selected === true;

      if (menu.title !== "<hr/>") {
        menuItems.push(
          <MenuItem
            key={menu.id || mindex}
            onClick={onMenuItemSelect}
            disabled={disabled}
            style={menu.style || {}}
          >
            {menu.icon ? (
              <ListItemIcon>
                <Icon
                  color="primary"
                  style={
                    menu.iconProps && menu.iconProps.style
                      ? menu.iconProps.style
                      : {}
                  }
                >
                  {menu.icon}
                </Icon>
              </ListItemIcon>
            ) : null}
            {menu.title}
            {selected === true ? <Icon>check</Icon> : null}
          </MenuItem>
        );
      } else {
        menuItems.push(<hr key={menu.id || mindex} />);
      }
    });
  }
  const content = (
    <IconButton
      aria-owns={open === true ? ariaId : null}
      aria-haspopup="true"      
      onClick={handleMenu}
      style={props.style}
      size={props.size || "medium"}
    >
      <Icon style={props.iconStyle}>{props.icon || "keyboard_arrow_down"}</Icon>
      <Menu
        open={open === true}
        id={ariaId}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {menuItems}
      </Menu>
    </IconButton>
  );
  return (
    <>
      {tooltip ? (
        <Tooltip title={tooltip} placement={"top"} arrow>
          {content}
        </Tooltip>
      ) : (
        <>{content}</>
      )}
    </>
  );
}


DropDownMenu.muiName = "IconMenu";

export const DropDownMenuComponent = compose(
  withTheme
)(DropDownMenu);
export default {
  DropDownMenuComponent,
};
