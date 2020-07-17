import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  AppBar,
  Tabs,
  Tab,
  Typography,
  Box
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

  render() {
    let {
      api,
      componentFqn,
      buttonTitle,
      windowTitle,
      buttonVariant,
      buttonIcon,
      buttonProps = {},
      componentProps,
      actions,
      childProps = {},
      formData,
      uiSchema,
      classes
    } = this.props;

    let ChildComponent = api.getComponent(componentFqn || 'core.Loading');

    let _panels = formData.options.map((option, index) => {
      let _componentProps = {
        formData: option
      }
      return (
        <TabPanel value={this.state.value} index={index}>
          <ChildComponent {..._componentProps} />
        </TabPanel>
      )
    });

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
            <Tab label="Option 1" {...a11yProps(0)} />
            <Tab label="Option 2" {...a11yProps(1)} />
          </Tabs>
        </AppBar>
        {_panels}
      </div>
    )
  }

  // <TabPanel value={this.state.value} index={0}>
  //   <ChildComponent {..._componentProps} />
  // </TabPanel>
  static styles = (theme) => {
    return {
      indicator: {
        backgroundColor: theme.palette.primary.main,
      }
    }
  }
}

const FreightRequestQuoteComponent = compose(withTheme, withApi, withTheme, withStyles(FreightRequestQuoteWidget.styles))(FreightRequestQuoteWidget);

export default FreightRequestQuoteComponent;
