import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

// REQUIREMENTS:
// Prepend/Postpend text
// Color

class StyledCurrencyLabel extends Component {

  render() {
    const { value, condition, currency, region, classes, uiSchema } = this.props;

    let isCents = true;
    let _value = value;
    let _prependText = '';

    debugger;

    if (uiSchema) {
      const uiOptions = uiSchema['ui:options'];

      isCents = uiOptions && uiOptions.isCents === false ? false : isCents;
      _value = uiOptions && (uiOptions.valueProp || this.props.formData) ? this.props[uiOptions.valueProp || 'formData'] : value;

      if (uiOptions.prependText && uiOptions.prependText != '')
        _prependText = uiOptions.prependText;

    }

    return (
      <div className={classes.currency}>
        {_prependText != '' && <span>{_prependText}</span>}
        <span className={classes.currencyValue}>
          {new Intl.NumberFormat(region, { style: 'currency', currency }).format(isCents ? (_value / 100) : _value)}
        </span>
      </div>
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

