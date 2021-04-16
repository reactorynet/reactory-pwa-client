import React, { Component } from 'react';
import { compose } from 'redux';
import {
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Paper,
  Typography,
  Grid,
  Icon,
  Popover,
  IconButton,
  FormHelperText,
  Theme,
} from '@material-ui/core';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { withStyles, withTheme, styled } from '@material-ui/core/styles';

const PopOverStyles = (theme: Theme): any => {

  return {
    errorForm: {
      padding: theme.spacing(1)
    },
    errorButton:
    {
      position: "relative",
      top: '0px',
      left: '0px',
      color: theme.palette.error.main
    }
  }
};



const ErrorPopover = (props) => {

  // constructor(props, context) {
  //   super(props, context);
  //   this.state = {
  //     anchorEl: null,
  //   };
  // }

  const { useState } = React;

  const [anchorEl, setAnchorEl] = useState(null);

  // render() {

  const { children, classes, color = 'inherit', theme } = props;


  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <React.Fragment>
      <IconButton
        aria-owns={open ? 'mouse-over-popover' : undefined}
        aria-haspopup="true"
        onClick={handlePopoverOpen}
        color={"primary"}
        className={classes.errorButton}>
        <Icon>error</Icon>
      </IconButton>
      <Popover
        id="mouse-over-popover"
        className={classes.popover}
        classes={{
          paper: classes.paper,
        }}
        open={open}
        anchorEl={anchorEl}
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

};

const ThemedErrorPopover = compose(withTheme, withStyles(PopOverStyles))(ErrorPopover);

const TemplateErrorStyles = (theme) => {
  return {
    errorForm: {
      padding: theme.spacing(1)
    },
  };
};

const MaterialFormErrorTemplate = (props) => {

  const { errors = [], uiSchema, schema, api, formContext, errorSchema } = props;

  if (errors.length === 0) return null;

  const renderSingleError = () => {

    const errorComponent = (
      <React.Fragment>
        <List>
          {errors.map((error) => {
            return (
              <ListItem>
                <ListItemText></ListItemText>
                <FormHelperText>{error.stack}</FormHelperText>
              </ListItem>)
          })}
        </List>
      </React.Fragment>
    );

    return (<ThemedErrorPopover {...props}>{errorComponent}</ThemedErrorPopover>)
  }

  const renderMultipleErrors = () => {

    let $schemaErrors = [];

    const collate_errors_for_property = (element, propertyName = 'root') => {

      switch (element.type) {
        case "string":
        case "number":
        case "date": {

          if (propertyName !== 'root') {
            if (errorSchema[element] && errorSchema[propertyName].__errors && errorSchema[propertyName].__errors.length > 0) {
              if (schema.properties && schema.properties[propertyName]) {
                $schemaErrors.push({
                  title: schema.properties[propertyName].title,
                  propertyName,
                  errors: errorSchema[propertyName].__errors
                })
              }
            }
          }

          return [];
        }
        case "array": {

        }
        case "object": {

        }
      }

      return [];
    };

    $schemaErrors = collate_errors_for_property(schema, 'root');



    Object.keys(errorSchema).forEach((propertyName: string) => {
      collate_errors_for_property(schema.properties[propertyName])
    });

    const errorComponent = (
      <List>
        {$schemaErrors.map((error, eid) => {
          return (
            <li key={`property-error-${eid}`}>
              <ul>
                <ListSubheader style={{ marginTop: '-20px', fontSize: '14px', padding: 0 }}>{error.title || error.propertyName}</ListSubheader>
                {error.errors.map((item, iid) => (
                  <ListItem key={`${error.propertyName}-${iid}`} style={{ paddingTop: 0, paddingBottom: 0 }}>
                    <ListItemText primary={`${item.substring(0, 1).toUpperCase()}${item.substring(1, item.length - 1)}`} />
                  </ListItem>
                ))}
              </ul>
              <hr />
            </li>)
        })}
      </List>
    );

    return (<ThemedErrorPopover {...props}>
      <>
        <Typography variant={'h6'} color='error' style={{ marginLeft: '10%' }}>Form Errors</Typography>
        <hr />
        {errorComponent}
      </>
    </ThemedErrorPopover>)
  }

  let errorComponent = errors.length > 1 ? renderMultipleErrors() : renderSingleError();

  return errorComponent;
}

export const MaterialFormTemplateComponent = compose(withApi, withStyles(TemplateErrorStyles), withTheme)(MaterialFormErrorTemplate);
export default MaterialFormTemplateComponent;

