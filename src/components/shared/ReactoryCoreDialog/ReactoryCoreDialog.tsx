'use strict';
/**
 * ReactoryCoreDialog Component
 * 
 * A flexible, reusable dialog component for the Reactory platform that provides:
 * - Responsive design with automatic full-screen on mobile
 * - Configurable app bar with title and close button
 * - Breadcrumb navigation support
 * - Event-driven closing mechanism
 * - Material-UI theming integration
 * - Customizable styling and behavior
 * 
 * @example
 * // Basic usage
 * <ReactoryCoreDialog
 *   open={isOpen}
 *   title="My Dialog"
 *   onClose={() => setIsOpen(false)}
 * >
 *   <div>Dialog content here</div>
 * </ReactoryCoreDialog>
 * 
 * @example
 * // With breadcrumb navigation
 * <ReactoryCoreDialog
 *   open={isOpen}
 *   title="User Details"
 *   backNavigationItems={['Users', 'User Management', 'John Doe']}
 *   onClose={() => setIsOpen(false)}
 * >
 *   <UserDetailsComponent />
 * </ReactoryCoreDialog>
 * 
 * @example
 * // With custom styling and event-driven closing
 * <ReactoryCoreDialog
 *   open={isOpen}
 *   title="Form Dialog"
 *   showAppBar={true}
 *   fullScreen={false}
 *   maxWidth="md"
 *   closeOnEvents={['form:submitted', 'form:cancelled']}
 *   appBarProps={{ color: 'primary' }}
 *   containerProps={{
 *     PaperProps: { style: { borderRadius: 16 } }
 *   }}
 *   onClose={() => setIsOpen(false)}
 * >
 *   <MyFormComponent />
 * </ReactoryCoreDialog>
 * 
 * @example
 * // Mobile-optimized dialog
 * <ReactoryCoreDialog
 *   open={isOpen}
 *   title="Mobile Dialog"
 *   breakpoint="md"
 *   fullScreen={true}
 *   onClose={() => setIsOpen(false)}
 * >
 *   <MobileOptimizedContent />
 * </ReactoryCoreDialog>
 */

import React, { Fragment } from 'react';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { isEqual } from 'lodash';
import { useTheme } from '@mui/material/styles';
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
  DialogProps,
  AppBarProps,
  ToolbarProps,
  Theme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { deepEquals } from '@reactory/client-core/components/reactory/form/utils';
import {
  useMediaQuery
} from '@mui/material';

const PREFIX = 'ReactoryCoreDialog';

const classes = {
  dialog_root: `${PREFIX}-dialog_root`,
  appBar: `${PREFIX}-appBar`,
  flex: `${PREFIX}-flex`,
  backNavContainer: `${PREFIX}-backNavContainer`,
  backButtonText: `${PREFIX}-backButtonText`,
  linkContainer: `${PREFIX}-linkContainer`,
  linkText: `${PREFIX}-linkText`,
  linkTextLast: `${PREFIX}-linkTextLast`,
  backNavComponent: `${PREFIX}-backNavComponent`
};

const StyledFragment  = styled(Fragment )((
  {
    theme
  }
): any => {
  return {
    [`& .${classes.dialog_root}`]: {
      overflowX: 'hidden',
    },
    [`& .${classes.appBar}`]: {
      position: 'relative',          
    },
    [`& .${classes.flex}`]: {
      flex: 1,
    },
    [`& .${classes.backNavContainer}`]: {
      display: 'flex',
      margin: '32px 32px 6px',
    },
    [`& .${classes.backButtonText}`]: {
      fontWeight: 600,
      lineHeight: '1.8'
    },
    [`& .${classes.linkContainer}`]: {
      display: 'flex',
      paddingLeft: theme.spacing(4),
    },
    [`& .${classes.linkText}`]: {
      lineHeight: '1.8',
      fontWeight: 400,
    },
    [`& .${classes.linkTextLast}`]: {
      lineHeight: '1.8',
      fontWeight: 400,
      color: theme.palette.primary.main,
      paddingLeft: '5px'
    },
    [`& .${classes.backNavComponent}`]: {
      flex: 1,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingRight: '5px'
    }
  };
});

// TypeScript interfaces for better type safety
export interface IReactoryCoreDialogProps {
  /** Whether the dialog is open */
  open?: boolean;
  /** Dialog title displayed in the app bar */
  title?: string;
  /** Whether to show the app bar */
  showAppBar?: boolean;
  /** Props to pass to the AppBar component */
  appBarProps?: Partial<AppBarProps>;
  /** Props to pass to the Toolbar component */
  toolbarProps?: Partial<ToolbarProps>;
  /** Props to pass to the Dialog component */
  containerProps?: Partial<DialogProps> & {
    /** Custom style for the navigation container */
    navContainerStyle?: React.CSSProperties;
  };
  /** Slide direction for the transition */
  slide?: 'up' | 'down' | 'left' | 'right';
  /** Whether the dialog should be full screen */
  fullScreen?: boolean;
  /** Whether the dialog should be full width */
  fullWidth?: boolean;
  /** Maximum width of the dialog */
  maxWidth?: false | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Breakpoint at which to switch to full screen */
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Array of navigation items for breadcrumb navigation */
  backNavigationItems?: string[];
  /** Custom component to render in the back navigation area */
  backNavComponent?: React.ReactNode;
  /** Icon to use for the close button */
  closeButtonIcon?: string;
  /** Array of event names that should trigger dialog close */
  closeOnEvents?: string[];
  /** Callback function when dialog closes */
  onClose?: () => void;
  /** Dialog content */
  children?: React.ReactNode;
  /** Theme object from Material-UI */
  theme?: Theme;
  /** Reactory API instance */
  reactory?: any;
  /** CSS classes from withStyles HOC */
  classes?: any;
}


