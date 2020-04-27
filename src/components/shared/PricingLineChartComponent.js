import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { throttle } from 'lodash';
import { withStyles } from '@material-ui/core/styles';
import { Tooltip, Slider, Grid, Typography, ThemeProvider } from '@material-ui/core';

// REQUIREMENTS
// 1. Additional Pricing Info Styling

class PricingLineChartWidget extends Component {

  static styles = theme => ({
    container: {
      minWidth: '450px',
      minHeight: '3px'
    },
    row: {
      width: '100%',
      display: 'flex',
    },
    topColumn: {
      flex: 1,
      position: 'relative',
      textAlign: 'center',
      fontSize: theme.spacing(1.5),
      paddingBottom: '8px',
      '&:after': {
        content: '""',
        position: 'absolute',
        width: theme.spacing(1),
        height: theme.spacing(1),
        left: '50%',
        bottom: -theme.spacing(0.5),
        backgroundColor: 'black',
        display: 'block',
        borderRadius: '50%'
      }
    },
    divider: {
      width: '100%',
      height: 0,
      '&:before': {
        content: '""',
        width: '100%',
        borderBottom: 'solid 1px black',
        display: 'block',
        background: 'black'
      }
    },
    bottomColumnStart: {
      flex: 1,
      position: 'relative',
      textAlign: 'left',
      fontSize: theme.spacing(1.5),
      paddingTop: '8px',
      '&:before': {
        content: '""',
        position: 'absolute',
        width: theme.spacing(1),
        height: theme.spacing(1),
        left: '0',
        top: -theme.spacing(0.5),
        backgroundColor: 'black',
        display: 'block',
        borderRadius: '50%'
      }
    },
    bottomColumnEnd: {
      flex: 1,
      position: 'relative',
      textAlign: 'right',
      fontSize: theme.spacing(1.5),
      paddingTop: '8px',
      '&:before': {
        content: '""',
        position: 'absolute',
        width: theme.spacing(1),
        height: theme.spacing(1),
        right: '0',
        top: -theme.spacing(0.5),
        backgroundColor: 'black',
        display: 'block',
        borderRadius: '50%'
      }

    },
    green: {
      color: '#9AD86E',
      '&:before, &:after': {
        backgroundColor: '#9AD86E',
      },
    },
    bad: {
      color: '#D74645',
      '&:before, &:after': {
        backgroundColor: '#D74645',
      },
    }
  });

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const { classes, uiSchema, formData } = this.props;
    const { landedPrice, threeMonthAvePrice, wh10CostPrice, listPrice } = formData;

    debugger;

    let _region = 'en-ZA';
    let _currencySymbol = 'R';

    let _landedCost = landedPrice;
    let _wh10Cost = wh10CostPrice;
    let _threeMonthAveSellingPrice = threeMonthAvePrice;
    let _listPrice = listPrice;

    if (uiSchema && uiSchema['ui:options']) {
      const uiOptions = uiSchema['ui:options'];
      if (uiOptions.currencySymbol) _currencySymbol = uiOptions.currencySymbol;
      if (uiOptions.region) _region = uiOptions.region;
    }

    const getFormattedValue = (value, append) => {
      return `${_currencySymbol} ${new Intl.NumberFormat(_region).format(value / 100)} ${append}`
    }

    return (
      <div className={classes.container}>
        <div className={classes.row}>
          <div className={classNames(classes.topColumn, classes.green)}>{getFormattedValue(_wh10Cost, '(WH10 Cost)')}</div>
          <div className={classNames(classes.topColumn, classes.green)}>{getFormattedValue(_threeMonthAveSellingPrice, '(3 month ave. Selling Price)')}</div>
        </div>
        <div className={classes.divider}></div>
        <div className={classes.row}>
          <div className={classes.bottomColumnStart}>{getFormattedValue(_landedCost, '(Landed Cost)')}</div>
          <div className={classNames(classes.bottomColumnEnd)}>{getFormattedValue(_listPrice, '(List Price)')}</div>
        </div>
      </div>
    );
  }
}

PricingLineChartWidget.propTypes = {
  classes: PropTypes.object,
};

export const PricingLineChartComponent = withStyles(PricingLineChartWidget.styles)(PricingLineChartWidget);
export default PricingLineChartComponent
