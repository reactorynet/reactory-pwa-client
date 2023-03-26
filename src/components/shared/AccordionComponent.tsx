import React, { Component } from 'react';
import {
  Button,
  AccordionSummary,
  Typography,
  Paper,
  Step,
  Stepper,
  StepLabel,
  StepContent,
  AccordionDetails,
  Accordion,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { initial, template } from 'lodash';
import { compose } from 'redux';
import { withTheme, withStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import { makeStyles } from '@mui/styles';
import ApiProvider, { withReactory } from '@reactory/client-core/api/ApiProvider';
import { pathExists } from 'fs-extra';



const getUIOptions = ({ uiSchema }) => {
  return uiSchema["ui:options"] || {};
}



const getPanels = ({ formData, schema, uiSchema }) => {

  let _panels = [];

  const uiOptions = getUIOptions({ uiSchema });

  if (Array.isArray(formData) === true) {
    _panels = [...formData];
  }

  if (uiOptions.panels && Array.isArray(uiOptions.panels) === true) {
    _panels = [..._panels, ...uiOptions.panels];
  }

  return _panels;

}

const initialState = { activeStep : 0 };


const getActiveStep = (props, state = initialState) => {
  const _panels = getPanels(props);
  const { expandedPanels } = props;

  if (expandedPanels && expandedPanels.length === 0) return state.activeStep;

  if (expandedPanels && expandedPanels.length === 1 && _panels.length > 0) {
    return props.reactory.utils.lodash.findIndex(_panels, (panel) => { return panel.id === expandedPanels[0] });
  }

  if (expandedPanels && expandedPanels.length > 1 && _panels.length > 0) {
    return state.activeStep
  }

  return state.activeStep;
}


class AccordionWidget extends Component<any, any> {

  constructor(props) {
    super(props);

    this.state = {
      activeStep: getActiveStep(props),
    };
  }

  /*
  componentDidUpdate(prevProps) {
    if (prevProps.activeStep !== this.props.activeStep) {
      this.setState(getActiveStep({ expandedPanels: props.expandedPanel }, getPanels(props), this.state));
    }
  }
  */

  render() {

    const { props } = this;

    const { formData, uiSchema, api, formContext, classes, reactory } = props;
    const uiOptions = uiSchema["ui:options"] || {};

    let _panels = [];
    let _panelComponents = [];
    let headerProps = {};
    let displayStepper = uiOptions.displayStepper || true;
    let _componentStyle = {};

    if (Array.isArray(formData) === true) {
      _panels = [...formData];
    }

    if (uiOptions.panels && Array.isArray(uiOptions.panels) === true) {
      _panels = [..._panels, ...uiOptions.panels];
    }


    if (uiOptions.Header) {
      headerProps = { ...headerProps, ...uiOptions.Header }
    }

    if (uiOptions.style) {
      _componentStyle = { ...uiOptions.style }
    }

    const that = this;


    if (displayStepper === true) {
      return (
        <div>
          <Stepper style={_componentStyle} activeStep={getActiveStep(props)} orientation="vertical">
            {
              _panels.map((panel, index) => {

                const panelSummary = (
                  <AccordionSummary key={`header_${index}`} className={classes.heading}
                  expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header" {...headerProps}>
                    <Typography>{`${index + 1}. ${panel.title}`}</Typography>
                  </AccordionSummary>
                );

                const onNextClick = () => {
                  if (that.state.activeStep < _panels.length - 1) {
                    that.setState({ activeStep: that.state.activeStep + 1 }, () =>{
                      if(props.onPanelChanged) {
                        props.onPanelChanged(_panels[that.state.activeStep]);
                      }
                    });
                  }
                }

                const onBackClick = () => {
                  if (that.state.activeStep > 0) {
                    that.setState({ activeStep: that.state.activeStep - 1 },() =>{
                      if(props.onPanelChanged) {
                        props.onPanelChanged(_panels[that.state.activeStep]);
                      }
                    });
                  }
                }

                const onDoneClick = () => {
                  if (formContext.$submit) {
                    try {
                      let done = formContext.$submit();
                      api.log(`Form submitted: ${done}`, {}, 'debug')
                    } catch (submitError) {
                      that.props.api.log(`Could not submit the form`, submitError, 'error')
                    }
                  }
                }

                const onStepLabelHeaderClick = (evt) => {
                  that.setState({ activeStep: index }, () => {
                    if(props.onPanelChanged) {
                      props.onPanelChanged(panel);
                    }
                  });
                }

                return (
                  <Step key={`step_${index}`}>
                    <StepLabel key={`label_${index}`} onClick={onStepLabelHeaderClick}>
                      <Paper elevation={2}>
                        <AccordionSummary key={`header_${index}`} className={classes.heading} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header" {...headerProps}>
                          <Typography>{`${index + 1}. ${panel.title}`}</Typography>
                        </AccordionSummary>
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
                      {index > 0 && <Button type="button" onClick={onBackClick} color="inherit">BACK</Button>}
                      {index !== _panels.length - 1 && <Button type="button" onClick={onNextClick} color="primary">NEXT</Button>}
                      {index === _panels.length - 1 && <Button type="button" color={panel.nextButtonProps && panel.nextButtonProps.color || 'primary'} onClick={onDoneClick} style={panel.nextButtonProps && panel.nextButtonProps.style ? panel.nextButtonProps.style : {}}>{panel.nextButtonProps && panel.nextButtonProps.title ? panel.nextButtonProps.title : 'DONE'}</Button>}
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
                <Accordion key={index}>
                  <AccordionSummary key={`header_${index}`}
                    className={classes.heading} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header" {...headerProps}>
                    <Typography>{`${index + 1}. ${panel.title}`}</Typography>
                  </AccordionSummary>
                  <AccordionDetails key={`details_${index}`} className={classes.panelBody}>
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
                  </AccordionDetails>
                </Accordion>
              )
            })
          }
        </div>
      );
    }
  }

  static styles = (theme):any => {
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

const AccordionComponent = compose(withReactory, withTheme, withStyles(AccordionWidget.styles))(AccordionWidget);
export default AccordionComponent;
