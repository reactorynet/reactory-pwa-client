import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Menu, { MenuItem } from '@material-ui/core/Menu';
import MoreVertIcon from '@material-ui/icons/MoreVert';

const options = [
  { value: 0, title: 'Not Started' },
  { value: 25, title: '25% Complete' },
  { value: 50, title: '50% Complete' },
  { value: 75, title: '75% Complete' },
  { value: 100, title: 'Complete' },
];

const ITEM_HEIGHT = 48;

class IconButtonDropDown extends React.Component {
  state = {
    anchorEl: null,
  };

  handleClick = event => {

    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  render() {
    const { anchorEl } = this.state;

    return (
      <div>
        <IconButton
          aria-label="More"
          aria-owns={anchorEl ? 'long-menu' : null}
          aria-haspopup="true"
          onClick={this.handleClick}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          id="long-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleClose}
          PaperProps={{
            style: {
              maxHeight: ITEM_HEIGHT * 4.5,
              width: 200,
            },
          }}
        >
          {options.map(option => 
          { 
            return(
            <MenuItem key={option.value} onClick={this.handleClose}>
              {option.title}
            </MenuItem>
          )}
          )}
        </Menu>
      </div>
    );
  }
}

export default IconButtonDropDown;