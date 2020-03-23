import React, { Component } from 'react';
import {
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails,
  Typography
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { template } from 'lodash';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import ApiProvider, { withApi } from '@reactory/client-core/api/ApiProvider';
import { isArray } from 'util';

class AccordionWidget extends Component {

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const { props, theme, state } = this;
    const { formData, uiSchema, api, formContext, classes } = props;
    const uiOptions = uiSchema["ui:options"] || {};
    let _panels = [];
    let _panelComponents = [];
    let headerProps = {};

    if (isArray(formData) === true) {
      _panels = [...formData];
    }

    if (uiOptions.panels && isArray(uiOptions.panels) === true) {
      _panels = [..._panels, ...uiOptions.panels];
    }

    
    if(uiOptions.Header) {
      headerProps = {...headerProps, ...uiOptions.Header}
    }

    return (
      <div>
        {
          _panels.map((panel, index) => {
            return (
              <ExpansionPanel>
                <ExpansionPanelSummary className={classes.heading} expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header" {...headerProps}>
                  <Typography>{`${index + 1}. ${panel.title}`}</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className={classes.panelBody}>
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
      }
    }
  }
};

const AccordionComponent = compose(withApi, withTheme, withStyles(AccordionWidget.styles))(AccordionWidget);
export default AccordionComponent;
