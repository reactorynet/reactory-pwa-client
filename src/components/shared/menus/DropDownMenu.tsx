import React, { Component } from "react";
import PropTypes from "prop-types";
import uuid from "uuid";
import om from "object-mapper";
import { compose } from "redux";
import { isNil } from "lodash";
import { withStyles, withTheme, makeStyles } from "@material-ui/core/styles";
import { Tooltip } from "@material-ui/core";
import IconButton from "@material-ui/core/IconButton";
import { Menu, MenuItem } from "@material-ui/core";
import Icon from "@material-ui/core/Icon";
import { ListItemIcon } from "@material-ui/core";


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

  const palette = theme.palette;

  const classes: any = makeStyles((theme) => {
    return {
      icon: {
        color: theme.palette[props.color || "primary"].contrastText
      }
    };
  })();


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
      color={props.color || "inherit"}
      onClick={handleMenu}
      style={props.style}
      size={props.size || "medium"}
    >
      <Icon className={classes.icon} style={props.iconStyle}>{props.icon || "keyboard_arrow_down"}</Icon>
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
