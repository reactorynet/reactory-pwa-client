import React, { Component } from 'react';
import { compose } from 'redux';
import {
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  Icon,
  Popover,
  IconButton,
  FormHelperText,
} from '@material-ui/core';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { withStyles, withTheme } from '@material-ui/core/styles';

class ErrorPopover extends React.Component<any, any> {

  constructor(props, context) {
    super(props, context);
    this.state = {
      anchorEl: null,
    };
  }

  static Styles = (theme) => ({})


  render() {

    const { children, classes, color = 'inherit' } = this.props;

    const self = this;

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      self.setState({ anchorEl: event.currentTarget });
    };

    const handlePopoverClose = () => {
      self.setState({ anchorEl: null });
    };

    const open = Boolean(self.state.anchorEl);

    return (
      <React.Fragment>
        <IconButton
          aria-owns={open ? 'mouse-over-popover' : undefined}
          aria-haspopup="true"
          onClick={handlePopoverOpen}

          color={'secondary'}
        >
          <Icon>error</Icon>
        </IconButton>
        <Popover
          id="mouse-over-popover"
          className={classes.popover}
          classes={{
            paper: classes.paper,
          }}
          open={open}
          anchorEl={self.state.anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          disableRestoreFocus
        >
          <IconButton size="small" onClick={handlePopoverClose}><Icon>close</Icon></IconButton>
          {children}
        </Popover>
      </React.Fragment>
    );

  }
};

const ThemedErrorPopover = compose(withTheme, withStyles(ErrorPopover.Styles))(ErrorPopover);

class MaterialFormErrorTemplate extends Component<any, any> {

  constructor(props, context) {
    super(props, context);
    this.renderSingleError = this.renderSingleError.bind(this);
    this.state = {
      showDetail: false
    };
  }

  debugger;

  static ErrorStyles = (theme) => {
    return {
      errorForm: {
        padding: theme.spacing(1)
      },
    };
  }

  renderSingleError() {
    const { errors } = this.props;

    debugger;

    const errorComponent = (
      <React.Fragment>
        <List>
          {errors.map((error) => {
            return (
              <ListItem>
                <FormHelperText>{error.stack}</FormHelperText>
              </ListItem>)
          })}
        </List>
      </React.Fragment>
    );

    return (<ThemedErrorPopover {...this.props}>{errorComponent}</ThemedErrorPopover>)
  }

  renderMultipleErrors() {
    const { errors } = this.props;

    debugger;

    const errorComponent = (
      <React.Fragment>
        <List>
          {errors.map((error) => {
            return (
              <ListItem>
               <FormHelperText>{error.stack}</FormHelperText>
              </ListItem>)
          })
          }
        </List>
      </React.Fragment>
    );

    return (<ThemedErrorPopover {...this.props}>{errorComponent}</ThemedErrorPopover>)
  }

  render() {
    const { errors, uiSchema, schema, api, formContext } = this.props;
    let errorComponent = errors.length > 1 ? this.renderMultipleErrors() : this.renderSingleError();
    return errorComponent;
  }
}

export const MaterialFormTemplateComponent = compose(withApi, withStyles(MaterialFormErrorTemplate.ErrorStyles), withTheme)(MaterialFormErrorTemplate);
export default {
  MaterialFormTemplateComponent,
}
