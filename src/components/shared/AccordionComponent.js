import React, { Component } from 'react';
import {
  Button,
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails,
  Typography,
  Paper,
  Step,
  Stepper,
  StepLabel,
  StepContent,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { template } from 'lodash';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import ApiProvider, { withApi } from '@reactory/client-core/api/ApiProvider';
import { isArray } from 'util';
import { pathExists } from 'fs-extra';

class AccordionWidget extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      activeStep: props.activeStep || 0
    };
  }

  render() {
    const { props, theme, state } = this;
    const { formData, uiSchema, api, formContext, classes } = props;
    const uiOptions = uiSchema["ui:options"] || {};
    let _panels = [];
    let _panelComponents = [];
    let headerProps = {};
    let displayStepper = uiOptions.displayStepper || true;
    let _componentStyle = {};

    if (isArray(formData) === true) {
      _panels = [...formData];
    }

    if (uiOptions.panels && isArray(uiOptions.panels) === true) {
      _panels = [..._panels, ...uiOptions.panels];
    }


    if(uiOptions.Header) {
      headerProps = {...headerProps, ...uiOptions.Header}
    }

    if(uiOptions.style) {
      _componentStyle = {...uiOptions.style}
    }

    const that = this;

    if(displayStepper === true) {
      return (
        <div>
          <Stepper style={_componentStyle} activeStep={this.state.activeStep || 0} orientation="vertical">
          {
            _panels.map((panel, index) =>
            {

              const panelSummary = (
                <ExpansionPanelSummary key={`header_${index}`} className={classes.heading} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header" {...headerProps}>
                  <Typography>{`${index + 1}. ${panel.title}`}</Typography>
                </ExpansionPanelSummary>
              );

              const onNextClick = () => {
                if(that.state.activeStep < _panels.length - 1) {
                  that.setState({ activeStep: that.state.activeStep + 1 });
                }
              }

              const onBackClick = () => {
                if(that.state.activeStep > 0) {
                  that.setState({ activeStep: that.state.activeStep - 1 });
                }
              }

              const onDoneClick = () => {
                if(formContext.$submit) {
                  try {
                    let done = formContext.$submit();
                    api.log(`Form submitted: ${done}`, {} ,'debug')
                  } catch (submitError) {
                    self.props.api.log(`Could not submit the form`, submitError, 'error')
                  }
                }
              }

              const onStepLabelHeaderClick = (evt) => {
                that.setState({ activeStep:  index });
              }

              return (
                <Step key={`step_${index}`}>
                  <StepLabel key={`label_${index}`} onClick={onStepLabelHeaderClick}>
                    <Paper elevation={2}>
                    <ExpansionPanelSummary key={`header_${index}`} className={classes.heading} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header" {...headerProps}>
                      <Typography>{`${index + 1}. ${panel.title}`}</Typography>
                    </ExpansionPanelSummary>
                    </Paper>
                  </StepLabel>
                  <StepContent key={`content_label_${index}`}>
                    {
                      panel.Components.map(({ componentFqn, componentProps, componentPropsMap }, ComponentIndex) => {

                        let ComponentToMount = api.getComponent(componentFqn);
                        let ComponentFound = true;
                        if (ComponentToMount === null || ComponentToMount === undefined) {
                          ComponentFound = false;
                          ComponentToMount = api.getComponent("core.NotFound");
                        }

                        let mergedProperties = {};
                        if (componentPropsMap) {
                          mergedProperties = api.utils.objectMapper(props, componentPropsMap)
                        }

                        if (ComponentFound === true)
                          return <ComponentToMount {...{ ...componentProps, ...mergedProperties, key: ComponentIndex }} />
                        else
                          return <ComponentToMount message={`Could not load component ${componentFqn}, please check your registry loaders and namings`} key={ComponentIndex} />

                      })
                    }
                    { index > 0 && <Button type="button" onClick={onBackClick} color="default">BACK</Button> }
                    { index !== _panels.length - 1 && <Button type="button" onClick={onNextClick} color="primary">NEXT</Button> }
                    { index === _panels.length - 1 && <Button type="button" color={panel.nextButtonProps && panel.nextButtonProps.color || 'primary'} onClick={onDoneClick} color="primary" style={panel.nextButtonProps && panel.nextButtonProps.style ? panel.nextButtonProps.style : {} }>{panel.nextButtonProps && panel.nextButtonProps.title ? panel.nextButtonProps.title  :'DONE' }</Button> }
                  </StepContent>
                </Step>
              )
            })
          }
          </Stepper>
        </div>
      )
    } else {
      return (
        <div>
          {
            _panels.map((panel, index) => {
              return (
                <ExpansionPanel key={index}>
                  <ExpansionPanelSummary key={`header_${index}`} className={classes.heading} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header" {...headerProps}>
                    <Typography>{`${index + 1}. ${panel.title}`}</Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails key={`details_${index}`} className={classes.panelBody}>
                  {
                    panel.Components.map(({ componentFqn, componentProps, componentPropsMap }, ComponentIndex) => {
                      let ComponentToMount = api.getComponent(componentFqn);
                      let ComponentFound = true;
                      if (ComponentToMount === null || ComponentToMount === undefined) {
                        ComponentFound = false;
                        ComponentToMount = api.getComponent("core.NotFound");
                      }

                      let mergedProperties = {};
                      if (componentPropsMap) {
                        mergedProperties = api.utils.objectMapper(props, componentPropsMap)
                      }

                      if (ComponentFound === true)
                        return <ComponentToMount {...{ ...componentProps, ...mergedProperties, key: ComponentIndex }} />
                      else
                        return <ComponentToMount message={`Could not load component ${componentFqn}, please check your registry loaders and namings`} key={ComponentIndex} />
                    })
                  }
                  </ExpansionPanelDetails>
                </ExpansionPanel>
              )
            })
          }
        </div>
      );
    }
  }

  static styles = (theme) => {
    return {
      root: {
        width: '50%',
      },
      heading: {
        fontSize: theme.spacing(1.5),
        fontWeight: 'bold',
        color: theme.palette.primary.light,
      },
      panelBody: {
        display: 'flex',
        flexDirection: 'column'
      },
      StepLabel: {
        borderTop: '1px solid #BDBDBD',
        borderBottom: '1px solid #BDBDBD'
      }
    }
  }
};

const AccordionComponent = compose(withApi, withTheme, withStyles(AccordionWidget.styles))(AccordionWidget);
export default AccordionComponent;
