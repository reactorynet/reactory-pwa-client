import React, { Component } from "react";
import PropTypes from "prop-types";
import uuid from "uuid";
import om from "object-mapper";
import { compose } from "redux";
import { isNil } from "lodash";
import { withStyles, withTheme } from "@material-ui/core/styles";
import { Tooltip } from "@material-ui/core";
import IconButton from "@material-ui/core/IconButton";
import { Menu, MenuItem } from "@material-ui/core";
import Icon from "@material-ui/core/Icon";
import { ListItemIcon } from "@material-ui/core";

export class DropDownMenu extends Component {
  static styles = (theme) => {
    return {};
  };

  static propTypes = {
    onSelect: PropTypes.func.isRequired,
    menus: PropTypes.array,
    propertyMap: PropTypes.object,
    open: PropTypes.bool,
    tooltip: PropTypes.string,
  };

  static defaultProps = {
    menus: [],
    propertyMap: null,
    onSelect: DropDownMenu.noHandler,
    open: false,
    tooltip: "",
  };

  static noHandler = (evt, menuItem) => {
    //console.log('DropDownMenu requires onSelect function handler.', {evt, menuItem});
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      open: props.open || false,
      anchorEl: null,
    };
    this.handleMenu = this.handleMenu.bind(this);
  }

  handleMenu(evt) {
    //console.log('Menu handle click', { evt, state: this.state });
    this.setState({ open: !this.state.open, anchorEl: evt.currentTarget });
  }

  render() {
    const { props } = this;
    const { menus, tooltip } = props;
    const { open } = this.state;
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
        onClick={this.handleMenu}
        color={this.props.color || "primary"}
        style={this.props.style}
        size={this.props.size || "medium"}
      >
        <Icon>{props.icon || "keyboard_arrow_down"}</Icon>
        <Menu
          open={this.state.open === true}
          id={ariaId}
          anchorEl={this.state.anchorEl}
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
}

DropDownMenu.muiName = "IconMenu";

export const DropDownMenuComponent = compose(
  withStyles(DropDownMenu.styles),
  withTheme
)(DropDownMenu);
export default {
  DropDownMenuComponent,
};