const Transition = React.forwardRef(function Transition(props: any, ref) {
  return <Slide direction={props.direction || "up"} ref={ref} {...props} />;
});


/**
 * ReactoryCoreDialog - A flexible, reusable dialog component for the Reactory platform
 * 
 * Features:
 * - Responsive design with automatic full-screen on mobile
 * - Configurable app bar with title and close button
 * - Breadcrumb navigation support
 * - Event-driven closing mechanism
 * - Material-UI theming integration
 * - Customizable styling and behavior
 * 
 * @param props - Component props
 * @returns React component
 */
const FullScreenDialog = (props: IReactoryCoreDialogProps) => {
  const theme = useTheme();

  const {    
    open = false,
    title,
    showAppBar = true,
    appBarProps = {},
    toolbarProps = { 
      variant: "dense" 
    },
    containerProps = {},
    slide = 'up',
    fullScreen = true,
    fullWidth = true,
    backNavigationItems = [],
    backNavComponent = null,
    maxWidth = false,
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
    if (reactory && closeOnEvents.length > 0) {
      closeOnEvents.forEach((eventName) => {
        try {
          reactory.on(eventName, handleClose);
        } catch (error) {
          console.warn(`Failed to register event listener for ${eventName}:`, error);
        }
      });
    }
  }

  const onUnmount = () => {
    const { closeOnEvents = [] } = props;
    if (reactory && closeOnEvents.length > 0) {
      closeOnEvents.forEach((eventName) => {
        try {
          reactory.removeListener(eventName, handleClose);
        } catch (error) {
          console.warn(`Failed to remove event listener for ${eventName}:`, error);
        }
      });
    }
  }

  useEffect(() => {
    onMount();
    return onUnmount;
  }, [props.closeOnEvents, reactory, onClose]);



  let BackNavigation = null;

  // BackNavigation component with improved mobile responsiveness
  if (backNavigationItems && backNavigationItems.length > 0) {
    BackNavigation = () => {
      return (
        <div className={classes.backNavContainer} style={containerProps.navContainerStyle ? { ...containerProps.navContainerStyle } : {}}>
          <Grid container spacing={1} alignItems="center">
            <Grid item>
              <div style={{ display: 'flex', cursor: 'pointer' }} onClick={handleClose}>
                <Icon style={{ fontSize: 30 }}>chevron_left</Icon>
                <Typography variant="h6" classes={{ root: classes.backButtonText }}>Back</Typography>
              </div>
            </Grid>
            <Grid item xs>
              <div className={classes.linkContainer}>
                {backNavigationItems.map((navItem, ind) => (
                  <React.Fragment key={`nav-item-${ind}`}>
                    <Typography variant="h6" classes={{ root: classes.linkText }}>
                      {navItem}
                    </Typography>
                    {(ind + 1) < backNavigationItems.length && (
                      <Typography variant="h6" classes={{ root: classes.linkText }}>/</Typography>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Grid>
            {backNavComponent && (
              <Grid item>
                <div className={classes.backNavComponent}>
                  {backNavComponent}
                </div>
              </Grid>
            )}
          </Grid>
        </div>
      );
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
      overflowX: 'hidden' as const
    }
  }

  return (
    <Fragment>
      <Dialog className={classes.dialog_root} {...dialogProps} >
        {
          showAppBar && <AppBar className={classes.appBar} {...appBarProps}>
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
        <div style={{ marginTop: showAppBar ? '48px' : '0px' }}>
        {children}
        </div>
      </Dialog>
    </Fragment >
  );

}

FullScreenDialog.propTypes = {
  classes: PropTypes.object.isRequired,
  open: PropTypes.bool,
  title: PropTypes.string,
  showAppBar: PropTypes.bool,
  appBarProps: PropTypes.object,
  toolbarProps: PropTypes.object,
  containerProps: PropTypes.object,
  slide: PropTypes.oneOf(['up', 'down', 'left', 'right']),
  fullScreen: PropTypes.bool,
  fullWidth: PropTypes.bool,
  backNavigationItems: PropTypes.arrayOf(PropTypes.string),
  backNavComponent: PropTypes.node,
  maxWidth: PropTypes.oneOf([false, 'xs', 'sm', 'md', 'lg', 'xl']),
  breakpoint: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  closeButtonIcon: PropTypes.string,
  closeOnEvents: PropTypes.arrayOf(PropTypes.string),
  onClose: PropTypes.func,
  children: PropTypes.node,
  theme: PropTypes.object,
  reactory: PropTypes.object,
};

FullScreenDialog.defaultProps = {
  open: false,
  showAppBar: true,
  slide: 'up',
  fullScreen: true,
  fullWidth: true,
  backNavigationItems: [],
  breakpoint: 'sm',
  closeButtonIcon: 'close',
  closeOnEvents: [],
  children: [],
};

export default compose(withReactory)(FullScreenDialog);
