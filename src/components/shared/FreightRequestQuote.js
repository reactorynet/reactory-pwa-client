import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  AppBar,
  Tabs,
  Tab,
  Typography,
  Box,
  Button
} from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';
import { withApi } from '../../api/ApiProvider';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box p={3}>{children}</Box>
    </Typography>
  );
}

class FreightRequestQuoteWidget extends Component {

  state = {
    value: 0,
  }

  handleChange = (event, value) => {
    this.setState({ value });
  }

  submitRequest = () => {
    const { formContext, api } = this.props;
    try {
      let done = formContext.$ref.submit();
      api.log(`Freight Request Form submitted: ${done}`, {}, 'debug')
    } catch (error) {
      api.log(`Freight Request Form Submission Failed: ${error}`, {}, 'debug')
    }
  }

  render() {
    let {
      api,
      optionsComponents,
      productComponent,
      formData,
      classes
    } = this.props;

    let _tabs = [];
    let _panels = [];

    formData.options.forEach((option, index) => {
      _tabs.push(<Tab label={`Option ${index + 1}`} {...a11yProps(index)} />)

      let _componentForms = [];
      let _componentProps = { formData: option }

      optionsComponents.map(component => {
        let ChildForm = api.getComponent(component.componentFqn || 'core.Loading');
        _componentForms.push(<ChildForm {..._componentProps} />)
      });

      _panels.push(
        <TabPanel value={this.state.value} index={index}>
          {_componentForms}
        </TabPanel>);
    });

    const ProductComponent = api.getComponent(productComponent.componentFqn || 'core.Loading');
    let _componentProps = { formData: formData }

    function a11yProps(index) {
      return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
      };
    }

    return (
      <div>
        <AppBar position="static">
          <Tabs value={this.state.value} onChange={this.handleChange} aria-label="simple tabs example">
            {_tabs}
          </Tabs>
        </AppBar>
        {_panels}
        <ProductComponent {..._componentProps} />

        <div className={classes.buttonContainer}>
          <Button variant="contained" classes={{ root: classes.button }}>CANCEL</Button>
          <Button color="primary" variant="contained" classes={{ root: classes.button }} onClick={this.submitRequest}>REQUEST FREIGHT</Button>
        </div>
      </div>
    )
  }

  static styles = (theme) => {
    return {
      buttonContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: theme.spacing(3),
        '& button': {
          marginLeft: theme.spacing(1)
        }
      },
      button: {
        color: '#fff'
      }
    }
  }
}

const FreightRequestQuoteComponent = compose(withTheme, withApi, withTheme, withStyles(FreightRequestQuoteWidget.styles))(FreightRequestQuoteWidget);

export default FreightRequestQuoteComponent;
