'use strict'
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { isEqual } from 'lodash';
import { withStyles, withTheme } from '@mui/styles';
import {
  AppBar,
  Dialog,
  Toolbar,
  Typography,
  Grid,
  Icon,
  IconButton,
  Button,
  Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { deepEquals } from '../reactory/form/utils';
import {
  useMediaQuery
} from '@mui/material';

const FullScreenDialogStyles = (theme): any => {
  return {
    dialog_root: {
      overflowX: 'hidden',
    },
    appBar: {
      position: 'relative',
    },
    flex: {
      flex: 1,
    },
    backNavContainer: {
      display: 'flex',
      margin: '32px 32px 6px',
    },
    backButtonText: {
      fontWeight: 600,
      lineHeight: '1.8'
    },
    linkContainer: {
      display: 'flex',
      paddingLeft: theme.spacing(4),
    },
    linkText: {
      lineHeight: '1.8',
      fontWeight: 400,
    },
    linkTextLast: {
      lineHeight: '1.8',
      fontWeight: 400,
      color: theme.palette.primary.main,
      paddingLeft: '5px'
    },
    backNavComponent: {
      flex: 1,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingRight: '5px'
    }
  }
};


const Transition = React.forwardRef(function Transition(props: any, ref) {
  return <Slide direction={props.direction || "up"} ref={ref} {...props} />;
});


const FullScreenDialog = (props) => {

  const {
    classes,
    open = false,
    title,
    showAppBar = true,
    appBarProps = {},
    toolbarProps = { variant: "dense" },
    containerProps = {},
    slide = 'up',
    fullScreen = true,
    fullWidth = true,
    backNavigationItems = [],
    backNavComponent = null,
    maxWidth = false,
    theme,
    breakpoint = 'sm',
    reactory,
    onClose = null,
    children = []
  } = props;


  const { useState, useEffect } = React;


  const shouldBreak = useMediaQuery(theme.breakpoints.down(breakpoint));

  /**
   * internal handler for closing / opening the state of the modal.
   */
  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  };

  const onMount = () => {
    const { closeOnEvents = [] } = props;
    closeOnEvents.map((eventName) => reactory.on(eventName, handleClose))
  }

  const onUnmount = () => {
    const { closeOnEvents = [] } = props;
    closeOnEvents.map((eventName) => reactory.removeListener(eventName, handleClose))
  }

  useEffect(() => {

    onMount();

    return onUnmount;

  });



  let BackNavigation = null;

  // NOTE - THIS NEEDS TO BE RESTRUCTURED TO USE A GRID LAYOUT - MOBILE FRIENDLY
  if (backNavigationItems && backNavigationItems.length > 0) {
    BackNavigation = (props) => {
      return (
        <div className={classes.backNavContainer} style={containerProps.navContainerStyle ? { ...containerProps.navContainerStyle } : {}} key={'back-nav'}>
          <div style={{ display: 'flex', cursor: 'pointer' }} onClick={handleClose} key={'chevron'}>
            <Icon style={{ fontSize: 30 }}>chevron_left</Icon>
            <Typography variant="h6" classes={{ root: classes.backButtonText }}>Back</Typography>
          </div>
          <div className={classes.linkContainer} key={'container'}>
            {
              backNavigationItems.map((navItem, ind) => {
                if ((ind + 1) < backNavigationItems.length)
                  return <Typography variant="h6" classes={{ root: classes.linkText }} key={ind}>{navItem} /</Typography>

                return <Typography variant="h6" classes={{ root: classes.linkTextLast }} key={ind}>{navItem}</Typography>
              })
            }
          </div>
          {
            backNavComponent && <div className={classes.backNavComponent} key={'component'}>
              {backNavComponent}
            </div>
          }
        </div>
      )
    };
  }


  let dialogProps = {
    fullScreen: fullScreen === true ? true : shouldBreak === true,
    fullWidth,
    maxWidth,
    open,
    onClose: handleClose,
    TransitionComponent: Transition,
    ...containerProps,
    style: {
      overflowX: 'hidden'
    }
  }

  return (
    <Fragment>
      <Dialog className={classes.dialog_root} {...dialogProps} >
        {
          showAppBar && <AppBar className={classes.appBar} color={"transparent"} {...appBarProps}>
            <Toolbar {...toolbarProps} variant={"dense"}>
              <IconButton color="inherit" onClick={handleClose} aria-label="Close" size="large">
                <Icon>{props.closeButtonIcon || 'close'}</Icon>
              </IconButton>
              {title ? <Typography variant="h6" color="inherit">{title}</Typography> : null}
            </Toolbar>
          </AppBar>
        }

        {
          backNavigationItems && backNavigationItems.length > 0 && <BackNavigation />
        }
        {children}
      </Dialog>
    </Fragment >
  );

}

FullScreenDialog.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default compose(withReactory, withTheme, withStyles(FullScreenDialogStyles))(FullScreenDialog);
