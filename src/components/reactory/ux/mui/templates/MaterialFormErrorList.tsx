import React, { useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
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
} from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';

const PREFIX = 'MaterialFormErrorTemplate';

const classes = {
  errorForm: `${PREFIX}-errorForm`,
  errorButton: `${PREFIX}-errorButton`,
  popover: `${PREFIX}-popover`,
  paper: `${PREFIX}-paper`,
};

const StyledErrorPopover = styled('div')(({ theme }) => ({
  [`& .${classes.errorForm}`]: {
    padding: theme.spacing(1)
  },
  [`& .${classes.errorButton}`]: {
    position: "relative",
    top: '0px',
    left: '0px',
    color: theme.palette.error.main
  }
}));

const ErrorPopover = (props) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const { children, color = 'inherit' } = props;

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
        className={classes.errorButton}
        size="large">
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

const MaterialFormErrorTemplate = (props) => {
  const theme = useTheme();
  const { errors = [], uiSchema, schema, formContext, errorSchema } = props;

  if(uiSchema && uiSchema['ui-options']) {
    if(uiSchema['ui-options'].showErrorList === false) return null;
  }

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

    return (<StyledErrorPopover {...props}>{errorComponent}</StyledErrorPopover>);
  }

  const renderMultipleErrors = () => {
    let $schemaErrors = [];

    const collate_errors_for_property = (element: any, propertyName = 'root', $errorSchema: any, parent?: Reactory.Schema.AnySchema) => {
      let $item_errors = []

      if (element === null || element === undefined) return [];

      switch (element.type) {
        case "string":
        case "number":
        case "date": {
          if (propertyName !== 'root') {
            //this is a child element.
            if ($errorSchema[propertyName] && $errorSchema[propertyName].__errors && $errorSchema[propertyName].__errors.length > 0) {
              $item_errors.push({
                title: element.title || propertyName,
                propertyName,
                errors: errorSchema[propertyName].__errors,
                parent
              });
            }
          }
          else {
            if ($errorSchema.__errors.length > 0) {
              $item_errors.push({
                title: element.title || propertyName,
                propertyName,
                errors: $errorSchema.__errors,
                parent
              });
            }
          }
          break;
        }
        case "array": {
          break;
        }
        case "object": {
          //For each child element provide collate the errors from the element.
          Object.keys(element.properties).forEach((childPropertyName) => {
            let errorsForProperty = collate_errors_for_property(element.properties[childPropertyName], childPropertyName, $errorSchema, element);
            $item_errors = [...$item_errors, ...errorsForProperty];
          });
        }
      }

      return $item_errors;
    };

    $schemaErrors = collate_errors_for_property(schema, 'root', errorSchema, null);

    const errorComponent = (
      <List>
        {$schemaErrors.map((error, eid) => {
          return (
            <li key={`property-error-${eid}`}>
              <ul>
                <ListSubheader style={{ marginTop: '-20px', fontSize: '14px', padding: 0 }}>{error.title || error.propertyName}</ListSubheader>
                {error.errors.map((item, iid) => (
                  <ListItem key={`${error.propertyName}-${iid}`} style={{ paddingTop: 0, paddingBottom: 0 }}>
                    <ListItemText primary={`${item.substring(0, 1).toUpperCase()}${item.substring(1, item.length)}`} />
                  </ListItem>
                ))}
              </ul>
              <hr />
            </li>)
        })}
      </List>
    );

    return (<ErrorPopover {...props}>
      <>
        <Typography variant={'h6'} color='error' style={{ marginLeft: '10%' }}>Form Errors</Typography>
        <hr />
        {errorComponent}
      </>
    </ErrorPopover>)
  }

  let errorComponent = errors.length > 1 ? renderMultipleErrors() : renderSingleError();

  return errorComponent;
}

export default MaterialFormErrorTemplate

