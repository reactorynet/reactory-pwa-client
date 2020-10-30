import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { Tooltip, Slider, Grid, Typography } from '@material-ui/core';
import { withApi } from '@reactory/client-core/api/ApiProvider';

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
    const { classes, uiSchema, landedPrice, threeMonthAvePrice, wh10CostPrice, listPrice, theme, auth_price = 10, max_percentage_increase = 100, disabled = false } = this.props;
    let defaultRegion = 'af';
    let defaultCurrencyOptions = { style: 'currency', currency: 'ZAR', currencyDisplay: 'symbol' };
    let _landedCost = landedPrice;
    let _wh10Cost = wh10CostPrice;
    let _threeMonthAveSellingPrice = threeMonthAvePrice;
    let _listPrice = listPrice;



    let defaultValues = [];
    defaultValues.push(_listPrice);

    let options = { min: 1, max: (_listPrice || threeMonthAvePrice) * 3, step: 1, }
    if (uiSchema && uiSchema['ui:options']) options = { ...options, ...uiSchema['ui:options'] }

    const CustomThumbComponent = (props) => {
      return (
        <span {...props}>
          <span className="bar" />
        </span>
      );
    }

    const { palette } = theme;

    const box_shadow = '0 3px 1px rgba(0,0,0,0.1),0 4px 8px rgba(0,0,0,0.13),0 0 0 1px rgba(0,0,0,0.02)';

    const CustomSlider = withStyles({
      root: {
        height: '10px',
        padding: '15px 0',
        width: '95%',
        margin: '16px'
      },
      thumb: {
        height: '28px',
        width: '28px',
        backgroundColor: '#fff',
        marginTop: -9,
        marginLeft: -14,
        boxShadow: box_shadow,
        '&:focus, &:hover, &$active': {
          boxShadow: '0 0 8px 5px rgba(0,0,0,0.1),0 4px 8px rgba(0,0,0,0.13),0 0 0 1px rgba(0,0,0,0.02)',
          // Reset on touch devices, it doesn't add specificity
          '@media (hover: none)': {
            boxShadow: box_shadow,
          },
        },
        '& .bar': {
          // display: inline-block !important;
          height: '10px',
          width: '10px',
          border: `1px solid #4A8FC7`,
          borderRadius: 5,
          backgroundColor: '#4A8FC7',
          marginLeft: 1,
          marginRight: 1,
        },
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
        height: '16px',
        marginTop: '-2px',
        background: 'linear-gradient(0deg, #4A8FC7 90%, rgba(190,190,190,1) 96%)'
      },
      rail: {
        height: '10px',
        border: 'solid 1px',
        borderRadius: '5px',
        width: '100%',
        background: 'linear-gradient(0deg, rgba(247,247,247,1) 90%, rgba(190,190,190,1) 96%)'
      },
      mark: {
        backgroundColor: '#bfbfbf',
        height: '24px',
        width: 1,
        marginTop: '-6px',
      },
      markActive: {
        opacity: 1,
        backgroundColor: 'currentColor',
      },
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
        return `${new Intl.NumberFormat(defaultRegion, defaultCurrencyOptions).format(labelValue / 100)}`
      }
    }

    let marks = [
      { value: 0 },
      { value: auth_price, label: 'Auth' },
      { value: _landedCost, label: 'Landed' },
      { value: _threeMonthAveSellingPrice, label: 'Avg' },
      { value: options.max },
    ];

    return (

      <Grid container spacing={0}>
        <Grid item xs={12}>
          <CustomSlider
            ThumbComponent={CustomThumbComponent}
            valueLabelFormat={valueLabelFormat}
            defaultValue={listPrice}
            valueLabelDisplay="on"
            ValueLabelComponent={ValueLabelComponent}
            marks={marks}
            {...options}
          />
        </Grid>
      </Grid>
    );
  }
}

PricingSliderWidget.propTypes = {
  classes: PropTypes.object,
};

export const PricingSliderComponent = compose(withApi, withTheme, withStyles(PricingSliderWidget.styles))(PricingSliderWidget);
export default PricingSliderComponent
