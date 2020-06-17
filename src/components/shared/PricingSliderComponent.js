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

class PricingSliderWidget extends Component {

  static styles = theme => ({
    root: {
      width: '200px',
    },
    slider: {
      padding: '22px 0px',
      margin: 'auto'
    },
    label1: {
      textAlign: 'right',
      color: 'red'
    },
    label2: {
      color: 'red',
      textAlign: 'right'
    }
  });

  constructor(props, context) {
    super(props, context)
    this.state = {
      value: props.formData || 0,
    }
    this.handleChange = this.handleChange.bind(this)
  }


  handleChange = (event, value) => {
    // this.setState({ value }, ()=>{
    //   this.props.onChange(value);
    // });
  };

  render() {
    const { classes, uiSchema, landedPrice, threeMonthAvePrice, wh10CostPrice, listPrice } = this.props;
    let defaultRegion = 'af';
    let defaultCurrencyOptions = { style: 'currency', currency: 'ZAR', currencyDisplay: 'symbol' };
    let _landedCost = landedPrice;
    let _wh10Cost = wh10CostPrice;
    let _threeMonthAveSellingPrice = threeMonthAvePrice;
    let _listPrice = listPrice;

    let defaultValues = [];
    defaultValues.push(_wh10Cost);
    defaultValues.push(_threeMonthAveSellingPrice);

    let options = { min: 0, max: 100, step: 1, }
    if (uiSchema && uiSchema['ui:options']) options = { ...options, ...uiSchema['ui:options'] }

    const CustomSlider = withStyles({
      root: {
        height: 2,
        padding: '15px 0',
        width: '400px',
      },
      thumb: {
        height: 10,
        width: 10,
        backgroundColor: '#000',
        marginTop: -4,
        marginLeft: -4,
      },
      active: {},
      valueLabel: {
        left: 'calc(-50% + 11px)',
        top: -22,
        '& *': {
          background: 'transparent',
          color: '#000',
        },
      },
      track: {
        height: 2,
      },
      rail: {},
      mark: {},
      markActive: {},
    })(Slider);

    const ValueLabelComponent = (props) => {
      const { children, open, value, index } = props;
      let placement = 'top-end';
      if (index == 1)
        placement = 'top-start'

      return (
        <Tooltip open={open} enterTouchDelay={0} placement={placement} title={value}>
          {children}
        </Tooltip>
      );
    }

    const valueLabelFormat = (labelValue, index) => {
      if (index == 0) {
        // return `R${value} (WH10 Cost Price)`
        return `${new Intl.NumberFormat(defaultRegion, defaultCurrencyOptions).format(labelValue/100)} (WH10 Cost Price)`
      }
      if (index == 1) {
        return `${new Intl.NumberFormat(defaultRegion, defaultCurrencyOptions).format(labelValue/100)} (3 Month ave. Selling Price)`
      }
    }

    return (
      <Fragment>
        <Grid container spacing={0}>
          <Grid item xs={12}>
            <CustomSlider
              valueLabelFormat={valueLabelFormat}
              defaultValue={defaultValues}
              valueLabelDisplay="on"
              ValueLabelComponent={ValueLabelComponent}
              disabled
            />
          </Grid>
          <Grid item xs={6} justify="flex-start">
            <p className="label2">{new Intl.NumberFormat(defaultRegion, defaultCurrencyOptions).format(_landedCost/100)} (Landed Cost)</p>
          </Grid>
          <Grid item xs={6} justify="flex-end">
            <p className="label2">{new Intl.NumberFormat(defaultRegion, defaultCurrencyOptions).format(_listPrice/100)} (List Price)</p>
          </Grid>
        </Grid>

      </Fragment>
    );
  }
}

PricingSliderWidget.propTypes = {
  classes: PropTypes.object,
};

export const PricingSliderComponent = withStyles(PricingSliderWidget.styles)(PricingSliderWidget);
export default PricingSliderComponent
