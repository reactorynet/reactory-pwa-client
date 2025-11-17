import React, { Fragment } from 'react';
import { styled } from '@mui/material/styles';
import {
  Button,
  IconButton,
  Icon,
  Typography,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  Theme,
} from '@mui/material';
import { isArray } from 'lodash';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import ReactoryApi from '@reactory/client-core/api/ReactoryApi';

const PREFIX = 'SlideOutLauncherComponent';

const classes = {
  compactRoot: `${PREFIX}-compactRoot`,
  closeButton: `${PREFIX}-closeButton`
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled('div')(({ theme }: { theme: Theme }) => {
  return {
    [`& .${classes.compactRoot}`]: {
      height: '90%',
      minWidth: '90%'
    },
    [`& .${classes.closeButton}`]: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
      color: theme.palette.grey[500],
    },

  };
});

interface IComponents {
  [key: string]: React.Component<any, any> | React.FunctionComponent<any> | Function | Object | any
}

const SlideOutLauncher = (props: any) => {
  const [open, setOpen] = React.useState(false);
  const componentDefs = props.api.getComponents(['core.SpeedDial']);

  const onClick = () => {
    setOpen((prevState) => !prevState);
  };

  let _props = { ...props };

    let {
      formData,
      uiSchema,
    } = _props;

    let isFormWidget = false;

    if (formData && uiSchema) {
      isFormWidget = true;
    }

    if (isFormWidget && uiSchema["ui:options"]) {
      const uiOptions = uiSchema["ui:options"];
      if (uiOptions.props) {
        _props = { ..._props, ...uiOptions.props }
      }
    };


    let {
      api,
      classes,
      componentFqn,
      buttonTitle,
      windowTitle,
      buttonVariant,
      buttonIcon,
      dialogVariant = 'fullscreen',
      buttonProps = {},
      componentProps,
      actions,
      childProps = {},
    } = _props;



    let icon = buttonIcon;

    const tpl = (format) => {
      try {
        return api.utils.template(format)(props);
      }
      catch (templateError) {
        return `Bad Template ${templateError.message}`;
      }
    }

    let _buttonTitle = buttonTitle ? tpl(buttonTitle) : '';
    let _windowTitle = windowTitle ? tpl(windowTitle) : '';
    let _buttonVariant = buttonVariant; //? tpl(buttonVariant) : '';

    let _showAppBar = true;
    _showAppBar = props.backNavigationConfig ? false : true;
    let _backNavigationItems = [];
    if (props.backNavigationConfig) {
      _backNavigationItems = props.backNavigationConfig.backNavigationItems.map(item => {
        return tpl(item);
      });
    }
    let _containerProps = {};
    _containerProps = props.backNavigationConfig ? props.backNavigationConfig.containerProps : {};

    const FullScreenModal = api.getComponent('core.FullScreenModal');
    let ChildComponent = api.getComponent(componentFqn || 'core.Loading');
    let componentFound = true;
    let childprops = { ...childProps };

    if (ChildComponent === null || ChildComponent === undefined) {
      componentFound = false;
      ChildComponent = api.getComponent("core.NotFound");
      childprops = {
        message: `The component you specified ${componentFqn} could not be found`,
      };
    }

    if (componentProps && open === true && componentFound === true) {
      childprops = { ...childprops, ...api.utils.objectMapper(props, componentProps), onClose: onClick };
    }

    let LaunchButton = (
      <Button onClick={onClick}>
        {icon && <Icon>{icon}</Icon>}
        {_buttonTitle}
      </Button>
    );

    const SpeedDial: any = componentDefs.SpeedDial as any;

    if (_buttonVariant === 'IconButton') {
      LaunchButton = (
        <IconButton
          onClick={onClick}
          color={buttonProps.color || "primary"}
          style={buttonProps.style || {}}
          size="large">
          <Icon>{icon}</Icon>
        </IconButton>
      )
    }

    if (_buttonVariant === "Fab") {
      LaunchButton = (
        <Fab size={buttonProps.size || "medium"} variant={buttonProps.variant || "round"} onClick={onClick} color={buttonProps.color || "primary"} style={buttonProps.style || {}}>
          <Icon>{icon}</Icon>
          {buttonProps.variant === "extended" && _buttonTitle}
        </Fab>
      )
    }

    if (_buttonVariant === 'Typography') {
      LaunchButton = (
        <Typography onClick={onClick} variant={buttonProps.variant || "body2"} color={buttonProps.color || 'default'} style={buttonProps.style || {}}>
          {icon ? <Icon>{icon}</Icon> : null}
          {_buttonTitle}
        </Typography>
      )
    }

    if (_buttonVariant === 'SpeedDial') {

      actions.forEach((action) => {
        action.icon = (<Icon>{action.icon}</Icon>);
        action.clickHandler = () => {
          if (action.clickAction && action.clickAction === 'navigate') {
            api.goto(action.link);
          }
          else if (action.clickAction && action.clickAction === 'launch-slideout') {
            onClick();
          }
        }
      });

      LaunchButton = (<SpeedDial actions={actions} icon={<Icon>{icon}</Icon>} />)
    }

    if (dialogVariant == 'compact') {
      return (
        <>
          {LaunchButton}
          <Dialog
            open={open === true}
            fullWidth={true}
            maxWidth="lg"
            classes={{ paper: classes.compactRoot }}
          >
            <DialogTitle style={{ padding: '16px 24px', borderBottom: 'solid 1px #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" style={{ fontWeight: "bold" }}>More Details</Typography>
                <Icon onClick={onClick}>close</Icon>
              </div>
            </DialogTitle>
            {/* <DialogContent style={{ paddingTop: 0, paddingRight: '32px', paddingLeft: '32px' }} > */}
            <DialogContent style={{ paddingTop: '16px' }} >
              {open === true ? <ChildComponent {...childprops} /> : null}
            </DialogContent>
          </Dialog>
        </>
      );
    }


    return (
      <Root>
        {LaunchButton}
        <FullScreenModal
          open={open === true}
          title={_windowTitle}
          slide={props.slideDirection}
          onClose={onClick}
          showAppBar={_showAppBar}
          backNavigationItems={_backNavigationItems}
          containerProps={_containerProps}
        >
          {open === true ? <ChildComponent {...childprops} /> : null}
        </FullScreenModal>
      </Root>
    );
};

const SlideOutLauncherComponent: any = compose(withReactory)(SlideOutLauncher);

SlideOutLauncherComponent.defaultProps = {
  componentFqn: 'core.Logo',
  slideDirection: 'right',
};

SlideOutLauncherComponent.meta = {
  nameSpace: 'core',
  name: 'SlideOutLauncher',
  version: '1.0.0',
  component: SlideOutLauncherComponent,
  tags: ['widget', 'api-enabled', 'wrapper'],
  description: 'Widget to launch slide out containers with',
};


export default SlideOutLauncherComponent;
