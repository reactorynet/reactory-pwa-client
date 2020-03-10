import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isArray } from 'lodash';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { Tooltip } from '@material-ui/core';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class StyledCurrencyLabel extends Component {

  render() {
    const { value, condition, currency, region, classes, uiSchema, currencies, displayAdditionalCurrencies } = this.props;

    let isCents = true;
    let _value = value;
    let _prependText = '';
    let _postpendText = '';
    let _containerProps = {};
    let _tooltip = '';
    
    

    if (uiSchema) {
      const uiOptions = uiSchema['ui:options'];

      isCents = uiOptions && uiOptions.isCents === false ? false : isCents;
      _value = uiOptions && (uiOptions.valueProp || this.props.formData) ? this.props[uiOptions.valueProp || 'formData'] : value;

      if (uiOptions.prependText && uiOptions.prependText != '')
        _prependText = uiOptions.prependText;

      if (uiOptions.postpendText && uiOptions.postpendText != '')
        _postpendText = uiOptions.postpendText;

      if (uiOptions.conditionalStyles && condition) {
        const matchingCondition = uiOptions.conditionalStyles.find(option => option.key === condition);
        if (matchingCondition) {
          _containerProps.style = matchingCondition.style;
          if (matchingCondition.tooltip)
            _tooltip = matchingCondition.tooltip;
        }
      }
    }

    let otherCurrencies = [];
    
    if(currencies && isArray(currencies) && displayAdditionalCurrencies === true) {      
      otherCurrencies = currencies.map((currency) => {
        return (
        <div className={classes.currency} {..._containerProps}>
            <span>({currency.currency_code})&nbsp;</span>
            <span className={classes.currencyValue}>
              {new Intl.NumberFormat(region, { style: 'currency', currency: currency.currency_code }).format(isCents ? (currency.list_price_cents / 100) : currency.list_price_cents)}
            </span>            
        </div>)
      });
    }

    return (
      <Tooltip title={_tooltip} placement="right-start">
        <div className={classes.currency} {..._containerProps}>
          {_prependText != '' && <span>{_prependText}</span>}
          <span className={classes.currencyValue}>
            {new Intl.NumberFormat(region, { style: 'currency', currency }).format(isCents ? (_value / 100) : _value)}
          </span>
          {_postpendText != '' && <span>{_postpendText}</span>}
          {otherCurrencies}
        </div>
        
      </Tooltip>
    );
  }
}

StyledCurrencyLabel.propTypes = {
  value: PropTypes.number,
  currency: PropTypes.string,
  symbol: PropTypes.string,
  region: PropTypes.string
};

StyledCurrencyLabel.defaultProps = {
  value: 0,
  currency: 'ZAR',
  symbol: 'R',
  region: 'en-ZA'
};



StyledCurrencyLabel.styles = (theme) => {
  return {
    currency: {
      margin: theme.spacing(1),
      whiteSpace: 'nowrap'
    },
    currencyValue: {},
  }
};


const StyledCurrencyLabelComponent = compose(
  withApi,
  withTheme,
  withStyles(StyledCurrencyLabel.styles))(StyledCurrencyLabel);

export default StyledCurrencyLabelComponent;

