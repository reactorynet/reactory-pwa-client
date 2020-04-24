import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import { withStyles } from '@material-ui/core/styles';
import { Tooltip, Slider, Grid, Typography } from '@material-ui/core';

// REQUIREMENTS
// 1. Slider
// 2. Multiple points
// 3. Point Labels
// 4. Static Labels

class PricingLineChartWidget extends Component {

  static styles = theme => ({
    container: {
      minWidth: '400px',
      minHeight: '3px'
    },
    topRow: {
      width: '100%',

    },
    divider: {
      width: '100%',
      height: 0,
      '&:before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        borderBottom: 'solid 2px black',
        display: 'block',
        background: 'black'
      }
    }
  });

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const { classes, uiSchema, landedPrice, threeMonthAvePrice, wh10CostPrice, listPrice } = this.props;
    // let defaultRegion = 'af';
    // let defaultCurrencyOptions = { style: 'currency', currency: 'ZAR', currencyDisplay: 'symbol' };

    // let _landedCost = landedPrice;
    // let _wh10Cost = wh10CostPrice;
    // let _threeMonthAveSellingPrice = threeMonthAvePrice;
    // let _listPrice = listPrice;

    // let options = { min: 0, max: 100, step: 1, }
    // if (uiSchema && uiSchema['ui:options']) options = { ...options, ...uiSchema['ui:options'] }

    // return `${new Intl.NumberFormat(defaultRegion, defaultCurrencyOptions).format(labelValue/100)} (WH10 Cost Price)`

    return (
      <div className={classes.container}>
        <div className={classes.topRow}>
          <div className={classes.topColumn}></div>
        </div>
        <div className={classes.divider}></div>
        {/* <div className={bottom}></div> */}
      </div>
    );

    // <Fragment>
    //     <Grid container spacing={0}>
    //       <Grid item xs={12}>
    //         <Grid item xs={6}>
    //           <p>3 Month Average</p>
    //         </Grid>
    //         <Grid item xs={6}>
    //           <p>3 Month Average</p>
    //         </Grid>
    //       </Grid>
    //       <Grid xs={12}><p>Line goes here</p></Grid>
    //       <Grid item xs={12}>
    //         <Grid item xs={6}>
    //           <p>Landed Cost</p>
    //         </Grid>
    //         <Grid item xs={6}>
    //           <p>List Price</p>
    //         </Grid>
    //       </Grid>

    //     </Grid>

    //   </Fragment>
  }
}

PricingLineChartWidget.propTypes = {
  classes: PropTypes.object,
};

export const PricingLineChartComponent = withStyles(PricingLineChartWidget.styles)(PricingLineChartWidget);
export default PricingLineChartComponent
