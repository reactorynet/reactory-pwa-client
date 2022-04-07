import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withStyles, withTheme } from '@mui/styles';
import { withApi } from '../../../api/ApiProvider';

class CurrencyLabel extends Component {
  render() {
    const { value, currency, symbol, api, region, classes, uiSchema, formData } = this.props;

    let isCents = true;
    let _value = value;

    const { MaterialCore } = api.getComponents(['material-ui.MaterialCore']);


    let variant = this.props.variant || 'body1';

    if (uiSchema) {
      let options = uiSchema['ui:options'];

      if (options) {
        isCents = options.isCents === true ? false : isCents;
        _value = options.valueProp === true ? this.props[options.valueProps] : formData;
        variant = options.variant || variant;
      }
    }

    return (
      <React.Fragment>
        <MaterialCore.Typography variant={variant}>
          {
            _value != '' ? new Intl.NumberFormat(region, { style: 'currency', currency }).format(isCents ? (_value / 100) : _value) : ''
          }
        </MaterialCore.Typography>
      </React.Fragment>
    );
  }
}

CurrencyLabel.propTypes = {
  value: PropTypes.number,
  currency: PropTypes.string,
  symbol: PropTypes.string,
  region: PropTypes.string
};

CurrencyLabel.defaultProps = {
  value: 0,
  currency: 'ZAR',
  symbol: 'R',
  region: 'en-ZA'
};

CurrencyLabel.styles = (theme) => {
  return {
    currency: {
      margin: theme.spacing(1)
    },
    currencyValue: {

    },
  }
};

const CurrencyLabelComponent = compose(
  withApi,
  withTheme,
  withStyles(CurrencyLabel.styles))(CurrencyLabel);

export default {
  nameSpace: 'core',
  name: 'CurrencyLabel',
  version: '1.0.0',
  component: CurrencyLabelComponent,
  tags: ['currency', 'label'],
  description: 'Basic Currency Label',
};

